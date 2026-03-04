/**
 * Portfolio Website - AI Engineer
 * Multi-page | Admin CMS | Persistent Storage | Glassmorphism | Framer Motion
 * Fixed: Modal positioning, Contact form integration, Theme toggle, Resume download
*/

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// PERSISTENT STORAGE HELPERS (localStorage)
const store = {
  async get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch { return false; }
  },
};

// DEFAULTS - Only personal info, rest empty for customization
const DEFAULT_PROFILE = {
  name: "Your Name",
  title: "Your Title | Your Specialty",
  tagline: "Add your tagline here via Admin Panel",
  bio: "Add your professional bio via Admin Panel. Tell visitors about your journey, expertise, and what drives you.",
  email: "your.email@example.com",
  github: "https://github.com/yourusername",
  linkedin: "https://linkedin.com/in/yourusername",
  twitter: "https://twitter.com/yourusername",
  photo: "",
  resume: "", // base64 or URL for resume download
};

const DEFAULT_SKILLS = [];
const DEFAULT_PROJECTS = [];
const DEFAULT_BLOGS = [];
const DEFAULT_RESEARCH = [];

// DESIGN TOKENS - Supporting both dark and light themes
const getTokens = (isDark) => ({
  bg: isDark ? "#020509" : "#f8fafc",
  nav: isDark ? "rgba(3,7,14,0.92)" : "rgba(248,250,252,0.95)",
  card: isDark ? "rgba(8,16,30,0.72)" : "rgba(255,255,255,0.85)",
  border: isDark ? "rgba(56,189,248,0.1)" : "rgba(15,23,42,0.1)",
  borderH: isDark ? "rgba(56,189,248,0.35)" : "rgba(56,189,248,0.5)",
  acc: "#38bdf8",
  acc2: "#818cf8",
  acc3: "#34d399",
  text: isDark ? "#e2e8f0" : "#0f172a",
  muted: isDark ? "#8ba3bc" : "#64748b",
  dim: isDark ? "#4b6282" : "#94a3b8",
  modalBg: isDark ? "rgba(6,12,22,0.98)" : "rgba(255,255,255,0.98)",
});

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } },
};

// TINY HELPERS
const Tag = ({ label, color = "#38bdf8" }) => (
  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
    padding: "3px 10px", borderRadius: 99, background: `${color}18`, color, border: `1px solid ${color}35` }}>
    {label}
  </span>
);

const Btn = ({ children, onClick, variant = "primary", style: sx = {}, disabled = false, "data-testid": testId }) => (
  <motion.button 
    whileHover={disabled ? {} : { scale: 1.03 }} 
    whileTap={disabled ? {} : { scale: 0.97 }}
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    style={{
      border: "none", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700,
      fontSize: 13, padding: "11px 24px", letterSpacing: "0.03em",
      opacity: disabled ? 0.6 : 1,
      ...(variant === "primary"
        ? { background: "linear-gradient(135deg, #38bdf8, #818cf8)", color: "#000" }
        : { background: "rgba(56,189,248,0.08)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.4)" }),
      ...sx,
    }}>{children}</motion.button>
);

const GCard = ({ children, style: sx = {}, onClick, glow, T }) => {
  const [h, setH] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setH(true)} onHoverEnd={() => setH(false)}
      onClick={onClick}
      style={{
        background: T.card, backdropFilter: "blur(14px)",
        border: `1px solid ${h ? T.borderH : T.border}`,
        borderRadius: 16,
        boxShadow: h && glow ? `0 0 28px ${glow}22` : "0 2px 16px rgba(0,0,0,0.2)",
        transition: "border-color 0.3s, box-shadow 0.3s",
        cursor: onClick ? "pointer" : "default",
        ...sx,
      }}
    >{children}</motion.div>
  );
};

// INPUT COMPONENTS (for Admin)
const Input = ({ label, value, onChange, placeholder, multiline, rows = 3, T }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", color: T?.muted || "#8ba3bc", fontSize: 11, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</label>}
    {multiline
      ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: "9px 12px", background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(56,189,248,0.1)", borderRadius: 8, color: T?.text || "#e2e8f0", fontSize: 13,
            fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
      : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: "9px 12px", background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(56,189,248,0.1)", borderRadius: 8, color: T?.text || "#e2e8f0", fontSize: 13,
            outline: "none", boxSizing: "border-box" }} />}
  </div>
);

