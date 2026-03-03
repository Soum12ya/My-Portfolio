# Portfolio Website - Complete Setup & Deployment Guide

A modern portfolio website with React frontend, FastAPI backend, and MongoDB database.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Local Development Setup](#3-local-development-setup)
4. [Environment Configuration](#4-environment-configuration)
5. [Docker Setup](#5-docker-setup)
6. [GitHub Repository Setup](#6-github-repository-setup)
7. [CI/CD with GitHub Actions](#7-cicd-with-github-actions)
8. [Deploy to Render (Free)](#8-deploy-to-render-free)
9. [Post-Deployment Setup](#9-post-deployment-setup)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Before starting, install the following on your local machine:

### Required Software
| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18+ | https://nodejs.org/ |
| Python | 3.9+ | https://python.org/ |
| MongoDB | 6.0+ | https://mongodb.com/try/download/community |
| Git | Latest | https://git-scm.com/ |
| Docker | Latest | https://docker.com/get-started |
| Docker Compose | Latest | Included with Docker Desktop |

### Verify Installation
Open terminal/command prompt and run:
```bash
node --version      # Should show v18.x.x or higher
npm --version       # Should show 9.x.x or higher
python --version    # Should show 3.9.x or higher
pip --version       # Should show pip 21.x or higher
mongod --version    # Should show 6.x or higher
git --version       # Should show git version 2.x
docker --version    # Should show Docker version 24.x or higher
```

---

## 2. Project Structure

```
portfolio-website/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Backend environment variables
│   └── Dockerfile         # Backend Docker config
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styles
│   │   └── index.js       # Entry point
│   ├── public/
│   ├── package.json       # Node dependencies
│   ├── .env              # Frontend environment variables
│   └── Dockerfile        # Frontend Docker config
├── docker-compose.yml     # Docker orchestration
├── .github/
│   └── workflows/
│       └── deploy.yml    # CI/CD pipeline
└── README.md
```

---

## 3. Local Development Setup

### Step 3.1: Clone/Create Project

```bash
# Create project folder
mkdir portfolio-website
cd portfolio-website

# Create folder structure
mkdir -p backend frontend/.env
```

### Step 3.2: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi>=0.109.0
uvicorn>=0.27.0
motor>=3.3.0
pydantic>=2.5.0
python-dotenv>=1.0.0
resend>=2.0.0
python-multipart>=0.0.6
EOF

# Install dependencies
pip install -r requirements.txt
```

### Step 3.3: Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Create React app (if starting fresh)
npx create-react-app . --template cra-template

# OR if you have the code, just install dependencies
npm install

# Install additional packages
npm install framer-motion axios
```

### Step 3.4: Start MongoDB

```bash
# On Windows (if installed as service, it auto-starts)
# Or start manually:
mongod --dbpath /path/to/data/db

# On macOS (with Homebrew):
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod
```

### Step 3.5: Run the Application Locally

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api/
- Admin Panel: http://localhost:3000?admin=true

---

## 4. Environment Configuration

### Step 4.1: Backend Environment (.env)

Create `backend/.env`:
```env
# MongoDB Connection
MONGO_URL=mongodb://localhost:27017
DB_NAME=portfolio_db

# CORS Settings
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=onboarding@resend.dev
```

### Step 4.2: Frontend Environment (.env)

Create `frontend/.env`:
```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Step 4.3: Get Resend API Key (for Contact Form)

1. Go to https://resend.com
2. Sign up for free account
3. Go to API Keys section
4. Create new API key
5. Copy and paste in `backend/.env`

---

## 5. Docker Setup

### Step 5.1: Backend Dockerfile

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Step 5.2: Frontend Dockerfile

Create `frontend/Dockerfile`:
```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Step 5.3: Nginx Config for Frontend

Create `frontend/nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 5.4: Docker Compose

Create `docker-compose.yml` in project root:
```yaml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:6.0
    container_name: portfolio-mongodb
    restart: unless-stopped
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - portfolio-network

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: portfolio-backend
    restart: unless-stopped
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=portfolio_db
      - CORS_ORIGINS=http://localhost,http://localhost:3000,http://frontend
      - RESEND_API_KEY=${RESEND_API_KEY}
      - SENDER_EMAIL=${SENDER_EMAIL}
    ports:
      - "8001:8001"
    depends_on:
      - mongodb
    networks:
      - portfolio-network

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_BACKEND_URL=http://localhost:8001
    container_name: portfolio-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - portfolio-network

volumes:
  mongodb_data:

networks:
  portfolio-network:
    driver: bridge
```

### Step 5.5: Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v
```

**Access:**
- Frontend: http://localhost
- Backend API: http://localhost:8001/api/
- Admin: http://localhost?admin=true

---

## 6. GitHub Repository Setup

### Step 6.1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `portfolio-website`
3. Set to **Public** or **Private**
4. Don't initialize with README (we'll push existing code)
5. Click **Create repository**

### Step 6.2: Initialize Git and Push

```bash
# In project root
cd portfolio-website

# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
venv/
__pycache__/
*.pyc

# Environment files
.env
.env.local
.env.production

# Build outputs
build/
dist/

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
EOF

# Add all files
git add .

# Commit
git commit -m "Initial commit: Portfolio website"

# Add remote (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/portfolio-website.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 7. CI/CD with GitHub Actions

### Step 7.1: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Render

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE: ghcr.io/${{ github.repository }}/backend
  FRONTEND_IMAGE: ghcr.io/${{ github.repository }}/frontend

jobs:
  # Test job
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build frontend
        run: |
          cd frontend
          npm run build
        env:
          REACT_APP_BACKEND_URL: ${{ secrets.BACKEND_URL }}

  # Build and push Docker images
  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ env.BACKEND_IMAGE }}:latest
      
      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ env.FRONTEND_IMAGE }}:latest
          build-args: |
            REACT_APP_BACKEND_URL=${{ secrets.BACKEND_URL }}

  # Deploy to Render (trigger webhook)
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### Step 7.2: Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:
| Secret Name | Value |
|-------------|-------|
| `BACKEND_URL` | Your Render backend URL (after deployment) |
| `RENDER_DEPLOY_HOOK` | Render deploy hook URL (after setup) |

---

## 8. Deploy to Render (Free)

### Step 8.1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (recommended for easy integration)
3. Verify your email

### Step 8.2: Create MongoDB Database

**Option A: Use MongoDB Atlas (Free)**
1. Go to https://www.mongodb.com/atlas
2. Create free account
3. Create free cluster (M0 Sandbox)
4. Create database user with password
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.xxxxx.mongodb.net/portfolio_db
   ```
6. Whitelist IP: 0.0.0.0/0 (allow all - for Render)

### Step 8.3: Deploy Backend on Render

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `portfolio-backend`
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free

4. Add Environment Variables (click "Advanced"):
   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | Your MongoDB Atlas connection string |
   | `DB_NAME` | `portfolio_db` |
   | `CORS_ORIGINS` | `https://your-frontend.onrender.com` |
   | `RESEND_API_KEY` | Your Resend API key |
   | `SENDER_EMAIL` | `onboarding@resend.dev` |

5. Click **Create Web Service**
6. Wait for deployment (2-5 minutes)
7. Copy your backend URL: `https://portfolio-backend-xxxx.onrender.com`

### Step 8.4: Deploy Frontend on Render

1. Go to Render Dashboard → **New** → **Static Site**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `portfolio-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`

4. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `REACT_APP_BACKEND_URL` | `https://portfolio-backend-xxxx.onrender.com` |

5. Click **Create Static Site**
6. Wait for deployment (3-5 minutes)

### Step 8.5: Update CORS Settings

After both are deployed, go back to your backend service on Render:
1. Click on your backend service
2. Go to Environment tab
3. Update `CORS_ORIGINS` to include your frontend URL:
   ```
   https://portfolio-frontend-xxxx.onrender.com
   ```
4. Click Save Changes (will auto-redeploy)

### Step 8.6: Get Deploy Hook for CI/CD

1. In Render, go to your backend service
2. Click **Settings** tab
3. Scroll to **Deploy Hook**
4. Copy the URL
5. Add to GitHub Secrets as `RENDER_DEPLOY_HOOK`

---

## 9. Post-Deployment Setup

### Step 9.1: Access Your Live Site

- **Frontend:** `https://portfolio-frontend-xxxx.onrender.com`
- **Backend API:** `https://portfolio-backend-xxxx.onrender.com/api/`
- **Admin Panel:** `https://portfolio-frontend-xxxx.onrender.com?admin=true`

### Step 9.2: Configure Your Portfolio

1. Open `https://your-frontend-url.onrender.com?admin=true`
2. Press Ctrl+Shift+A (if button not visible)
3. Enter password: `admin_2025`
4. Fill in:
   - **Profile:** Your name, title, bio, social links
   - **Skills:** Add your technical skills
   - **Projects:** Add your projects with details
   - **Blog:** Add blog posts (optional)
   - **Research:** Add publications (optional)
5. Upload your photo
6. Click **Save All**

### Step 9.3: Test Contact Form

1. Go to Contact page
2. Fill form and submit
3. Check if you receive email (if Resend configured)

### Step 9.4: Custom Domain (Optional)

**On Render:**
1. Go to your frontend service → Settings
2. Scroll to Custom Domains
3. Add your domain: `yourdomain.com`
4. Configure DNS at your registrar:
   - Add CNAME record pointing to `portfolio-frontend-xxxx.onrender.com`
5. Wait for SSL certificate (automatic)

---

## 10. Troubleshooting

### Common Issues

**Backend won't start on Render:**
```
Check logs in Render dashboard
Verify MONGO_URL is correct
Ensure all environment variables are set
```

**CORS errors:**
```
Update CORS_ORIGINS in backend to include frontend URL
Make sure URLs don't have trailing slashes
```

**MongoDB connection failed:**
```
Check MongoDB Atlas IP whitelist (0.0.0.0/0)
Verify connection string format
Check username/password
```

**Frontend shows blank:**
```
Check browser console for errors
Verify REACT_APP_BACKEND_URL is set
Check if backend is running
```

**Contact form not sending emails:**
```
Verify RESEND_API_KEY is correct
Check Resend dashboard for errors
Verify sender email domain
```

### Useful Commands

```bash
# Check Docker logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild specific service
docker-compose up --build backend

# SSH into container
docker exec -it portfolio-backend /bin/bash

# Check Render logs
# Go to Render Dashboard → Your Service → Logs
```

---

## Quick Reference

| Item | Local | Production |
|------|-------|------------|
| Frontend | http://localhost:3000 | https://your-frontend.onrender.com |
| Backend | http://localhost:8001 | https://your-backend.onrender.com |
| Admin | http://localhost:3000?admin=true | https://your-frontend.onrender.com?admin=true |
| Password | admin_2025 | admin_2025 (change it!) |

---

## Security Checklist

Before going live:
- [ ] Change admin password in `App.js`
- [ ] Set strong MongoDB password
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS (automatic on Render)
- [ ] Don't commit `.env` files to Git

---

## Need Help?

- **Render Docs:** https://render.com/docs
- **MongoDB Atlas:** https://docs.atlas.mongodb.com
- **Resend Docs:** https://resend.com/docs
- **React Docs:** https://react.dev
- **FastAPI Docs:** https://fastapi.tiangolo.com

---

*Documentation created for Portfolio Website v1.0*
