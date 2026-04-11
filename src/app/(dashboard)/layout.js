// src/app/(dashboard)/layout.js
'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

// ── Pre-generated static particle positions (no Math.random at render) ──
const STATIC_PARTICLES = [
  { l:12, t:8,  w:3.2, h:4.1, dd:0.3, du:12 },
  { l:87, t:23, w:4.5, h:2.8, dd:1.2, du:15 },
  { l:34, t:67, w:2.8, h:5.1, dd:2.1, du:10 },
  { l:65, t:12, w:5.3, h:3.4, dd:0.8, du:14 },
  { l:91, t:85, w:3.7, h:4.7, dd:3.2, du:11 },
  { l:23, t:45, w:4.1, h:2.3, dd:1.7, du:16 },
  { l:78, t:56, w:2.4, h:5.6, dd:0.5, du:9  },
  { l:45, t:91, w:5.1, h:3.1, dd:2.8, du:13 },
  { l:8,  t:34, w:3.9, h:4.4, dd:1.4, du:17 },
  { l:56, t:78, w:4.7, h:2.6, dd:3.6, du:8  },
  { l:19, t:15, w:2.6, h:5.3, dd:0.9, du:12 },
  { l:72, t:42, w:5.5, h:3.8, dd:2.4, du:15 },
  { l:41, t:88, w:3.4, h:4.9, dd:1.1, du:10 },
  { l:95, t:5,  w:4.3, h:2.1, dd:3.9, du:14 },
  { l:30, t:61, w:2.2, h:5.8, dd:0.2, du:11 },
  { l:83, t:37, w:5.7, h:3.5, dd:2.6, du:16 },
  { l:52, t:93, w:3.1, h:4.2, dd:1.5, du:9  },
  { l:7,  t:72, w:4.8, h:2.9, dd:3.3, du:13 },
  { l:68, t:18, w:2.9, h:5.4, dd:0.7, du:17 },
  { l:15, t:52, w:5.2, h:3.3, dd:2.0, du:8  },
];

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');
  const [loadProgress, setLoadProgress] = useState(0);
  const [pageTransition, setPageTransition] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  // Auth check
  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));

    let progress = 0;
    const interval = setInterval(() => {
      progress += 15 + Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setLoading(false), 300);
      }
      setLoadProgress(progress);
    }, 200);

    return () => clearInterval(interval);
  }, [router]);

  // Page transition
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setPageTransition(true);
      const t = setTimeout(() => setPageTransition(false), 400);
      prevPathRef.current = pathname;
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Body overflow lock
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [sidebarOpen]);

  // Screen size
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setScreenSize(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isMobile = screenSize === 'mobile';
  const isDesktop = screenSize === 'desktop';
  const sidebarWidth = isDesktop ? (sidebarCollapsed ? 78 : 272) : 0;

  // ── Loading Screen ──
  if (loading || !mounted) {
    return (
      <>
        <LayoutCSS />
        <div className="layout-loading-screen">
          <div className="layout-loading-bg" />

          {/* Static particles — NO Math.random() */}
          <div className="layout-loading-particles">
            {STATIC_PARTICLES.map((p, i) => (
              <div
                key={i}
                className="layout-particle"
                style={{
                  left: `${p.l}%`,
                  top: `${p.t}%`,
                  width: `${p.w}px`,
                  height: `${p.h}px`,
                  animationDelay: `${p.dd}s`,
                  animationDuration: `${p.du}s`,
                }}
              />
            ))}
          </div>

          <div className="layout-loading-content">
            {/* Logo with rings */}
            <div className="layout-loading-logo-wrapper">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="layout-loading-ring"
                  style={{
                    inset: `${-12 - i * 8}px`,
                    borderColor: `rgba(255,255,255,${0.15 - i * 0.04})`,
                    borderTopColor: i === 0 ? '#a5b4fc' : i === 1 ? '#6366f1' : '#818cf8',
                    animationDuration: `${2 - i * 0.3}s`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
              <div className="layout-loading-logo">
                <span className="layout-loading-emoji">🚗</span>
              </div>
              <div className="layout-loading-orbit-dot" />
            </div>

            <h2 className="layout-loading-brand">
              Auto<span className="layout-loading-brand-accent">Bill</span> Pro
            </h2>
            <p className="layout-loading-subtitle">
              Preparing your workspace...
            </p>

            {/* Progress bar */}
            <div className="layout-loading-progress-track">
              <div
                className="layout-loading-progress-fill"
                style={{ width: `${Math.min(loadProgress, 100)}%` }}
              />
            </div>
            <span className="layout-loading-percent">
              {Math.round(Math.min(loadProgress, 100))}%
            </span>

            {/* Wave bars */}
            <div className="layout-loading-waves">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="layout-loading-wave-bar"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!user) return null;

  // ── Main Layout ──
  return (
    <>
      <LayoutCSS />

      <div className="layout-root">
        <div className="layout-bg-pattern" />

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div
          className="layout-main-wrapper"
          style={{
            marginLeft: `${sidebarWidth}px`,
            transition: 'margin-left 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <Navbar
            user={user}
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className={`layout-page-transition ${pageTransition ? 'active' : ''}`} />

          <main className="layout-content">
            <div className={`layout-content-inner ${pageTransition ? 'transitioning' : 'visible'}`}>
              {children}
            </div>
          </main>

          <footer className="layout-footer">
            <div className="layout-footer-gradient-line" />
            <div className="layout-footer-inner">
              <div className="layout-footer-left">
                <div className="layout-footer-status">
                  <div className="layout-footer-status-dot" />
                  <span>System Online</span>
                </div>
                <span className="layout-footer-divider">·</span>
                <p className="layout-footer-copyright">
                  © {new Date().getFullYear()} AutoBill Pro
                </p>
              </div>
              <div className="layout-footer-links">
                {[
                  { label: 'Privacy', icon: '🔒' },
                  { label: 'Terms', icon: '📄' },
                  { label: 'Support', icon: '💬' },
                ].map((link) => (
                  <FooterLink key={link.label} {...link} />
                ))}
              </div>
            </div>
          </footer>
        </div>

        <ScrollToTopButton />
      </div>
    </>
  );
}

// ── Footer Link ──
function FooterLink({ label, icon }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href="#"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="layout-footer-link"
      style={{
        color: hovered ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
        background: hovered ? 'rgba(99,102,241,0.1)' : 'transparent',
        borderColor: hovered ? 'rgba(99,102,241,0.2)' : 'transparent',
      }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      {label}
    </a>
  );
}

// ── Scroll to Top ──
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="layout-scroll-top"
      style={{
        background: hovered ? 'rgba(99,102,241,0.3)' : 'rgba(15,23,42,0.8)',
        borderColor: hovered ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <svg
        style={{ width: 18, height: 18, color: hovered ? '#a5b4fc' : 'rgba(255,255,255,0.6)' }}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

// ── Styles (using dangerouslySetInnerHTML to avoid styled-jsx issues) ──
function LayoutCSS() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      *, *::before, *::after { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; padding: 0; }

      /* ═══ LOADING ═══ */
      .layout-loading-screen {
        min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        position: relative; overflow: hidden; background: #0a0e1a;
      }
      .layout-loading-bg {
        position: absolute; inset: 0;
        background: linear-gradient(135deg, #0c1222 0%, #1e1b4b 35%, #1e3a5f 65%, #0c1222 100%);
        background-size: 400% 400%;
        animation: layoutGrad 12s ease infinite;
      }
      @keyframes layoutGrad {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      .layout-loading-particles {
        position: absolute; inset: 0; pointer-events: none;
      }
      .layout-particle {
        position: absolute;
        background: rgba(147, 197, 253, 0.3);
        border-radius: 50%;
        animation: layoutFloat linear infinite;
      }
      @keyframes layoutFloat {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100vh) translateX(30px); opacity: 0; }
      }

      .layout-loading-content {
        text-align: center; position: relative; z-index: 1;
        padding: 20px; max-width: 320px; width: 100%;
      }

      .layout-loading-logo-wrapper {
        width: clamp(70px, 18vw, 90px);
        height: clamp(70px, 18vw, 90px);
        position: relative; margin: 0 auto 28px;
      }
      .layout-loading-ring {
        position: absolute; border: 2px solid; border-radius: 50%;
        animation: layoutSpin linear infinite;
      }
      @keyframes layoutSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

      .layout-loading-logo {
        position: absolute; inset: 0; border-radius: 22px;
        background: linear-gradient(135deg, rgba(99,102,241,.2), rgba(6,182,212,.15));
        border: 1px solid rgba(255,255,255,.1);
        backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        animation: layoutPulse 2.5s ease-in-out infinite;
      }
      @keyframes layoutPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(99,102,241,.15); }
        50% { transform: scale(1.04); box-shadow: 0 0 40px rgba(99,102,241,.25); }
      }
      .layout-loading-emoji {
        font-size: clamp(30px, 8vw, 38px);
        animation: layoutCar 2s ease-in-out infinite;
      }
      @keyframes layoutCar {
        0%, 100% { transform: translateX(-3px) rotate(-1deg); }
        50% { transform: translateX(3px) rotate(1deg); }
      }
      .layout-loading-orbit-dot {
        position: absolute; width: 6px; height: 6px;
        background: #818cf8; border-radius: 50%;
        box-shadow: 0 0 8px rgba(129,140,248,.6);
        animation: layoutOrbit 3s linear infinite;
      }
      @keyframes layoutOrbit {
        from { transform: rotate(0deg) translateX(clamp(42px,11vw,55px)) rotate(0deg); }
        to   { transform: rotate(360deg) translateX(clamp(42px,11vw,55px)) rotate(-360deg); }
      }

      .layout-loading-brand {
        font-size: clamp(22px, 6vw, 28px);
        font-weight: 800; color: white;
        margin: 0 0 6px; letter-spacing: -0.5px;
      }
      .layout-loading-brand-accent {
        background: linear-gradient(135deg, #818cf8, #06b6d4);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .layout-loading-subtitle {
        color: rgba(255,255,255,.45);
        font-size: clamp(12px, 3vw, 14px);
        font-weight: 500; margin: 0 0 28px;
      }

      .layout-loading-progress-track {
        width: 100%; max-width: 220px; height: 4px;
        background: rgba(255,255,255,.08);
        border-radius: 2px; margin: 0 auto 12px;
        overflow: hidden; position: relative;
      }
      .layout-loading-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #06b6d4);
        border-radius: 2px; transition: width 0.3s ease;
      }
      .layout-loading-percent {
        font-size: 11px; font-weight: 700;
        color: rgba(255,255,255,.3);
        letter-spacing: 1px; display: block;
        margin-bottom: 20px;
      }

      .layout-loading-waves {
        display: flex; gap: 3px; justify-content: center;
      }
      .layout-loading-wave-bar {
        width: 3px; height: 20px; border-radius: 2px;
        background: linear-gradient(to top, #6366f1, #06b6d4);
        animation: layoutWave 1s ease-in-out infinite;
      }
      @keyframes layoutWave {
        0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
        50% { transform: scaleY(1.2); opacity: 1; }
      }

      /* ═══ MAIN LAYOUT ═══ */
      .layout-root {
        min-height: 100vh; background: #0a0e1a;
        position: relative;
      }
      .layout-bg-pattern {
        position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background-image:
          linear-gradient(rgba(99,102,241,.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,.02) 1px, transparent 1px);
        background-size: 60px 60px;
      }
      .layout-main-wrapper {
        min-height: 100vh;
        display: flex; flex-direction: column;
        position: relative; z-index: 1;
      }

      /* page transition bar */
      .layout-page-transition {
        position: fixed; top: 0; left: 0; right: 0;
        height: 3px; z-index: 9999;
        background: transparent; pointer-events: none;
      }
      .layout-page-transition.active {
        background: linear-gradient(90deg, #6366f1, #06b6d4, #6366f1);
        background-size: 200% 100%;
        animation: layoutPageBar 0.8s ease;
      }
      @keyframes layoutPageBar {
        0%   { transform: scaleX(0); transform-origin: left; opacity: 1; }
        50%  { transform: scaleX(1); transform-origin: left; opacity: 1; }
        100% { transform: scaleX(1); transform-origin: left; opacity: 0; }
      }

      /* content */
      .layout-content {
        flex: 1; padding: clamp(12px, 2.5vw, 28px);
      }
      .layout-content-inner {
        max-width: 1600px; margin: 0 auto;
        transition: opacity .3s ease, transform .3s ease;
      }
      .layout-content-inner.visible {
        opacity: 1; transform: translateY(0);
        animation: layoutContentIn .45s cubic-bezier(.4,0,.2,1);
      }
      .layout-content-inner.transitioning {
        opacity: 0.5; transform: translateY(4px);
      }
      @keyframes layoutContentIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ═══ FOOTER ═══ */
      .layout-footer {
        position: relative;
        padding: 14px clamp(12px, 2.5vw, 24px);
        background: rgba(12,18,34,.6);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      .layout-footer-gradient-line {
        position: absolute; top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(99,102,241,.3), rgba(6,182,212,.2), transparent);
      }
      .layout-footer-inner {
        max-width: 1600px; margin: 0 auto;
        display: flex; align-items: center;
        justify-content: space-between;
        gap: 12px; flex-wrap: wrap;
      }
      .layout-footer-left {
        display: flex; align-items: center;
        gap: 10px; flex-wrap: wrap;
      }
      .layout-footer-status {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 3px 10px;
        background: rgba(16,185,129,.08);
        border: 1px solid rgba(16,185,129,.15);
        border-radius: 100px;
        font-size: 10px; font-weight: 600; color: #6ee7b7;
      }
      .layout-footer-status-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 6px rgba(16,185,129,.5);
        animation: layoutStatusPulse 2s ease-in-out infinite;
      }
      @keyframes layoutStatusPulse { 0%,100%{opacity:1} 50%{opacity:.5} }

      .layout-footer-divider {
        color: rgba(255,255,255,.15); font-size: 14px;
      }
      .layout-footer-copyright {
        margin: 0; font-size: 12px;
        color: rgba(255,255,255,.25); font-weight: 500;
      }
      .layout-footer-links {
        display: flex; align-items: center;
        gap: 6px; flex-wrap: wrap;
      }
      .layout-footer-link {
        display: inline-flex; align-items: center;
        gap: 4px; padding: 4px 10px; border-radius: 8px;
        font-size: 11px; font-weight: 600;
        text-decoration: none;
        border: 1px solid transparent;
        transition: all .25s ease;
      }

      /* scroll to top */
      .layout-scroll-top {
        position: fixed; bottom: 24px; right: 24px;
        z-index: 40; width: 40px; height: 40px;
        border-radius: 12px; border: 1px solid;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: 0 8px 24px rgba(0,0,0,.3);
        transition: all .3s ease;
        animation: layoutScrollIn .3s ease;
      }
      @keyframes layoutScrollIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* scrollbar */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: rgba(15,23,42,.5); }
      ::-webkit-scrollbar-thumb { background: rgba(99,102,241,.25); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,.45); }

      /* responsive */
      @media (max-width: 640px) {
        .layout-footer-inner {
          flex-direction: column; text-align: center;
        }
        .layout-footer-left { justify-content: center; }
        .layout-footer-links { justify-content: center; }
        .layout-scroll-top {
          bottom: 16px; right: 16px;
          width: 36px; height: 36px;
        }
      }
    `}} />
  );
}