// FIXED MODAL - Proper centering using inset and margins
const Modal = ({ open, onClose, title, children, wide, T }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="modal-backdrop"
          style={{ 
            position: "fixed", 
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)", 
            zIndex: 9998,
          }} />
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            data-testid="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: wide ? "min(760px, 90vw)" : "min(520px, 90vw)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: T.modalBg, 
              backdropFilter: "blur(20px)",
              border: `1px solid ${T.border}`, 
              borderRadius: 20,
              padding: "28px 32px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: T.text, fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{title}</h3>
              <button 
                onClick={onClose}
                data-testid="modal-close-btn"
                style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${T.border}`,
                  borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 14px", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div>
              {children}
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

// PARTICLE BG
const Particles = ({ isDark }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let W = c.width = window.innerWidth, H = c.height = window.innerHeight;
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.2 + .3,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "rgba(56,189,248,0.35)" : "rgba(56,189,248,0.5)"; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 110) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = isDark ? `rgba(56,189,248,${0.05 * (1 - d / 110)})` : `rgba(56,189,248,${0.08 * (1 - d / 110)})`; ctx.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onR = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
    window.addEventListener("resize", onR);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
  }, [isDark]);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5 }} />;
};

// TYPING HOOK
const useTyping = (words) => {
  const [d, setD] = useState(""); 
  const [wi, setWi] = useState(0); 
  const [ci, setCi] = useState(0); 
  const [del, setDel] = useState(false);
  
  useEffect(() => {
    if (!words || words.length === 0) return;
    const w = words[wi];
    const t = setTimeout(() => {
      if (!del) { 
        setD(w.slice(0, ci + 1)); 
        if (ci + 1 === w.length) setTimeout(() => setDel(true), 1800); 
        else setCi(c => c + 1); 
      }
      else { 
        setD(w.slice(0, ci - 1)); 
        if (ci - 1 === 0) { setDel(false); setWi(i => (i + 1) % words.length); setCi(0); } 
        else setCi(c => c - 1); 
      }
    }, del ? 40 : 80);
    return () => clearTimeout(t);
  }, [ci, del, wi, words]);
  return d;
};

// SECTION TITLE
const SecTitle = ({ children, sub, T }) => (
  <div style={{ textAlign: "center", marginBottom: 56 }}>
    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: .6 }}
      style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px,4vw,42px)",
        color: T.text, marginBottom: 10 }}>
      {children}
    </motion.h2>
    {sub && <p style={{ color: T.muted, fontSize: 15, marginBottom: 14 }}>{sub}</p>}
    <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
      viewport={{ once: true }} transition={{ delay: .2, duration: .5 }}
      style={{ width: 56, height: 2, margin: "0 auto",
        background: "linear-gradient(90deg, #38bdf8, #818cf8)" }} />
  </div>
);

// NAV
const PAGES = ["Home","About","Skills","Projects","Research","Blog","Contact"];

const Nav = ({ page, setPage, isDark, toggleTheme, T }) => {
  const [sc, setSc] = useState(false);
  const [mob, setMob] = useState(false);
  useEffect(() => { const f = () => setSc(window.scrollY > 40); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f); }, []);

  const go = (p) => { setPage(p); setMob(false); };

  return (
    <motion.nav 
      initial={{ y: -60 }} 
      animate={{ y: 0 }} 
      transition={{ duration: .6 }}
      data-testid="main-nav"
      style={{ 
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        background: sc ? T.nav : "transparent", 
        backdropFilter: sc ? "blur(18px)" : "none",
        borderBottom: sc ? `1px solid ${T.border}` : "none", 
        transition: "all .3s",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(16px,5vw,72px)" 
      }}>
      <button 
        onClick={() => go("Home")}
        data-testid="nav-logo"
        style={{ background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.acc }}>
        SB<span style={{ color: T.dim }}>.</span>
      </button>

      {/* Desktop */}
      <div className="desk-nav" style={{ display: "flex", gap: 2, alignItems: "center" }}>
        {PAGES.map(p => (
          <button 
            key={p} 
            onClick={() => go(p)}
            data-testid={`nav-${p.toLowerCase()}`}
            style={{ 
              background: page === p ? `${T.acc}12` : "none",
              border: page === p ? `1px solid ${T.acc}30` : "1px solid transparent",
              borderRadius: 8, cursor: "pointer", color: page === p ? T.acc : T.muted,
              fontSize: 13, fontWeight: 500, padding: "5px 14px",
              transition: "all .2s", letterSpacing: ".05em" 
            }}>
            {p}
          </button>
        ))}
        
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.1 }}
          data-testid="theme-toggle"
          style={{
            background: "none", border: `1px solid ${T.border}`,
            borderRadius: 8, cursor: "pointer", padding: "6px 10px",
            marginLeft: 8, color: T.text, display: "flex", alignItems: "center"
          }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </motion.button>
        
        <Btn onClick={() => go("Contact")} style={{ marginLeft: 8, padding: "6px 18px" }} data-testid="nav-hire-btn">Hire Me</Btn>
      </div>

      {/* Mobile */}
      <div style={{ display: "none" }} className="mob-controls">
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.1 }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: T.text }}
        >
          {isDark ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </motion.button>
        <button 
          onClick={() => setMob(o => !o)} 
          className="mob-btn"
          data-testid="mobile-menu-btn"
          style={{ background: "none", border: "none", color: T.text, fontSize: 22, cursor: "pointer" }}>
          {mob ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          )}
        </button>
      </div>

      <AnimatePresence>
        {mob && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }}
            data-testid="mobile-menu"
            style={{ 
              position: "fixed", top: 64, left: 0, right: 0, 
              background: isDark ? "rgba(2,5,9,.97)" : "rgba(255,255,255,0.98)",
              borderBottom: `1px solid ${T.border}`, padding: 24, 
              display: "flex", flexDirection: "column", gap: 14, zIndex: 99 
            }}>
            {PAGES.map(p => (
              <button 
                key={p} 
                onClick={() => go(p)}
                data-testid={`mobile-nav-${p.toLowerCase()}`}
                style={{ 
                  background: "none", border: "none", color: T.text, fontSize: 17,
                  textAlign: "left", cursor: "pointer", padding: "4px 0" 
                }}>{p}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// PAGE: HOME
const HomePage = ({ profile, setPage, T, isDark }) => {
  const typed = useTyping(profile.title ? profile.title.split(" | ") : ["Developer", "Engineer"]);

  const handleDownloadResume = () => {
    if (profile.resume) {
      const link = document.createElement('a');
      link.href = profile.resume;
      link.download = `${profile.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <motion.div {...pageVariants} key="home">
      <section 
        data-testid="home-section"
        style={{ 
          position: "relative", minHeight: "100vh", display: "flex",
          alignItems: "center", justifyContent: "center", overflow: "hidden" 
        }}>
        <Particles isDark={isDark} />
        <div style={{ 
          position: "absolute", left: "-8%", top: "5%", width: 400, height: 400,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%)",
          pointerEvents: "none" 
        }} />

        <div 
          className="hero-container"
          style={{ 
            position: "relative", zIndex: 1, display: "flex",
            alignItems: "center", justifyContent: "space-between", gap: 60,
            padding: "0 clamp(24px,6vw,100px)", maxWidth: 1200, margin: "0 auto", width: "100%" 
          }}>
          {/* LEFT TEXT */}
          <div className="hero-text" style={{ flex: "1 1 450px", minWidth: 320 }}>
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, duration: .7 }}>
              <Tag label="Open to Opportunities" color={T.acc3} />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: .35, duration: .7 }}
              data-testid="hero-name"
              style={{ 
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(32px,5vw,62px)", lineHeight: 1.1,
                color: T.text, margin: "18px 0 12px" 
              }}>
              Hello, I am<br />
              <span style={{ 
                background: "linear-gradient(135deg, #38bdf8, #818cf8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" 
              }}>
                {profile.name}
              </span>
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: .6, duration: .6 }}
              data-testid="hero-typing"
              style={{ 
                fontFamily: "monospace", fontSize: "clamp(16px,2vw,22px)",
                color: T.muted, marginBottom: 16, height: "1.5em" 
              }}>
              <span style={{ color: T.acc }}>&gt; </span>
              <span style={{ color: T.text }}>{typed}</span>
              <span style={{ animation: "blink 1s step-end infinite", color: T.acc }}>|</span>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: .75, duration: .6 }}
              data-testid="hero-tagline"
              style={{ 
                color: T.muted, fontSize: "clamp(13px,1.4vw,16px)", lineHeight: 1.75,
                marginBottom: 32, maxWidth: 500 
              }}>
              {profile.tagline}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .9, duration: .5 }}
              style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Btn onClick={() => setPage("Projects")} data-testid="view-projects-btn">View Projects</Btn>
              <motion.a 
                href={`mailto:${profile.email}`}
                whileHover={{ scale: 1.03 }} 
                whileTap={{ scale: .97 }}
                data-testid="get-in-touch-btn"
                style={{ 
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "11px 24px", borderRadius: 10, border: `1px solid ${T.border}`,
                  background: "rgba(56,189,248,0.06)", color: T.text, fontSize: 13,
                  fontWeight: 600, textDecoration: "none" 
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Get in touch
              </motion.a>
              {profile.resume && (
                <motion.button
                  onClick={handleDownloadResume}
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: .97 }}
                  data-testid="download-resume-btn"
                  style={{ 
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "11px 24px", borderRadius: 10, border: `1px solid ${T.acc}40`,
                    background: `${T.acc}15`, color: T.acc, fontSize: 13,
                    fontWeight: 600, cursor: "pointer" 
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Resume
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* RIGHT PHOTO */}
          <motion.div 
            className="hero-photo"
            initial={{ opacity: 0, x: 30 }} 
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: .4, duration: .8 }}
            style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative" }}>
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute", inset: -14, borderRadius: "50%", pointerEvents: "none",
                  border: `2px dashed ${T.acc}40`,
                }} />
              <div style={{
                position: "absolute", inset: -5, borderRadius: "50%", pointerEvents: "none",
                border: `2px solid ${T.acc}60`,
              }} />
              <div 
                data-testid="hero-photo"
                style={{
                  width: "clamp(240px,28vw,310px)", height: "clamp(240px,28vw,310px)",
                  borderRadius: "50%", overflow: "hidden",
                  background: isDark ? "#0a1628" : "#e2e8f0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                {profile.photo
                  ? <img src={profile.photo} alt={profile.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ textAlign: "center", padding: 20 }}>
                      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <div style={{ color: T.muted, fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
                        Upload photo<br />in Admin Panel
                      </div>
                    </div>
                }
              </div>
              <div style={{
                position: "absolute", bottom: -20, left: "10%", right: "10%", height: 40,
                background: `radial-gradient(ellipse, ${T.acc}30 0%, transparent 70%)`,
                pointerEvents: "none", filter: "blur(8px)",
              }} />
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          animate={{ y: [0, 8, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ 
            position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
            width: 22, height: 36, border: `2px solid ${T.border}`, borderRadius: 11,
            display: "flex", justifyContent: "center", paddingTop: 5 
          }}>
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: 4, height: 7, borderRadius: 2, background: T.acc }} />
        </motion.div>
      </section>
    </motion.div>
  );
};

