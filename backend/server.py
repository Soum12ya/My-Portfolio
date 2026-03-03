from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = "Contact from Portfolio"
    message: str
    recipient_email: Optional[EmailStr] = None

class ContactFormResponse(BaseModel):
    status: str
    message: str
    contact_id: str

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    subject: str
    message: str
    recipient_email: str
    email_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/contact", response_model=ContactFormResponse)
async def submit_contact_form(request: ContactFormRequest):
    """
    Handle contact form submissions.
    Stores the message in MongoDB and sends an email notification.
    """
    try:
        # Create contact message object
        contact = ContactMessage(
            name=request.name,
            email=request.email,
            subject=request.subject or "Contact from Portfolio",
            message=request.message,
            recipient_email=request.recipient_email or "portfolio@example.com"
        )
        
        # Store in MongoDB
        doc = contact.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.contact_messages.insert_one(doc)
        logger.info(f"Contact message stored with ID: {contact.id}")
        
        # Send email notification if Resend is configured
        email_sent = False
        if RESEND_API_KEY and request.recipient_email:
            try:
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #38bdf8, #818cf8); padding: 20px; border-radius: 10px; color: white;">
                        <h1 style="margin: 0;">New Contact Form Submission</h1>
                    </div>
                    <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                        <p style="margin: 10px 0;"><strong>From:</strong> {request.name}</p>
                        <p style="margin: 10px 0;"><strong>Email:</strong> {request.email}</p>
                        <p style="margin: 10px 0;"><strong>Subject:</strong> {request.subject}</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="margin: 10px 0;"><strong>Message:</strong></p>
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            {request.message.replace(chr(10), '<br>')}
                        </div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="color: #64748b; font-size: 12px;">
                            Reply directly to this email to respond to {request.name} at {request.email}
                        </p>
                    </div>
                </body>
                </html>
                """
                
                params = {
                    "from": SENDER_EMAIL,
                    "to": [request.recipient_email],
                    "subject": f"Portfolio Contact: {request.subject}",
                    "html": html_content,
                    "reply_to": request.email
                }
                
                # Run sync SDK in thread to keep FastAPI non-blocking
                response = await asyncio.to_thread(resend.Emails.send, params)
                print("RESEND RESPONSE:", response)
                email_sent = True
                logger.info(f"Email notification sent to {request.recipient_email}")
                
                # Update MongoDB record
                await db.contact_messages.update_one(
                    {"id": contact.id},
                    {"$set": {"email_sent": True}}
                )
                
            except Exception as email_error:
                logger.error(f"Failed to send email: {str(email_error)}")
                # Don't fail the request if email fails
        
        return ContactFormResponse(
            status="success",
            message="Message received! " + ("Email notification sent." if email_sent else "Will be reviewed soon."),
            contact_id=contact.id
        )
        
    except Exception as e:
        logger.error(f"Contact form error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process contact form: {str(e)}")

@api_router.get("/contact/messages", response_model=List[ContactMessage])
async def get_contact_messages():
    """
    Get all contact messages (for admin purposes).
    """
    messages = await db.contact_messages.find({}, {"_id": 0}).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return messages

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
