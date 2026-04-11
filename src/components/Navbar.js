// src/components/Navbar.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── CSS (no styled-jsx) ────────────────────────────────────
const NAVBAR_CSS = `
  @keyframes nb-drop-in  { from{opacity:0;transform:translateY(-8px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes nb-badge-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
  @keyframes nb-notif-in  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes nb-bar-scan  { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }

  .nb-dropdown  { animation: nb-drop-in .28s cubic-bezier(.4,0,.2,1); }
  .nb-icon-btn:hover {
    background:rgba(255,255,255,.09)!important;
    border-color:rgba(255,255,255,.15)!important;
    color:rgba(255,255,255,.85)!important;
  }
  .nb-notif-item:hover { background:rgba(255,255,255,.045)!important; }
  .nb-logout-row:hover  { background:rgba(239,68,68,.09)!important; }
  .nb-badge-anim        { animation: nb-badge-pulse 2.2s ease-in-out infinite; }
  .nb-notif-appear      { animation: nb-notif-in .28s ease backwards; }
`;

function NavbarCSS() {
  return <style dangerouslySetInnerHTML={{ __html: NAVBAR_CSS }} />;
}

// ─── Role configs ──────────────────────────────────────────
const RC = {
  SUPER_ADMIN : { label:'Super Admin', short:'Admin',   icon:'👑', g:'linear-gradient(135deg,#7c3aed,#5b21b6)', c:'#a78bfa', dim:'rgba(167,139,250,.12)', glow:'rgba(124,58,237,.4)' },
  MANAGER     : { label:'Manager',     short:'Manager', icon:'👔', g:'linear-gradient(135deg,#3b82f6,#1d4ed8)', c:'#93c5fd', dim:'rgba(147,197,253,.12)', glow:'rgba(59,130,246,.4)'  },
  EMPLOYEE    : { label:'Technician',  short:'Tech',    icon:'🔧', g:'linear-gradient(135deg,#10b981,#059669)', c:'#6ee7b7', dim:'rgba(110,231,183,.12)', glow:'rgba(16,185,129,.4)'  },
  CASHIER     : { label:'Cashier',     short:'Cashier', icon:'💰', g:'linear-gradient(135deg,#f59e0b,#d97706)', c:'#fcd34d', dim:'rgba(252,211,77,.12)',  glow:'rgba(245,158,11,.4)'  },
};

// ─── Notification colour map ───────────────────────────────
const N_COLOR = {
  INVENTORY_REQUEST:'#3b82f6', INVENTORY_APPROVED:'#10b981', INVENTORY_REJECTED:'#ef4444',
  TRANSFER_REQUEST:'#8b5cf6',  TRANSFER_APPROVED:'#10b981',  TRANSFER_REJECTED:'#ef4444',
  TRANSFER_SENT:'#6366f1',     TRANSFER_RECEIVED:'#10b981',  JOB_ASSIGNED:'#f59e0b',
  JOB_UPDATED:'#3b82f6',       LOW_STOCK:'#f59e0b',          GENERAL:'#6b7280',
};
const N_ICON = {
  INVENTORY_REQUEST:'📋', INVENTORY_APPROVED:'✅', INVENTORY_REJECTED:'❌',
  TRANSFER_REQUEST:'🔄',  TRANSFER_APPROVED:'✅',  TRANSFER_REJECTED:'❌',
  TRANSFER_SENT:'🚚',     TRANSFER_RECEIVED:'📦', JOB_ASSIGNED:'🔧',
  JOB_UPDATED:'📝',       LOW_STOCK:'⚠️',         GENERAL:'🔔',
};

// ─── Helpers ───────────────────────────────────────────────
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
};