// PAGE: ABOUT
const AboutPage = ({ profile, T }) => (
  <motion.div {...pageVariants} key="about" style={{ paddingTop: 90, paddingBottom: 80 }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }} data-testid="about-section">
      <SecTitle sub="The engineer behind the systems" T={T}>About Me</SecTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 64, alignItems: "center" }}>
        <motion.div 
          initial={{ opacity: 0, x: -30 }} 
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} 
          transition={{ duration: .7 }}>
          <div style={{ 
            width: "100%", aspectRatio: "3/4", borderRadius: 20, overflow: "hidden",
            border: `1px solid ${T.border}`, background: `linear-gradient(135deg, ${T.acc}15, ${T.acc2}15)`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center" 
          }}>
            {profile.photo
              ? <img src={profile.photo} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ textAlign: "center" }}>
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>Add photo via Admin Panel</div>
                </div>
            }
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }} 
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} 
          transition={{ duration: .7, delay: .2 }}>
          <Tag label="The Engineer" color={T.acc} />
          <h2 style={{ 
            fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px,3vw,36px)",
            color: T.text, margin: "14px 0 20px", lineHeight: 1.2 
          }}>
            I think in systems.<br /><span style={{ color: T.acc }}>I build from first principles.</span>
          </h2>
          {profile.bio.split("\n").map((para, i) => (
            <p key={i} style={{ color: T.muted, lineHeight: 1.85, fontSize: 15, marginBottom: 16 }}>{para}</p>
          ))}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            {["Problem Solver","Systems Thinker","First-Principles","Researcher"].map(t => (
              <Tag key={t} label={t} color={T.acc2} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </motion.div>
);

// PAGE: SKILLS
const SkillsPage = ({ skills, T }) => (
  <motion.div {...pageVariants} key="skills" style={{ paddingTop: 90, paddingBottom: 80 }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }} data-testid="skills-section">
      <SecTitle sub="Technologies and concepts I work with daily" T={T}>Technical Arsenal</SecTitle>
      
      {skills.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="1" style={{ margin: "0 auto 20px" }}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <h3 style={{ color: T.muted, fontSize: 18, marginBottom: 8 }}>No skills added yet</h3>
          <p style={{ color: T.dim, fontSize: 14 }}>Add your skills via the Admin Panel</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {skills.map((cat, ci) => (
            <motion.div key={cat.id}
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} 
              transition={{ delay: ci * .08, duration: .5 }}>
              <GCard style={{ padding: 24, height: "100%" }} glow={cat.color} T={T}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ 
                    width: 8, height: 8, borderRadius: "50%", background: cat.color,
                    boxShadow: `0 0 8px ${cat.color}` 
                  }} />
                  <span style={{ 
                    color: cat.color, fontSize: 11, fontWeight: 800,
                    textTransform: "uppercase", letterSpacing: ".12em" 
                  }}>{cat.cat}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {cat.items.map(s => (
                    <motion.span 
                      key={s} 
                      whileHover={{ scale: 1.06, y: -1 }}
                      style={{ 
                        padding: "4px 10px", borderRadius: 6, background: `${cat.color}12`,
                        border: `1px solid ${cat.color}22`, color: T.text, fontSize: 12, fontWeight: 500 
                      }}>
                      {s}
                    </motion.span>
                  ))}
                </div>
              </GCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);

// PAGE: PROJECTS
const ProjectsPage = ({ projects, T }) => {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const tags = ["All", ...Array.from(new Set(projects.map(p => p.tag)))];
  const filtered = filter === "All" ? projects : projects.filter(p => p.tag === filter);

  return (
    <motion.div {...pageVariants} key="projects" style={{ paddingTop: 90, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }} data-testid="projects-section">
        <SecTitle sub="Built from first principles, designed to scale" T={T}>Projects</SecTitle>

        {projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="1" style={{ margin: "0 auto 20px" }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <h3 style={{ color: T.muted, fontSize: 18, marginBottom: 8 }}>No projects added yet</h3>
            <p style={{ color: T.dim, fontSize: 14 }}>Add your projects via the Admin Panel</p>
          </div>
        ) : (
          <>
            {/* Filter */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 44 }}>
              {tags.map(t => (
                <motion.button 
                  key={t} 
                  whileHover={{ scale: 1.04 }} 
                  whileTap={{ scale: .96 }}
                  onClick={() => setFilter(t)}
                  data-testid={`filter-${t.toLowerCase()}`}
                  style={{ 
                    padding: "7px 20px", borderRadius: 99, cursor: "pointer",
                    border: `1px solid ${filter === t ? T.acc : T.border}`,
                    background: filter === t ? `${T.acc}18` : "transparent",
                    color: filter === t ? T.acc : T.muted, fontSize: 13, fontWeight: 600,
                    transition: "all .2s" 
                  }}>{t}</motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={filter}
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} 
                transition={{ duration: .35 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 24 }}>
                {filtered.map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 30 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * .08, duration: .45 }}>
                    <GCard 
                      style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}
                      glow={p.color} 
                      onClick={() => setSelected(p)}
                      T={T}
                      data-testid={`project-card-${p.id}`}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 30 }}>{p.emoji}</span>
                        <Tag label={p.tag} color={p.color} />
                      </div>
                      <div>
                        <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.title}</h3>
                        <div style={{ height: 2, width: 36, background: `linear-gradient(90deg,${p.color},transparent)`, borderRadius: 1 }} />
                      </div>
                      <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, flex: 1 }}>{p.problem}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(p.stack || []).slice(0,4).map(s => (
                          <span key={s} style={{ 
                            fontSize: 11, padding: "2px 8px", borderRadius: 5,
                            background: "rgba(255,255,255,0.04)", color: T.muted, border: `1px solid ${T.border}` 
                          }}>{s}</span>
                        ))}
                      </div>
                      <span style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>View details</span>
                    </GCard>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* Project Detail Modal - FIXED */}
        <Modal 
          open={!!selected} 
          onClose={() => setSelected(null)}
          title={selected?.title || ""} 
          wide
          T={T}>
          {selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 36 }}>{selected.emoji}</span>
                <Tag label={selected.tag} color={selected.color} />
              </div>
              
              <div>
                <div style={{ 
                  color: selected.color, fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 
                }}>Problem</div>
                <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.75 }}>{selected.problem}</p>
              </div>
              
              <div>
                <div style={{ 
                  color: selected.color, fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 
                }}>Approach</div>
                <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.75 }}>{selected.approach}</p>
              </div>
              
              {selected.arch && (
                <div>
                  <div style={{ 
                    color: T.dim, fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 
                  }}>Architecture</div>
                  <code style={{ 
                    display: "block", background: "rgba(0,0,0,.4)", padding: "12px 16px",
                    borderRadius: 8, color: T.acc3, fontSize: 12, fontFamily: "monospace",
                    lineHeight: 1.7, borderLeft: `3px solid ${selected.color}40`,
                    whiteSpace: "pre-wrap", wordBreak: "break-word"
                  }}>
                    {selected.arch}
                  </code>
                </div>
              )}
              
              {selected.stack && selected.stack.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selected.stack.map(s => <Tag key={s} label={s} color={selected.color} />)}
                </div>
              )}
              
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {selected.github && (
                  <Btn onClick={() => window.open(selected.github, "_blank")} data-testid="project-github-btn">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </span>
                  </Btn>
                )}
                {selected.demo && (
                  <Btn variant="ghost" onClick={() => window.open(selected.demo, "_blank")} data-testid="project-demo-btn">
                    Live Demo
                  </Btn>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </motion.div>
  );
};

