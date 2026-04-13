// src/app/(dashboard)/dashboard/page.js
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ActivityFeed from '../../../components/ActivityFeed';

// ============================================================
// GLOBAL STYLES
// ============================================================
function GlobalStyles() {
  return (
    <style jsx global>{`
      * { box-sizing: border-box; }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeInLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fadeInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.88); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideInCard {
        from { opacity: 0; transform: translateY(30px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes pulse-ring {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(102,126,234,0.4); }
        70% { transform: scale(1); box-shadow: 0 0 0 12px rgba(102,126,234,0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(102,126,234,0); }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      @keyframes gradient-x {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes counter-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes progress-fill {
        from { width: 0%; }
        to { width: var(--target-width); }
      }
      @keyframes ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
      @keyframes orbit {
        from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
        to { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
      }
      @keyframes wave {
        0%, 100% { transform: scaleY(0.5); }
        50% { transform: scaleY(1.2); }
      }
      @keyframes spin-refresh {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .dashboard-bg {
        min-height: 100vh;
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #1e3a5f 65%, #0f172a 100%);
        background-size: 400% 400%;
        animation: gradient-x 15s ease infinite;
      }

      .glass-card {
        background: rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .glass-card:hover {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.14);
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.06);
        transform: translateY(-4px);
      }

      .stat-card {
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .stat-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
        opacity: 0;
        transition: opacity 0.4s ease;
        border-radius: inherit;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1);
      }
      .stat-card:active { transform: translateY(-4px) scale(0.99); }

      .shimmer-loading {
        background: linear-gradient(90deg,
          rgba(255,255,255,0.03) 25%,
          rgba(255,255,255,0.08) 50%,
          rgba(255,255,255,0.03) 75%
        );
        background-size: 1000px 100%;
        animation: shimmer 2s infinite;
      }

      .quick-action-btn {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .quick-action-btn::after {
        content: '';
        position: absolute;
        left: -100%;
        top: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
        transition: left 0.5s ease;
      }
      .quick-action-btn:hover::after { left: 100%; }
      .quick-action-btn:hover {
        background: rgba(255,255,255,0.06) !important;
        border-color: rgba(102,126,234,0.4) !important;
        transform: translateX(6px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      }
      .quick-action-btn:active { transform: translateX(3px) scale(0.99); }

      .progress-bar {
        animation: progress-fill 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        animation-delay: 0.5s;
      }

      .refresh-btn {
        transition: all 0.3s ease;
        cursor: pointer;
      }
      .refresh-btn:hover {
        background: rgba(255,255,255,0.1) !important;
        border-color: rgba(99,102,241,0.4) !important;
      }
      .refresh-btn:active {
        transform: scale(0.95);
      }
      .refresh-spinning {
        animation: spin-refresh 0.6s linear infinite;
      }

      .content-grid {
        display: grid;
        gap: clamp(16px, 2.5vw, 24px);
      }
      @media (min-width: 1024px) {
        .content-grid { grid-template-columns: 2fr 1fr; }
        .cashier-grid { grid-template-columns: 1fr 2fr; }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: clamp(12px, 2vw, 20px);
      }
      @media (min-width: 768px) {
        .stats-grid { grid-template-columns: repeat(4, 1fr); }
      }

      .header-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 100px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
      ::-webkit-scrollbar-thumb {
        background: rgba(102,126,234,0.3);
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(102,126,234,0.5);
      }

      @media (max-width: 640px) {
        .glass-card:hover { transform: none; }
        .stat-card:hover { transform: none; }
        .quick-action-btn:hover { transform: none; }
      }
    `}</style>
  );
}