// ══════════════════════════════════════════════════════════
// MAIN NAVBAR
// ══════════════════════════════════════════════════════════
export default function Navbar({ user, onMenuClick }) {
  const [ddOpen,   setDdOpen  ] = useState(false);
  const [screen,   setScreen  ] = useState('desktop');
  const [scrolled, setScrolled] = useState(false);
  const ddRef  = useRef(null);
  const router = useRouter();

  const rc       = RC[user?.role] || RC.EMPLOYEE;
  const isMobile = screen === 'mobile';
  const isTablet = screen === 'tablet';

  /* screen size */
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setScreen(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive:true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* click-outside dropdown */
  useEffect(() => {
    const fn = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    };
    if (ddOpen) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ddOpen]);

  /* logout */
  const handleLogout = async () => {
    try {
      const r = await fetch('/api/auth/logout', { method:'POST' });
      if (r.ok) {
        localStorage.removeItem('user');
        toast.success('Logged out successfully');
        router.push('/login');
      }
    } catch { toast.error('Logout failed'); }
  };

  return (
    <>
      <NavbarCSS />

      <nav style={{
        height: isMobile ? 60 : 68,
        padding: isMobile ? '0 12px' : '0 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:30,
        background: scrolled ? 'rgba(11,17,32,.88)' : 'rgba(11,17,32,.62)',
        backdropFilter:'blur(22px)',
        WebkitBackdropFilter:'blur(22px)',
        borderBottom:`1px solid rgba(255,255,255,${scrolled?.07:.04})`,
        transition:'all .3s ease',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,.35)' : 'none',
      }}>

        {/* ── scrolled indicator bar ── */}
        {scrolled && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:1,
            background:'linear-gradient(90deg,transparent,rgba(99,102,241,.35),rgba(6,182,212,.2),transparent)',
            pointerEvents:'none',
          }}/>
        )}

        {/* ════ LEFT ════ */}
        <div style={{ display:'flex', alignItems:'center', gap:isMobile?10:16, flex:1, minWidth:0 }}>

          {/* hamburger (mobile/tablet) */}
          {(isMobile||isTablet) && (
            <button
              onClick={onMenuClick}
              className="nb-icon-btn"
              style={{
                width:isMobile?36:40, height:isMobile?36:40,
                borderRadius:10, flexShrink:0,
                border:'1px solid rgba(255,255,255,.07)',
                background:'rgba(255,255,255,.04)',
                cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'rgba(255,255,255,.6)',
                transition:'all .2s',
              }}
            >
              <HamburgerIcon size={isMobile?20:22}/>
            </button>
          )}

          {/* greeting */}
          <div style={{ flex:1, minWidth:0 }}>
            <h2 style={{
              margin:0, fontWeight:700, color:'white',
              fontSize: isMobile?15:isTablet?17:19,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              display:'flex', alignItems:'center', gap:7,
            }}>
              {isMobile
                ? `Hi, ${user?.name?.split(' ')[0]}`
                : `${greeting()}, ${user?.name?.split(' ')[0]}`}
              {!isMobile && <span style={{ fontSize:17 }}>👋</span>}
            </h2>

            {!isMobile && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                <RoleBadge rc={rc} label={isTablet ? rc.short : rc.label}/>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.25)', fontWeight:500 }}>
                  {new Date().toLocaleDateString('en-IN',{
                    weekday:'short', day:'numeric', month:'short',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT ════ */}
        <div style={{ display:'flex', alignItems:'center', gap:isMobile?6:8 }}>

          {/* search (desktop) */}
          {!isMobile && !isTablet && (
            <button className="nb-icon-btn" style={iconBtnStyle}>
              <svg style={{ width:17,height:17 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
          )}

          {/* notification bell */}
          <NotifBell screen={screen} rc={rc}/>

          {/* user dropdown */}
          <div ref={ddRef} style={{ position:'relative' }}>
            <UserButton
              user={user} rc={rc}
              open={ddOpen} isMobile={isMobile} isTablet={isTablet}
              onClick={() => setDdOpen(p=>!p)}
            />

            {ddOpen && (
              <UserDropdown
                user={user} rc={rc}
                isMobile={isMobile} isTablet={isTablet}
                onLogout={handleLogout}
                onClose={() => setDdOpen(false)}
              />
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

// ─── Icon button base style ─────────────────────────────────
const iconBtnStyle = {
  width:38, height:38, borderRadius:10,
  border:'1px solid rgba(255,255,255,.06)',
  background:'rgba(255,255,255,.03)',
  cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  color:'rgba(255,255,255,.45)',
  transition:'all .2s',
};

// ─── Small helpers ──────────────────────────────────────────
function HamburgerIcon({ size=22 }) {
  return (
    <svg style={{ width:size,height:size }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  );
}

function RoleBadge({ rc, label }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 9px', borderRadius:7,
      background:rc.dim, border:`1px solid ${rc.c}20`,
      fontSize:11, fontWeight:700, color:rc.c,
    }}>
      <span style={{ fontSize:11 }}>{rc.icon}</span>
      {label}
    </span>
  );
}

// ─── User avatar button ─────────────────────────────────────
function UserButton({ user, rc, open, isMobile, isTablet, onClick }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center',
        gap: isMobile ? 0 : 9,
        padding: isMobile ? 3 : '5px 10px',
        borderRadius:13,
        border:`1.5px solid ${(open||hov) ? `${rc.c}50` : 'transparent'}`,
        background:(open||hov) ? rc.dim : 'transparent',
        cursor:'pointer',
        transition:'all .28s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* avatar */}
      <div style={{
        width: isMobile?34:38, height:isMobile?34:38,
        borderRadius:11,
        background:rc.g,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'white', fontWeight:800,
        fontSize: isMobile?14:15,
        boxShadow:`0 4px 14px ${rc.glow}`,
        border:'2px solid rgba(255,255,255,.13)',
        flexShrink:0,
        transition:'box-shadow .3s',
      }}>
        {user?.name?.charAt(0).toUpperCase()}
      </div>

      {!isMobile && (
        <>
          <div style={{ textAlign:'left' }}>
            <span style={{ display:'block', color:'white', fontWeight:600, fontSize:13, lineHeight:1.2 }}>
              {isTablet ? user?.name?.split(' ')[0] : user?.name}
            </span>
            {!isTablet && (
              <span style={{ display:'block', fontSize:10, color:rc.c, fontWeight:600, marginTop:1 }}>
                {rc.label}
              </span>
            )}
          </div>
          <svg style={{
            width:13,height:13,
            color:'rgba(255,255,255,.3)',
            transition:'transform .3s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
          </svg>
        </>
      )}
    </button>
  );
}

// ─── User dropdown ──────────────────────────────────────────
function UserDropdown({ user, rc, isMobile, isTablet, onLogout, onClose }) {
  const [logHov, setLogHov] = useState(false);

  return (
    <div
      className="nb-dropdown"
      style={{
        position:'absolute',
        right: isMobile ? -10 : 0,
        top:'calc(100% + 10px)',
        width: isMobile ? 'calc(100vw - 32px)' : isTablet ? 284 : 316,
        maxWidth:320,
        background:'rgba(13,19,36,.97)',
        backdropFilter:'blur(22px)',
        WebkitBackdropFilter:'blur(22px)',
        borderRadius:20,
        border:'1px solid rgba(255,255,255,.08)',
        boxShadow:'0 32px 64px rgba(0,0,0,.6)',
        overflow:'hidden', zIndex:60,
      }}
    >
      {/* gradient header */}
      <div style={{
        padding: isMobile ? 16 : 20,
        background:rc.g,
        position:'relative', overflow:'hidden',
      }}>
        {/* decorative orbs */}
        {[['-20px','-20px',80,'rgba(255,255,255,.1)'],['-30px','auto','auto','-30px',100,'rgba(255,255,255,.06)']].map((_,i)=>(
          <div key={i} style={{
            position:'absolute',
            top: i===0?-22:'auto', right:i===0?-22:'auto',
            bottom:i===1?-30:'auto', left:i===1?-30:'auto',
            width: i===0?80:100, height:i===0?80:100,
            borderRadius:'50%',
            background: i===0?'rgba(255,255,255,.1)':'rgba(255,255,255,.06)',
            pointerEvents:'none',
          }}/>
        ))}

        <div style={{ display:'flex', alignItems:'center', gap:13, position:'relative', zIndex:1 }}>
          {/* avatar */}
          <div style={{
            width:50,height:50, borderRadius:16,
            background:'rgba(255,255,255,.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'white', fontWeight:800, fontSize:20,
            border:'2px solid rgba(255,255,255,.28)',
            flexShrink:0,
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <p style={{
              color:'white', fontWeight:800, fontSize:15, margin:0,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>
              {user?.name}
            </p>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:4,
              marginTop:5, padding:'2px 8px',
              background:'rgba(255,255,255,.2)', borderRadius:6,
              fontSize:11, fontWeight:700, color:'white',
            }}>
              {rc.icon} {rc.label}
            </span>
          </div>
        </div>

        <p style={{
          color:'rgba(255,255,255,.65)', fontSize:12, margin:'10px 0 0',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          position:'relative', zIndex:1,
        }}>
          📧 {user?.email}
        </p>
      </div>

      {/* actions */}
      <div style={{ padding:8 }}>
        <button
          onClick={onLogout}
          onMouseEnter={() => setLogHov(true)}
          onMouseLeave={() => setLogHov(false)}
          className="nb-logout-row"
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:13,
            padding:'13px 15px', border:'none',
            background: logHov ? 'rgba(239,68,68,.09)' : 'transparent',
            cursor:'pointer', borderRadius:12,
            color:'#f87171', fontWeight:600, fontSize:14,
            transition:'all .2s',
          }}
        >
          <div style={{
            width:38,height:38, borderRadius:10,
            background:'rgba(239,68,68,.1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>
            <svg style={{ width:18,height:18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </div>
          <div style={{ textAlign:'left' }}>
            <span style={{ display:'block' }}>Logout</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.28)', fontWeight:400 }}>
              Sign out of your account
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// NOTIFICATION BELL
// ══════════════════════════════════════════════════════════
function NotifBell({ screen, rc }) {
  const [notifs,  setNotifs ] = useState([]);
  const [unread,  setUnread ] = useState(0);
  const [open,    setOpen   ] = useState(false);
  const ref    = useRef(null);
  const router = useRouter();

  const isMobile = screen === 'mobile';
  const isTablet = screen === 'tablet';

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications?limit=20');
      const d = await r.json();
      if (d.success) { setNotifs(d.data||[]); setUnread(d.unreadCount||0); }
    } catch {}
  }, []);

  useEffect(() => {
    fetch_();
    const t = setInterval(fetch_, 30000);
    return () => clearInterval(t);
  }, [fetch_]);

  useEffect(() => {
    const fn = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const markRead = async (ids) => {
    try {
      await fetch('/api/notifications',{
        method:'PUT', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ notificationIds:ids }),
      });
      fetch_();
    } catch {}
  };

  const markAll = async () => {
    try {
      await fetch('/api/notifications',{
        method:'PUT', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ markAll:true }),
      });
      fetch_();
    } catch {}
  };

  const handleNotifClick = (n) => {
    if (!n.isRead) markRead([n.id]);
    const routes = {
      InventoryRequest:'/inventory-requests',
      InventoryTransfer:'/inventory-transfers',
      Job:'/jobs',
    };
    if (routes[n.entityType]) router.push(routes[n.entityType]);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* bell button */}
      <button
        onClick={() => setOpen(p=>!p)}
        className="nb-icon-btn"
        style={{
          ...iconBtnStyle,
          position:'relative',
          width: isMobile?36:38, height:isMobile?36:38,
          background: open ? rc.dim : 'rgba(255,255,255,.03)',
          border:`1.5px solid ${open ? `${rc.c}45` : 'rgba(255,255,255,.07)'}`,
          color: open ? rc.c : 'rgba(255,255,255,.5)',
        }}
      >
        <svg style={{ width:isMobile?18:19,height:isMobile?18:19 }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>

        {unread > 0 && (
          <span
            className="nb-badge-anim"
            style={{
              position:'absolute', top:3, right:3,
              minWidth:15, height:15, borderRadius:8,
              background:'#ef4444', color:'white',
              fontSize:8.5, fontWeight:800,
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:'0 3px',
              border:'2px solid #0b1120',
              boxShadow:'0 2px 8px rgba(239,68,68,.55)',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* dropdown */}
      {open && (
        <div
          className="nb-dropdown"
          style={{
            position:'absolute',
            top:'calc(100% + 10px)',
            right: isMobile ? -55 : isTablet ? -25 : 0,
            width: isMobile ? 'calc(100vw - 20px)' : isTablet ? 355 : 395,
            maxWidth:400,
            maxHeight: isMobile ? '72vh' : 530,
            background:'rgba(13,19,36,.97)',
            backdropFilter:'blur(22px)',
            WebkitBackdropFilter:'blur(22px)',
            borderRadius:20,
            border:'1px solid rgba(255,255,255,.08)',
            boxShadow:'0 32px 64px rgba(0,0,0,.6)',
            overflow:'hidden', zIndex:100,
            display:'flex', flexDirection:'column',
          }}
        >
          {/* header */}
          <div style={{
            padding: isMobile?'13px 16px':'15px 20px',
            borderBottom:'1px solid rgba(255,255,255,.06)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            flexShrink:0,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <h3 style={{ fontSize:isMobile?15:16, fontWeight:800, color:'white', margin:0 }}>
                Notifications
              </h3>
              {unread > 0 && (
                <span style={{
                  padding:'2px 9px', borderRadius:10,
                  background:rc.g, color:'white',
                  fontSize:11, fontWeight:800,
                }}>
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); markAll(); }}
                style={{
                  fontSize:12, color:rc.c,
                  background:rc.dim, border:'none',
                  cursor:'pointer', fontWeight:700,
                  padding:'5px 11px', borderRadius:8,
                  transition:'all .2s',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* list */}
          <div style={{
            overflowY:'auto', flex:1,
            maxHeight: isMobile ? 'calc(72vh - 130px)' : 380,
          }}>
            {notifs.length === 0 ? (
              <div style={{ padding:'52px 20px', textAlign:'center' }}>
                <div style={{
                  width:64,height:64, borderRadius:18,
                  background:rc.dim,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 16px', fontSize:30,
                }}>
                  🔔
                </div>
                <p style={{ margin:0, fontWeight:700, fontSize:15, color:'white', marginBottom:4 }}>
                  All caught up!
                </p>
                <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,.33)' }}>
                  No new notifications
                </p>
              </div>
            ) : (
              notifs.map((n, i) => {
                const nc = N_COLOR[n.type] || '#6b7280';
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="nb-notif-item nb-notif-appear"
                    style={{
                      padding: isMobile?'12px 16px':'13px 20px',
                      borderBottom: i < notifs.length-1
                        ? '1px solid rgba(255,255,255,.04)' : 'none',
                      cursor:'pointer',
                      background: n.isRead
                        ? 'transparent'
                        : `linear-gradient(90deg,${nc}09,transparent)`,
                      transition:'all .2s',
                      position:'relative',
                      animationDelay:`${i*.04}s`,
                    }}
                  >
                    {/* unread accent */}
                    {!n.isRead && (
                      <div style={{
                        position:'absolute', left:0, top:'18%',
                        width:3, height:'64%',
                        background:nc, borderRadius:'0 3px 3px 0',
                        boxShadow:`0 0 7px ${nc}55`,
                      }}/>
                    )}

                    <div style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                      {/* icon chip */}
                      <div style={{
                        width:40,height:40, borderRadius:12,
                        background:`${nc}14`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:18, flexShrink:0,
                      }}>
                        {N_ICON[n.type]||'🔔'}
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{
                          fontSize: isMobile?12:13,
                          fontWeight: n.isRead?500:700,
                          color:'white', margin:'0 0 3px', lineHeight:1.4,
                        }}>
                          {n.title}
                        </p>
                        <p style={{
                          fontSize: isMobile?11:12,
                          color:'rgba(255,255,255,.38)',
                          margin:'0 0 5px', lineHeight:1.4,
                          display:'-webkit-box',
                          WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                          overflow:'hidden',
                        }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize:10, color:'rgba(255,255,255,.22)', fontWeight:500 }}>
                          🕐 {timeAgo(n.createdAt)}
                        </span>
                      </div>

                      {!n.isRead && (
                        <div style={{
                          width:8,height:8, borderRadius:'50%',
                          background:nc, flexShrink:0, marginTop:4,
                          boxShadow:`0 0 0 3px ${nc}22`,
                        }}/>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* footer */}
          {notifs.length > 0 && (
            <div style={{
              padding:'11px 20px',
              borderTop:'1px solid rgba(255,255,255,.05)',
              textAlign:'center', flexShrink:0,
            }}>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                style={{
                  fontSize:13, color:rc.c, fontWeight:700,
                  textDecoration:'none',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                }}
              >
                View all notifications
                <svg style={{ width:13,height:13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}