// PAGE: RESEARCH
const ResearchPage = ({ research, T }) => {
  const [selected, setSelected] = useState(null);
  
  return (
    <motion.div {...pageVariants} key="research" style={{ paddingTop: 90, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }} data-testid="research-section">
        <SecTitle sub="Preprints, technical reports, and research work" T={T}>Publications & Research</SecTitle>
        
        {research.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="1" style={{ margin: "0 auto 20px" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <h3 style={{ color: T.muted, fontSize: 18, marginBottom: 8 }}>No research added yet</h3>
            <p style={{ color: T.dim, fontSize: 14 }}>Add your publications via the Admin Panel</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {research.map((r, i) => (
              <motion.div key={r.id}
                initial={{ opacity: 0, x: -24 }} 
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} 
                transition={{ delay: i * .1, duration: .5 }}>
                <GCard style={{ padding: 28 }} onClick={() => setSelected(r)} T={T}>
                  <div style={{ 
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 
                  }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Tag label={r.type} color={T.acc2} />
                      <Tag label={r.year} color={T.acc3} />
                      {r.tags.map(t => <Tag key={t} label={t} color={T.acc} />)}
                    </div>
                    <span style={{ color: T.acc, fontSize: 12, fontWeight: 600 }}>Read abstract</span>
                  </div>
                  <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{r.title}</h3>
                  <p style={{ color: T.dim, fontSize: 12, marginBottom: 10 }}>{r.venue}</p>
                  <p style={{ 
                    color: T.muted, fontSize: 13, lineHeight: 1.7,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" 
                  }}>
                    {r.abstract}
                  </p>
                </GCard>
              </motion.div>
            ))}
          </div>
        )}

        <Modal 
          open={!!selected} 
          onClose={() => setSelected(null)}
          title={selected?.title || ""} 
          wide
          T={T}>
          {selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Tag label={selected.type} color={T.acc2} />
                <Tag label={selected.year} color={T.acc3} />
                {selected.tags.map(t => <Tag key={t} label={t} color={T.acc} />)}
              </div>
              <p style={{ color: T.dim, fontSize: 13 }}>{selected.venue}</p>
              <div>
                <div style={{ 
                  color: T.acc, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: ".1em", marginBottom: 8 
                }}>Abstract</div>
                <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.85 }}>{selected.abstract}</p>
              </div>
              {selected.link && selected.link !== "#" && (
                <Btn onClick={() => window.open(selected.link, "_blank")}>Read Full Paper</Btn>
              )}
            </div>
          )}
        </Modal>
      </div>
    </motion.div>
  );
};