// ============================================================
// ANIMATED BACKGROUND
// ============================================================
function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Dot {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.r = Math.random() * 1.5 + 0.3;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.alpha = Math.random() * 0.4 + 0.1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${this.alpha})`;
        ctx.fill();
      }
    }

    const count = Math.min(60, Math.floor(canvas.width / 25));
    for (let i = 0; i < count; i++) particles.push(new Dot());

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(147,197,253,${0.08 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        particles[i].update();
        particles[i].draw();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none', zIndex: 0,
        opacity: 0.6,
      }}
    />
  );
}

// ============================================================
// ANIMATED COUNTER
// ============================================================
function AnimatedCounter({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const raw = typeof value === 'string'
      ? parseFloat(value.replace(/[^0-9.]/g, ''))
      : value;
    if (isNaN(raw) || raw === 0) { setDisplay(0); return; }
    const timer = setTimeout(() => setStarted(true), 300);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!started) return;
    const raw = typeof value === 'string'
      ? parseFloat(value.replace(/[^0-9.]/g, ''))
      : value;
    if (isNaN(raw)) return;

    const duration = 1200;
    const step = 16;
    const steps = duration / step;
    const inc = raw / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += inc;
      if (current >= raw) {
        setDisplay(raw);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, step);
    return () => clearInterval(timer);
  }, [started, value]);

  const formatted = display.toLocaleString('en-IN');
  return <span>{prefix}{formatted}{suffix}</span>;
}

// ============================================================
// ROLE BADGE CONFIG
// ============================================================
const ROLE_CONFIG = {
  SUPER_ADMIN: {
    emoji: '👑', label: 'Super Admin',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  MANAGER: {
    emoji: '👔', label: 'Manager',
    color: '#6366f1', bg: 'rgba(99,102,241,0.15)',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  },
  EMPLOYEE: {
    emoji: '🔧', label: 'Technician',
    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  CASHIER: {
    emoji: '💰', label: 'Cashier',
    color: '#10b981', bg: 'rgba(16,185,129,0.15)',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
};

// ============================================================
// LOADING SCREEN
// ============================================================
function LoadingScreen() {
  return (
    <div className="dashboard-bg" style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
    }}>
      <AnimatedBackground />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: 72, height: 72, margin: '0 auto', position: 'relative' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              position: 'absolute', inset: i * 8,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: i === 0 ? '#6366f1' : i === 1 ? '#3b82f6' : '#06b6d4',
              animation: `rotate ${1.2 - i * 0.2}s linear infinite`,
            }} />
          ))}
          <div style={{
            position: 'absolute', inset: '50%',
            transform: 'translate(-50%,-50%)',
            width: 12, height: 12,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
            animation: 'pulse-ring 1.5s ease infinite',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 24, marginBottom: 16 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              width: 4, height: 24, borderRadius: 2,
              background: 'linear-gradient(to top,#6366f1,#06b6d4)',
              animation: `wave 1s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }} />
          ))}
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 14, fontWeight: 500,
          letterSpacing: '0.5px',
        }}>
          Loading your dashboard...
        </p>
      </div>
    </div>
  );
}

// ============================================================
// REFRESH INDICATOR
// ============================================================
function RefreshIndicator({ lastUpdated, onRefresh, isMobile }) {
  const [refreshing, setRefreshing] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) setTimeAgo('just now');
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'fadeInRight 0.5s ease 0.3s backwards',
    }}>
      {!isMobile && lastUpdated && (
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
          fontWeight: 500,
        }}>
          Updated {timeAgo}
        </span>
      )}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="refresh-btn"
        style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: refreshing ? 0.7 : 1,
        }}
        title="Refresh stats"
      >
        <svg
          style={{
            width: 15, height: 15,
            color: refreshing ? '#6366f1' : 'rgba(255,255,255,0.5)',
          }}
          className={refreshing ? 'refresh-spinning' : ''}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================