// PAGE: BLOG
const BlogPage = ({ blogs, T }) => {
  const [selected, setSelected] = useState(null);
  
  return (
    <motion.div {...pageVariants} key="blog" style={{ paddingTop: 90, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }} data-testid="blog-section">
        <SecTitle sub="Technical writing on various topics" T={T}>Blog & Writing</SecTitle>
        
        {blogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="1" style={{ margin: "0 auto 20px" }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <h3 style={{ color: T.muted, fontSize: 18, marginBottom: 8 }}>No blog posts yet</h3>
            <p style={{ color: T.dim, fontSize: 14 }}>Add your blog posts via the Admin Panel</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 24 }}>
            {blogs.map((post, i) => (
              <motion.div key={post.id}
                initial={{ opacity: 0, y: 30 }} 
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} 
                transition={{ delay: i * .09, duration: .5 }}>
                <GCard 
                  style={{ padding: 26, display: "flex", flexDirection: "column", gap: 12 }}
                  glow={post.color} 
                  onClick={() => setSelected(post)}
                  T={T}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Tag label={post.tag} color={post.color} />
                    <span style={{ color: T.dim, fontSize: 11 }}>{post.date}</span>
                  </div>
                  <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{post.title}</h3>
                  <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.65, flex: 1 }}>{post.excerpt}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: T.dim, fontSize: 11 }}>{post.readTime}</span>
                    <span style={{ color: post.color, fontSize: 12, fontWeight: 600 }}>Read</span>
                  </div>
                </GCard>
              </motion.div>
            ))}
          </div>
        )}

        <Modal 
          open={!!selected} 
          onClose={() => setSelected(null)}
          title="" 
          wide
          T={T}>
          {selected && (
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                <Tag label={selected.tag} color={selected.color} />
                <span style={{ color: T.dim, fontSize: 12 }}>{selected.date} · {selected.readTime}</span>
              </div>
              <h2 style={{ 
                fontFamily: "'Playfair Display', serif", fontSize: "clamp(20px,3vw,30px)",
                color: T.text, marginBottom: 16, lineHeight: 1.25 
              }}>{selected.title}</h2>
              <div style={{ 
                height: 2, width: 50,
                background: `linear-gradient(90deg, ${selected.color}, transparent)`, marginBottom: 24 
              }} />
              {selected.body.split("\n").map((para, i) => (
                <p key={i} style={{ color: T.muted, fontSize: 15, lineHeight: 1.85, marginBottom: 18 }}>{para}</p>
              ))}
            </div>
          )}
        </Modal>
      </div>
    </motion.div>
  );
};

// PAGE: CONTACT - With real email sending
const ContactPage = ({ profile, T }) => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState({});
  const [apiError, setApiError] = useState("");
  
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));
  
  const submit = async () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.includes("@")) e.email = "Valid email needed";
    if (!form.message.trim()) e.message = "Required";
    if (Object.keys(e).length) { setErr(e); return; }
    
    setErr({}); 
    setApiError("");
    setSending(true);
    
    try {
      await axios.post(`${API}/contact`, {
        name: form.name,
        email: form.email,
        subject: form.subject || "Contact from Portfolio",
        message: form.message,
        recipient_email: profile.email
      });
      setSent(true);
    } catch (error) {
      console.error("Contact form error:", error);
      setApiError(error.response?.data?.detail || "Failed to send message. Please try again or email directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div {...pageVariants} key="contact" style={{ paddingTop: 90, paddingBottom: 80 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 clamp(20px,5vw,80px)" }} data-testid="contact-section">
        <SecTitle sub="Let's build something meaningful" T={T}>Get In Touch</SecTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 48, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "mail", label: "Email", val: profile.email, href: `mailto:${profile.email}` },
              { icon: "github", label: "GitHub", val: profile.github?.replace("https://", ""), href: profile.github },
              { icon: "linkedin", label: "LinkedIn", val: profile.linkedin?.replace("https://", ""), href: profile.linkedin }
            ].map((item) => (
              <motion.div 
                key={item.label} 
                initial={{ opacity: 0, x: -20 }} 
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}>
                <GCard style={{ padding: 18 }} T={T}>
                  <a 
                    href={item.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    data-testid={`contact-${item.label.toLowerCase()}`}
                    style={{ textDecoration: "none", display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ fontSize: 22 }}>
                      {item.icon === "mail" && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      )}
                      {item.icon === "github" && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill={T.acc}>
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      )}
                      {item.icon === "linkedin" && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill={T.acc}>
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      )}
                    </span>
                    <div>
                      <div style={{ 
                        color: T.dim, fontSize: 10, textTransform: "uppercase",
                        letterSpacing: ".1em", marginBottom: 2 
                      }}>{item.label}</div>
                      <div style={{ color: T.text, fontSize: 13, fontWeight: 500 }}>{item.val}</div>
                    </div>
                  </a>
                </GCard>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }} 
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}>
            <GCard style={{ padding: 32 }} T={T}>
              <AnimatePresence mode="wait">
                {sent
                  ? <motion.div 
                      key="ok" 
                      initial={{ opacity: 0, scale: .9 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      data-testid="contact-success"
                      style={{ textAlign: "center", padding: "48px 0" }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.acc3} strokeWidth="2" style={{ margin: "0 auto 16px" }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <h3 style={{ color: T.text, fontSize: 20, marginBottom: 8 }}>Message sent!</h3>
                      <p style={{ color: T.muted, fontSize: 14 }}>I'll reply within 24 hours.</p>
                    </motion.div>
                  : <motion.div key="form" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      <Input label="Name" value={form.name} onChange={f("name")} placeholder="Your name" T={T} />
                      {err.name && <span style={{ color: "#f472b6", fontSize: 11, marginTop: -10, marginBottom: 8 }}>{err.name}</span>}
                      <Input label="Email" value={form.email} onChange={f("email")} placeholder="your@email.com" T={T} />
                      {err.email && <span style={{ color: "#f472b6", fontSize: 11, marginTop: -10, marginBottom: 8 }}>{err.email}</span>}
                      <Input label="Subject" value={form.subject} onChange={f("subject")} placeholder="What's this about?" T={T} />
                      <Input label="Message" value={form.message} onChange={f("message")} placeholder="Tell me about your project..." multiline rows={4} T={T} />
                      {err.message && <span style={{ color: "#f472b6", fontSize: 11, marginTop: -10, marginBottom: 8 }}>{err.message}</span>}
                      {apiError && <span style={{ color: "#f472b6", fontSize: 12, marginBottom: 12, display: "block" }}>{apiError}</span>}
                      <Btn 
                        onClick={submit} 
                        disabled={sending}
                        style={{ width: "100%", marginTop: 4 }}
                        data-testid="contact-submit-btn">
                        {sending ? "Sending..." : "Send Message"}
                      </Btn>
                    </motion.div>
                }
              </AnimatePresence>
            </GCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ADMIN PANEL
const ADMIN_PASS = "admin_2025";

const AdminPanel = ({ isOpen, onClose, data, onSave, T }) => {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(data.profile);
  const [skills, setSkills] = useState(data.skills);
  const [projects, setProjects] = useState(data.projects);
  const [blogs, setBlogs] = useState(data.blogs);
  const [research, setResearch] = useState(data.research);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await onSave({ profile, skills, projects, blogs, research });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfile(p => ({ ...p, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleResume = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfile(p => ({ ...p, resume: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const TABS = [
    { id: "profile", label: "Profile" },
    { id: "skills", label: "Skills" },
    { id: "projects", label: "Projects" },
    { id: "blogs", label: "Blogs" },
    { id: "research", label: "Research" },
  ];

  const addSkillCat = () => setSkills(s => [...s, { id: Date.now(), cat: "New Category", color: "#38bdf8", items: ["Skill 1"] }]);
  const removeSkillCat = (id) => setSkills(s => s.filter(c => c.id !== id));
  const updateSkillCat = (id, key, val) => setSkills(s => s.map(c => c.id === id ? { ...c, [key]: val } : c));
  const addSkillItem = (id) => setSkills(s => s.map(c => c.id === id ? { ...c, items: [...c.items, "New Skill"] } : c));
  const updateSkillItem = (catId, idx, val) => setSkills(s => s.map(c => c.id === catId ? { ...c, items: c.items.map((it, i) => i === idx ? val : it) } : c));
  const removeSkillItem = (catId, idx) => setSkills(s => s.map(c => c.id === catId ? { ...c, items: c.items.filter((_, i) => i !== idx) } : c));

  const addProject = () => setProjects(p => [...p, { id: Date.now(), tag: "Systems", emoji: "🚀", title: "New Project", problem: "", approach: "", stack: [], arch: "", github: "", demo: "", color: "#38bdf8" }]);
  const removeProject = (id) => setProjects(p => p.filter(x => x.id !== id));
  const updateProject = (id, key, val) => setProjects(p => p.map(x => x.id === id ? { ...x, [key]: val } : x));

  const addBlog = () => setBlogs(b => [...b, { id: Date.now(), tag: "Tech", date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }), title: "New Post", excerpt: "", readTime: "5 min", color: "#38bdf8", body: "" }]);
  const removeBlog = (id) => setBlogs(b => b.filter(x => x.id !== id));
  const updateBlog = (id, key, val) => setBlogs(b => b.map(x => x.id === id ? { ...x, [key]: val } : x));

  const addResearch = () => setResearch(r => [...r, { id: Date.now(), year: "2025", title: "New Publication", venue: "", type: "Preprint", abstract: "", link: "#", tags: [] }]);
  const removeResearch = (id) => setResearch(r => r.filter(x => x.id !== id));
  const updateResearch = (id, key, val) => setResearch(r => r.map(x => x.id === id ? { ...x, [key]: val } : x));

  const tabBtnStyle = (id) => ({
    padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
    fontWeight: 600, background: tab === id ? `${T.acc}20` : "transparent",
    color: tab === id ? T.acc : T.muted, transition: "all .2s", whiteSpace: "nowrap",
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ 
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(6px)", zIndex: 300 
            }} />
          <motion.div
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            data-testid="admin-panel"
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: "min(680px, 100vw)", background: "rgba(4,8,16,.98)",
              backdropFilter: "blur(20px)", border: `1px solid ${T.border}`,
              zIndex: 301, display: "flex", flexDirection: "column", overflowY: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: "20px 24px", borderBottom: `1px solid ${T.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 
            }}>
              <div>
                <h2 style={{ color: T.text, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                  Admin Panel
                </h2>
                <p style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>Customize your portfolio content</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <AnimatePresence>
                  {saved && (
                    <motion.span 
                      initial={{ opacity: 0, scale: .9 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: T.acc3, fontSize: 12, fontWeight: 600 }}>Saved!</motion.span>
                  )}
                </AnimatePresence>
                <Btn onClick={save} data-testid="admin-save-btn">Save All</Btn>
                <button 
                  onClick={onClose}
                  data-testid="admin-close-btn"
                  style={{ 
                    background: "rgba(255,255,255,0.07)", border: `1px solid ${T.border}`,
                    borderRadius: 8, color: T.muted, cursor: "pointer", padding: "6px 14px" 
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ 
              display: "flex", gap: 4, padding: "12px 20px",
              borderBottom: `1px solid ${T.border}`, overflowX: "auto", flexShrink: 0 
            }}>
              {TABS.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setTab(t.id)} 
                  style={tabBtnStyle(t.id)}
                  data-testid={`admin-tab-${t.id}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

              {/* PROFILE TAB */}
              {tab === "profile" && (
                <div>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ 
                      width: 100, height: 100, borderRadius: "50%", overflow: "hidden",
                      border: `2px solid ${T.border}`, margin: "0 auto 12px",
                      background: `${T.acc}15`, display: "flex", alignItems: "center", justifyContent: "center" 
                    }}>
                      {profile.photo
                        ? <img src={profile.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                      }
                    </div>
                    <label style={{ 
                      display: "inline-block", padding: "7px 18px", borderRadius: 8,
                      background: `${T.acc}18`, border: `1px solid ${T.acc}40`, color: T.acc,
                      fontSize: 12, fontWeight: 600, cursor: "pointer" 
                    }}>
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
                    </label>
                  </div>
                  
                  {/* Resume Upload */}
                  <div style={{ textAlign: "center", marginBottom: 24, padding: "16px", background: "rgba(0,0,0,0.2)", borderRadius: 12 }}>
                    <p style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>
                      {profile.resume ? "Resume uploaded" : "No resume uploaded"}
                    </p>
                    <label style={{ 
                      display: "inline-block", padding: "7px 18px", borderRadius: 8,
                      background: `${T.acc3}18`, border: `1px solid ${T.acc3}40`, color: T.acc3,
                      fontSize: 12, fontWeight: 600, cursor: "pointer" 
                    }}>
                      Upload Resume (PDF)
                      <input type="file" accept=".pdf" onChange={handleResume} style={{ display: "none" }} />
                    </label>
                  </div>
                  
                  {[["Name","name","Your full name"],["Title","title","AI Engineer | Systems Developer..."],
                    ["Tagline","tagline","Short impactful tagline"],
                    ["Email","email","your@email.com"],["GitHub","github","https://github.com/..."],
                    ["LinkedIn","linkedin","https://linkedin.com/..."],["Twitter","twitter","https://twitter.com/..."]].map(([lbl,key,ph]) => (
                    <Input key={key} label={lbl} value={profile[key] || ""} onChange={v => setProfile(p => ({...p,[key]:v}))} placeholder={ph} T={T} />
                  ))}
                  <Input label="Bio" value={profile.bio} onChange={v => setProfile(p => ({...p,bio:v}))} placeholder="Your professional bio..." multiline rows={5} T={T} />
                </div>
              )}

              {/* SKILLS TAB */}
              {tab === "skills" && (
                <div>
                  <Btn onClick={addSkillCat} style={{ marginBottom: 20, width: "100%" }} data-testid="add-skill-category-btn">+ Add Skill Category</Btn>
                  {skills.map(cat => (
                    <GCard key={cat.id} style={{ padding: 18, marginBottom: 16 }} T={T}>
                      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
                        <input type="text" value={cat.cat} onChange={e => updateSkillCat(cat.id, "cat", e.target.value)}
                          style={{ 
                            flex: 1, padding: "7px 10px", background: "rgba(0,0,0,.4)",
                            border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontSize: 13, outline: "none" 
                          }} />
                        <input type="color" value={cat.color} onChange={e => updateSkillCat(cat.id, "color", e.target.value)}
                          style={{ width: 32, height: 32, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
                        <button onClick={() => removeSkillCat(cat.id)}
                          style={{ 
                            background: "#f472b618", border: "1px solid #f472b640", borderRadius: 6,
                            color: "#f472b6", cursor: "pointer", padding: "4px 10px", fontSize: 12 
                          }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {cat.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="text" value={item}
                              onChange={e => updateSkillItem(cat.id, idx, e.target.value)}
                              style={{ 
                                padding: "4px 8px", background: "rgba(0,0,0,.4)",
                                border: `1px solid ${T.border}`, borderRadius: 6, color: T.text,
                                fontSize: 12, width: 100, outline: "none" 
                              }} />
                            <button onClick={() => removeSkillItem(cat.id, idx)}
                              style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", fontSize: 14 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addSkillItem(cat.id)}
                          style={{ 
                            padding: "4px 10px", background: `${cat.color}15`,
                            border: `1px dashed ${cat.color}40`, borderRadius: 6,
                            color: cat.color, cursor: "pointer", fontSize: 12 
                          }}>+ Add</button>
                      </div>
                    </GCard>
                  ))}
                </div>
              )}

              {/* PROJECTS TAB */}
              {tab === "projects" && (
                <div>
                  <Btn onClick={addProject} style={{ marginBottom: 20, width: "100%" }} data-testid="add-project-btn">+ Add Project</Btn>
                  {projects.map(p => (
                    <GCard key={p.id} style={{ padding: 18, marginBottom: 16 }} T={T}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ color: T.acc, fontSize: 13, fontWeight: 600 }}>{p.title || "Untitled"}</span>
                        <button onClick={() => removeProject(p.id)}
                          style={{ 
                            background: "#f472b618", border: "1px solid #f472b640",
                            borderRadius: 6, color: "#f472b6", cursor: "pointer", padding: "3px 10px", fontSize: 11 
                          }}>Delete</button>
                      </div>
                      {[["title","Project Title"],["tag","Tag (Systems, AI/ML...)"],["emoji","Emoji"],
                        ["problem","Problem Statement"],["approach","Approach"],
                        ["arch","Architecture Flow"],["github","GitHub URL"],["demo","Demo URL"]].map(([key,label]) => (
                        <Input key={key} label={label} value={p[key] || ""}
                          onChange={v => updateProject(p.id, key, v)}
                          placeholder={label} multiline={["problem","approach"].includes(key)} rows={2} T={T} />
                      ))}
                      <Input label="Stack (comma separated)" value={(p.stack||[]).join(", ")}
                        onChange={v => updateProject(p.id, "stack", v.split(",").map(s=>s.trim()).filter(Boolean))}
                        placeholder="Python, FastAPI, Docker" T={T} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <label style={{ color: T.muted, fontSize: 11 }}>Card Color</label>
                        <input type="color" value={p.color || "#38bdf8"}
                          onChange={e => updateProject(p.id, "color", e.target.value)}
                          style={{ width: 32, height: 32, border: "none", borderRadius: 6, cursor: "pointer" }} />
                      </div>
                    </GCard>
                  ))}
                </div>
              )}

              {/* BLOGS TAB */}
              {tab === "blogs" && (
                <div>
                  <Btn onClick={addBlog} style={{ marginBottom: 20, width: "100%" }} data-testid="add-blog-btn">+ Add Blog Post</Btn>
                  {blogs.map(b => (
                    <GCard key={b.id} style={{ padding: 18, marginBottom: 16 }} T={T}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ color: T.acc, fontSize: 13, fontWeight: 600 }}>{b.title || "Untitled"}</span>
                        <button onClick={() => removeBlog(b.id)}
                          style={{ 
                            background: "#f472b618", border: "1px solid #f472b640",
                            borderRadius: 6, color: "#f472b6", cursor: "pointer", padding: "3px 10px", fontSize: 11 
                          }}>Delete</button>
                      </div>
                      {[["title","Post Title"],["tag","Category Tag"],["date","Date (e.g. Jan 2025)"],
                        ["readTime","Read Time (e.g. 5 min)"],["excerpt","Short Excerpt"]].map(([key,label]) => (
                        <Input key={key} label={label} value={b[key] || ""}
                          onChange={v => updateBlog(b.id, key, v)} placeholder={label}
                          multiline={key==="excerpt"} rows={2} T={T} />
                      ))}
                      <Input label="Full Article Body" value={b.body || ""}
                        onChange={v => updateBlog(b.id, "body", v)}
                        placeholder="Write your full article here..." multiline rows={6} T={T} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <label style={{ color: T.muted, fontSize: 11 }}>Card Color</label>
                        <input type="color" value={b.color || "#38bdf8"}
                          onChange={e => updateBlog(b.id, "color", e.target.value)}
                          style={{ width: 32, height: 32, border: "none", borderRadius: 6, cursor: "pointer" }} />
                      </div>
                    </GCard>
                  ))}
                </div>
              )}

              {/* RESEARCH TAB */}
              {tab === "research" && (
                <div>
                  <Btn onClick={addResearch} style={{ marginBottom: 20, width: "100%" }} data-testid="add-research-btn">+ Add Publication</Btn>
                  {research.map(r => (
                    <GCard key={r.id} style={{ padding: 18, marginBottom: 16 }} T={T}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ color: T.acc, fontSize: 13, fontWeight: 600 }}>{r.title || "Untitled"}</span>
                        <button onClick={() => removeResearch(r.id)}
                          style={{ 
                            background: "#f472b618", border: "1px solid #f472b640",
                            borderRadius: 6, color: "#f472b6", cursor: "pointer", padding: "3px 10px", fontSize: 11 
                          }}>Delete</button>
                      </div>
                      {[["title","Paper Title"],["venue","Venue / Conference / Journal"],
                        ["year","Year"],["type","Type (Preprint, Journal Paper, Technical Report)"],
                        ["link","Paper URL"],["abstract","Abstract"]].map(([key,label]) => (
                        <Input key={key} label={label} value={r[key] || ""}
                          onChange={v => updateResearch(r.id, key, v)} placeholder={label}
                          multiline={key==="abstract"} rows={3} T={T} />
                      ))}
                      <Input label="Tags (comma separated)" value={(r.tags||[]).join(", ")}
                        onChange={v => updateResearch(r.id, "tags", v.split(",").map(s=>s.trim()).filter(Boolean))}
                        placeholder="AI, Systems, ML" T={T} />
                    </GCard>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ADMIN LOGIN MODAL
const AdminLogin = ({ onSuccess, T }) => {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const attempt = () => {
    if (pw === ADMIN_PASS) { onSuccess(); setErr(false); }
    else { setErr(true); setPw(""); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ color: T.muted, fontSize: 14 }}>Enter admin password to access the CMS.</p>
      <input 
        type="password" 
        value={pw}
        onChange={e => { setPw(e.target.value); setErr(false); }}
        onKeyDown={e => e.key === "Enter" && attempt()}
        placeholder="Password"
        data-testid="admin-password-input"
        style={{ 
          padding: "10px 14px", background: "rgba(0,0,0,.5)",
          border: `1px solid ${err ? "#f472b6" : T.border}`, borderRadius: 8,
          color: T.text, fontSize: 14, outline: "none" 
        }} />
      {err && <span style={{ color: "#f472b6", fontSize: 12 }}>Incorrect password. Try again.</span>}
      <Btn onClick={attempt} style={{ width: "100%" }} data-testid="admin-login-btn">Unlock Admin Panel</Btn>
    </div>
  );
};

// FOOTER
const Footer = ({ profile, T }) => (
  <footer style={{ 
    padding: "36px clamp(20px,5vw,72px)",
    borderTop: `1px solid ${T.border}`,
    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 
  }}>
    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.acc }}>
      SB<span style={{ color: T.dim }}>.</span>
    </span>
    <p style={{ color: T.dim, fontSize: 12 }}>&copy; 2025 {profile.name}. Built with React.</p>
    <div style={{ display: "flex", gap: 16 }}>
      {[["GitHub",profile.github],["LinkedIn",profile.linkedin],["Email",`mailto:${profile.email}`]].map(([l,h]) => (
        <a key={l} href={h} target="_blank" rel="noopener noreferrer"
          style={{ color: T.dim, fontSize: 12, textDecoration: "none", transition: "color .2s" }}
          onMouseEnter={e => e.target.style.color = T.acc}
          onMouseLeave={e => e.target.style.color = T.dim}>{l}</a>
      ))}
    </div>
  </footer>
);

// ROOT APP
export default function App() {
  const [page, setPage] = useState("Home");
  const [isDark, setIsDark] = useState(true);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [blogs, setBlogs] = useState(DEFAULT_BLOGS);
  const [research, setResearch] = useState(DEFAULT_RESEARCH);
  const [loaded, setLoaded] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showAdminBtn, setShowAdminBtn] = useState(false);

  const T = getTokens(isDark);

  // Load from persistent storage on mount
  useEffect(() => {
    (async () => {
      const d = await store.get("portfolio_data");
      if (d) {
        if (d.profile) setProfile(d.profile);
        if (d.skills) setSkills(d.skills);
        if (d.projects) setProjects(d.projects);
        if (d.blogs) setBlogs(d.blogs);
        if (d.research) setResearch(d.research);
      }
      // Load theme preference
      const theme = await store.get("theme_preference");
      if (theme !== null) setIsDark(theme);
      setLoaded(true);
    })();
  }, []);

  // Secret keyboard shortcut: Ctrl+Shift+A OR URL param ?admin=true to show admin button
  useEffect(() => {
    // Check URL for admin access
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setShowAdminBtn(true);
    }
    
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminBtn(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll to top on page change
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page]);

  // Save theme preference
  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    await store.set("theme_preference", newTheme);
  };

  const handleSave = async (newData) => {
    await store.set("portfolio_data", newData);
    setProfile(newData.profile);
    setSkills(newData.skills);
    setProjects(newData.projects);
    setBlogs(newData.blogs);
    setResearch(newData.research);
  };

  const openAdmin = () => {
    if (authed) setAdminOpen(true);
    else setLoginOpen(true);
  };

  if (!loaded) return (
    <div style={{ 
      background: T.bg, minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center" 
    }}>
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ 
          width: 40, height: 40, border: `3px solid ${T.border}`,
          borderTopColor: T.acc, borderRadius: "50%" 
        }} />
    </div>
  );

  return (
    <div style={{ 
      background: T.bg, minHeight: "100vh",
      fontFamily: "'Source Sans 3', system-ui, sans-serif", color: T.text, overflowX: "hidden",
      transition: "background-color 0.3s ease"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.bg}; transition: background-color 0.3s ease; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? "#1e3048" : "#cbd5e1"}; border-radius: 3px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @media (max-width: 900px) {
          .hero-container {
            flex-direction: column !important;
            text-align: center !important;
          }
          .hero-text {
            order: 2 !important;
          }
          .hero-photo {
            order: 1 !important;
          }
        }
        @media (max-width: 768px) {
          .desk-nav { display: none !important; }
          .mob-controls { display: flex !important; gap: 8px; align-items: center; }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1.2fr"],
          div[style*="grid-template-columns: 1fr 1.6fr"],
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Nav page={page} setPage={setPage} isDark={isDark} toggleTheme={toggleTheme} T={T} />

      {/* Admin trigger button - Hidden by default, press Ctrl+Shift+A to show */}
      {showAdminBtn && (
        <motion.button
          onClick={openAdmin}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          title="Admin Panel (Ctrl+Shift+A to show)"
          data-testid="admin-trigger-btn"
          style={{
            position: "fixed", bottom: 28, left: 24, zIndex: 50,
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
            border: "none", cursor: "pointer", fontSize: 20,
            boxShadow: "0 4px 20px rgba(56,189,248,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </motion.button>
      )}

      {/* Page transitions */}
      <AnimatePresence mode="wait">
        {page === "Home" && <HomePage key="home" profile={profile} setPage={setPage} T={T} isDark={isDark} />}
        {page === "About" && <AboutPage key="about" profile={profile} T={T} />}
        {page === "Skills" && <SkillsPage key="skills" skills={skills} T={T} />}
        {page === "Projects" && <ProjectsPage key="projects" projects={projects} T={T} />}
        {page === "Research" && <ResearchPage key="research" research={research} T={T} />}
        {page === "Blog" && <BlogPage key="blog" blogs={blogs} T={T} />}
        {page === "Contact" && <ContactPage key="contact" profile={profile} T={T} />}
      </AnimatePresence>

      {page !== "Home" && <Footer profile={profile} T={T} />}

      {/* Admin login modal */}
      <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title="Admin Access" T={T}>
        <AdminLogin onSuccess={() => { setAuthed(true); setLoginOpen(false); setAdminOpen(true); }} T={T} />
      </Modal>

      {/* Admin panel */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        data={{ profile, skills, projects, blogs, research }}
        onSave={handleSave}
        T={T}
      />
    </div>
  );
}