// DASHBOARD HEADER
// ============================================================
function DashboardHeader({ user, isMobile, lastUpdated, onRefresh }) {
  const [time, setTime] = useState(new Date());
  const role = ROLE_CONFIG[user?.role] || ROLE_CONFIG.EMPLOYEE;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = time.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const displayName = isMobile ? user?.name?.split(' ')[0] : user?.name;

  return (
    <div style={{
      marginBottom: 'clamp(20px,3vw,32px)',
      animation: 'fadeInDown 0.7s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {/* Left: avatar + text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: isMobile ? 48 : 60,
              height: isMobile ? 48 : 60,
              borderRadius: '50%',
              background: role.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 22 : 28,
              boxShadow: `0 0 0 3px rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.3)`,
              animation: 'float 4s ease-in-out infinite',
            }}>
              {role.emoji}
            </div>
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 10, height: 10, borderRadius: '50%',
              background: '#10b981',
              border: '2px solid rgba(15,23,42,0.8)',
            }}>
              <div style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                background: '#10b981',
                animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                opacity: 0.4,
              }} />
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span className="header-badge" style={{
                background: role.bg,
                color: role.color,
                border: `1px solid ${role.color}30`,
              }}>
                {role.label}
              </span>
            </div>
            <h1 style={{
              fontSize: isMobile ? '1.25rem' : 'clamp(1.5rem,3vw,2rem)',
              fontWeight: 800,
              color: 'white',
              margin: 0,
              letterSpacing: '-0.5px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {greeting}, {displayName}! 👋
            </h1>
            <p style={{
              margin: '4px 0 0',
              color: 'rgba(255,255,255,0.45)',
              fontSize: isMobile ? 12 : 13,
              fontWeight: 500,
            }}>
              {time.toLocaleDateString('en-IN', {
                weekday: isMobile ? 'short' : 'long',
                year: 'numeric', month: 'long', day: 'numeric',
              })}
              {' · '}
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Right: system status + refresh */}
        <div style={{
          display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center',
          animation: 'fadeInRight 0.7s ease 0.2s backwards',
        }}>
          {!isMobile && (
            <>
              {[
                { label: 'System', value: 'Online', dot: '#10b981' },
                { label: 'Session', value: 'Active', dot: '#6366f1' },
              ].map(item => (
                <div key={item.label} className="glass-card" style={{
                  padding: '10px 16px', borderRadius: 12,
                  textAlign: 'center', minWidth: 90,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.dot }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{item.value}</span>
                </div>
              ))}
            </>
          )}
          <RefreshIndicator lastUpdated={lastUpdated} onRefresh={onRefresh} isMobile={isMobile} />
        </div>
      </div>

      <div style={{
        marginTop: 20, height: 1,
        background: 'linear-gradient(90deg, rgba(99,102,241,0.4), rgba(6,182,212,0.2), transparent)',
      }} />
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
function StatCard({ title, value, icon, gradient, index, isMobile, prefix = '', suffix = '' }) {
  const [hovered, setHovered] = useState(false);

  const raw = typeof value === 'number' ? value
    : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const progress = Math.min(100, raw > 0 ? 67 : 0);

  return (
    <div
      className="glass-card stat-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setTimeout(() => setHovered(false), 300)}
      style={{
        padding: isMobile ? '16px' : 'clamp(18px,2.5vw,24px)',
        animation: `slideInCard 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.12}s backwards`,
        borderRadius: 20,
      }}
    >
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 100, height: 100,
        borderRadius: '50%',
        background: gradient,
        opacity: hovered ? 0.18 : 0.08,
        filter: 'blur(20px)',
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase', letterSpacing: '0.8px',
            margin: '0 0 8px',
          }}>
            {title}
          </p>
          <p style={{
            fontSize: isMobile ? '1.5rem' : 'clamp(1.6rem,3vw,2.2rem)',
            fontWeight: 800, color: 'white',
            margin: '0 0 6px',
            letterSpacing: '-1px',
            lineHeight: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <AnimatedCounter value={raw} prefix={prefix} suffix={suffix} />
          </p>
        </div>

        <div style={{
          width: isMobile ? 48 : 56,
          height: isMobile ? 48 : 56,
          borderRadius: isMobile ? 14 : 18,
          background: gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isMobile ? 22 : 26,
          boxShadow: `0 8px 24px rgba(0,0,0,0.25)`,
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
          transform: hovered && !isMobile ? 'scale(1.12) rotate(8deg)' : 'scale(1) rotate(0deg)',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          height: 3, borderRadius: 2,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          <div
            className="progress-bar"
            style={{
              '--target-width': `${progress}%`,
              height: '100%',
              width: 0,
              borderRadius: 2,
              background: gradient,
              opacity: 0.8,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QUICK ACTIONS CARD
// ============================================================
function QuickActionsCard({ cashier = false, isMobile }) {
  const actions = cashier ? [
    { label: 'Create Invoice', icon: '📝', href: '/invoices/new', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', desc: 'New billing entry' },
    { label: 'Record Payment', icon: '💰', href: '/payments', gradient: 'linear-gradient(135deg,#10b981,#059669)', desc: 'Mark payment received' },
    { label: 'View Reports', icon: '📊', href: '/reports', gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', desc: 'Financial summary' },
  ] : [
    { label: 'Manage Users', icon: '👤', href: '/users', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', desc: 'Add or edit team members' },
    { label: 'View Reports', icon: '📊', href: '/reports', gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', desc: 'Analytics & insights' },
    { label: 'Manage Branches', icon: '🏢', href: '/branches', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', desc: 'Branch operations' },
    { label: 'Inventory', icon: '📦', href: '/inventory', gradient: 'linear-gradient(135deg,#64748b,#475569)', desc: 'Parts & stock' },
  ];

  return (
    <div className="glass-card" style={{
      padding: isMobile ? '20px' : 'clamp(20px,2.5vw,28px)',
      animation: 'scaleIn 0.6s cubic-bezier(0.4,0,0.2,1) 0.4s backwards',
      borderRadius: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{
          fontSize: isMobile ? 16 : 18, fontWeight: 700,
          color: 'white', margin: 0, letterSpacing: '-0.3px',
        }}>
          Quick Actions
        </h2>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>
          ⚡
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actions.map((action, i) => (
          <QuickActionButton key={action.href} {...action} index={i} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
}

function QuickActionButton({ label, icon, href, gradient, desc, index, isMobile }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="quick-action-btn"
      style={{
        display: 'flex', alignItems: 'center',
        gap: isMobile ? 12 : 14,
        padding: isMobile ? '12px' : '14px 16px',
        borderRadius: 16,
        textDecoration: 'none',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
        animation: `fadeInUp 0.5s ease ${index * 0.08}s backwards`,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: isMobile ? 42 : 48, height: isMobile ? 42 : 48,
        borderRadius: isMobile ? 12 : 14,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isMobile ? 18 : 22,
        boxShadow: hovered ? '0 8px 20px rgba(0,0,0,0.3)' : '0 4px 10px rgba(0,0,0,0.2)',
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered && !isMobile ? 'scale(1.08) rotate(6deg)' : 'scale(1) rotate(0)',
        flexShrink: 0,
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontWeight: 600,
          color: hovered ? 'white' : 'rgba(255,255,255,0.8)',
          fontSize: isMobile ? 13 : 14,
          transition: 'color 0.3s',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </p>
        {!isMobile && (
          <p style={{
            margin: '2px 0 0', fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {desc}
          </p>
        )}
      </div>

      <svg
        style={{
          width: 16, height: 16, flexShrink: 0,
          color: hovered ? 'rgba(99,102,241,0.9)' : 'rgba(255,255,255,0.2)',
          transition: 'all 0.3s ease',
          transform: hovered ? 'translateX(3px)' : 'translateX(0)',
        }}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}

// ============================================================
// ACTIVITY FEED WRAPPER
// ============================================================
function StyledActivityFeed({ maxHeight, isMobile }) {
  return (
    <div className="glass-card" style={{
      borderRadius: 24, overflow: 'hidden',
      animation: 'scaleIn 0.6s cubic-bezier(0.4,0,0.2,1) 0.3s backwards',
    }}>
      <div style={{
        padding: isMobile ? '16px 16px 12px' : '20px 24px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16,185,129,0.5)',
            animation: 'pulse-ring 2s ease infinite',
          }} />
          <h2 style={{
            margin: 0, fontSize: isMobile ? 15 : 17,
            fontWeight: 700, color: 'white',
          }}>
            Live Activity
          </h2>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Real-time
        </span>
      </div>
      <div style={{ maxHeight, overflowY: 'auto' }}>
        <ActivityFeed maxHeight={maxHeight} />
      </div>
    </div>
  );
}

// ============================================================
// ROLE DASHBOARDS
// ============================================================
function SuperAdminDashboard({ user, stats, isMobile, lastUpdated, onRefresh }) {
  const statCards = [
    { title: 'Total Revenue', value: stats.totalRevenue || 0, icon: '💰', gradient: 'linear-gradient(135deg,#10b981,#059669)', prefix: '₹' },
    { title: 'Active Jobs', value: stats.activeJobs || 0, icon: '🔧', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { title: 'Total Customers', value: stats.totalCustomers || 0, icon: '👥', gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
    { title: 'All Branches', value: stats.totalBranches || 0, icon: '🏢', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  ];

  return (
    <div className="dashboard-bg" style={{ position: 'relative' }}>
      <AnimatedBackground />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1440, margin: '0 auto',
        padding: isMobile ? '16px' : 'clamp(20px,3vw,36px)',
      }}>
        <DashboardHeader user={user} isMobile={isMobile} lastUpdated={lastUpdated} onRefresh={onRefresh} />

        <div className="stats-grid" style={{ marginBottom: 'clamp(20px,3vw,28px)' }}>
          {statCards.map((s, i) => (
            <StatCard key={s.title} {...s} index={i} isMobile={isMobile} />
          ))}
        </div>

        <div className="content-grid">
          <StyledActivityFeed maxHeight={isMobile ? '380px' : '520px'} isMobile={isMobile} />
          <QuickActionsCard isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

function ManagerDashboard({ user, stats, isMobile, lastUpdated, onRefresh }) {
  const statCards = [
    { title: 'Branch Revenue', value: stats.branchRevenue || 0, icon: '💰', gradient: 'linear-gradient(135deg,#10b981,#059669)', prefix: '₹' },
    { title: 'Pending Jobs', value: stats.pendingJobs || 0, icon: '⏳', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { title: 'Team Members', value: stats.teamMembers || 0, icon: '👥', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { title: "Today's Jobs", value: stats.todaysJobs || 0, icon: '📋', gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
  ];

  return (
    <div className="dashboard-bg" style={{ position: 'relative' }}>
      <AnimatedBackground />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1440, margin: '0 auto',
        padding: isMobile ? '16px' : 'clamp(20px,3vw,36px)',
      }}>
        <DashboardHeader user={user} isMobile={isMobile} lastUpdated={lastUpdated} onRefresh={onRefresh} />

        <div className="stats-grid" style={{ marginBottom: 'clamp(20px,3vw,28px)' }}>
          {statCards.map((s, i) => (
            <StatCard key={s.title} {...s} index={i} isMobile={isMobile} />
          ))}
        </div>

        <StyledActivityFeed maxHeight={isMobile ? '380px' : '500px'} isMobile={isMobile} />
      </div>
    </div>
  );
}

function EmployeeDashboard({ user, stats, isMobile, lastUpdated, onRefresh }) {
  const statCards = [
    { title: 'Assigned Jobs', value: stats.assignedJobs || 0, icon: '📋', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { title: 'In Progress', value: stats.inProgressJobs || 0, icon: '⚡', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { title: 'Completed Today', value: stats.completedToday || 0, icon: '✅', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    { title: 'This Week', value: stats.completedThisWeek || 0, icon: '📊', gradient: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' },
  ];

  return (
    <div className="dashboard-bg" style={{ position: 'relative' }}>
      <AnimatedBackground />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1440, margin: '0 auto',
        padding: isMobile ? '16px' : 'clamp(20px,3vw,36px)',
      }}>
        <DashboardHeader user={user} isMobile={isMobile} lastUpdated={lastUpdated} onRefresh={onRefresh} />

        <div className="stats-grid" style={{ marginBottom: 'clamp(20px,3vw,28px)' }}>
          {statCards.map((s, i) => (
            <StatCard key={s.title} {...s} index={i} isMobile={isMobile} />
          ))}
        </div>

        <StyledActivityFeed maxHeight={isMobile ? '380px' : '500px'} isMobile={isMobile} />
      </div>
    </div>
  );
}

function CashierDashboard({ user, stats, isMobile, lastUpdated, onRefresh }) {
  const statCards = [
    { title: "Today's Collection", value: stats.todaysCollection || 0, icon: '💵', gradient: 'linear-gradient(135deg,#10b981,#059669)', prefix: '₹' },
    { title: 'Pending Invoices', value: stats.pendingInvoices || 0, icon: '📄', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { title: 'Payments Today', value: stats.paymentsToday || 0, icon: '💳', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { title: 'Overdue', value: stats.overdueInvoices || 0, icon: '⚠️', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  ];

  return (
    <div className="dashboard-bg" style={{ position: 'relative' }}>
      <AnimatedBackground />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1440, margin: '0 auto',
        padding: isMobile ? '16px' : 'clamp(20px,3vw,36px)',
      }}>
        <DashboardHeader user={user} isMobile={isMobile} lastUpdated={lastUpdated} onRefresh={onRefresh} />

        <div className="stats-grid" style={{ marginBottom: 'clamp(20px,3vw,28px)' }}>
          {statCards.map((s, i) => (
            <StatCard key={s.title} {...s} index={i} isMobile={isMobile} />
          ))}
        </div>

        <div className="content-grid cashier-grid">
          <QuickActionsCard cashier isMobile={isMobile} />
          <StyledActivityFeed maxHeight={isMobile ? '380px' : '500px'} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

function DefaultDashboard({ user }) {
  return (
    <div className="dashboard-bg" style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      position: 'relative',
    }}>
      <AnimatedBackground />
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 1,
        animation: 'scaleIn 0.6s ease', padding: 24,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🚗</div>
        <h1 style={{
          fontSize: 'clamp(1.5rem,5vw,2rem)', fontWeight: 800,
          color: 'white', marginBottom: 12,
        }}>
          Welcome, {user?.name}!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
          Your dashboard is being configured...
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const router = useRouter();
  const refreshInterval = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchDashboardData = useCallback(async (role, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`/api/dashboard?role=${role}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        userRef.current = parsed;

        // Initial fetch
        fetchDashboardData(parsed.role, true);

        // Auto-refresh every 30 seconds
        refreshInterval.current = setInterval(() => {
          if (userRef.current?.role) {
            fetchDashboardData(userRef.current.role, false);
          }
        }, 30000);
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [router, fetchDashboardData]);

  // Refresh stats when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && userRef.current?.role) {
        fetchDashboardData(userRef.current.role, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchDashboardData]);

  const handleRefresh = useCallback(() => {
    if (userRef.current?.role) {
      return fetchDashboardData(userRef.current.role, false);
    }
    return Promise.resolve();
  }, [fetchDashboardData]);

  if (loading) return <><GlobalStyles /><LoadingScreen /></>;

  const dashboardProps = {
    user,
    stats,
    isMobile,
    lastUpdated,
    onRefresh: handleRefresh,
  };

  return (
    <>
      <GlobalStyles />
      {(() => {
        switch (user?.role) {
          case 'SUPER_ADMIN': return <SuperAdminDashboard {...dashboardProps} />;
          case 'MANAGER':     return <ManagerDashboard    {...dashboardProps} />;
          case 'EMPLOYEE':    return <EmployeeDashboard   {...dashboardProps} />;
          case 'CASHIER':     return <CashierDashboard    {...dashboardProps} />;
          default:            return <DefaultDashboard    user={user} />;
        }
      })()}
    </>
  );
}