// src/components/Sidebar.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Keyframes injected once ───────────────────────────────
const SIDEBAR_CSS = `
  @keyframes sb-fade-in   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes sb-slide-up  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sb-tooltip   { from{opacity:0;transform:translateY(-50%) translateX(-6px)} to{opacity:1;transform:translateY(-50%) translateX(0)} }
  @keyframes sb-overlay   { from{opacity:0} to{opacity:1} }
  @keyframes sb-badge-pop { 0%{transform:scale(0)} 60%{transform:scale(1.25)} 100%{transform:scale(1)} }
  @keyframes sb-glow-pulse{ 0%,100%{opacity:.06} 50%{opacity:.14} }
  @keyframes sb-online-ping{ 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.8);opacity:0} }

  .sb-overlay   { animation: sb-overlay .28s ease; }
  .sb-badge     { animation: sb-badge-pop .3s cubic-bezier(.4,0,.2,1); }

  .sb-collapse-btn:hover  { background:rgba(255,255,255,.09)!important; border-color:rgba(255,255,255,.18)!important; }
  .sb-logout-btn:hover    { background:rgba(239,68,68,.12)!important; color:#f87171!important; }
  .sb-logo-icon           { transition:transform .35s ease; }
  .sb-logo-icon:hover     { transform:rotate(-6deg) scale(1.08); }
  .sb-avatar:hover        { transform:scale(1.06); }

  /* nav link base */
  .sb-link { transition:all .22s cubic-bezier(.4,0,.2,1); }
  .sb-link:hover { background:rgba(255,255,255,.055)!important; }

  /* scrollbar */
  .sb-nav::-webkit-scrollbar        { width:3px; }
  .sb-nav::-webkit-scrollbar-track  { background:transparent; }
  .sb-nav::-webkit-scrollbar-thumb  { background:rgba(255,255,255,.07); border-radius:2px; }
  .sb-nav::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.15); }

  @media(max-width:640px){ .sb-link:hover{ background:transparent!important; } }
`;

function SidebarCSS() {
  return <style dangerouslySetInnerHTML={{ __html: SIDEBAR_CSS }} />;
}

// ─── role configs ──────────────────────────────────────────
const ROLES = {
  SUPER_ADMIN : { label:'Super Admin', icon:'👑', g:'linear-gradient(135deg,#7c3aed,#5b21b6)', c:'#a78bfa', dim:'rgba(167,139,250,.15)', glow:'rgba(124,58,237,.45)' },
  MANAGER     : { label:'Manager',     icon:'👔', g:'linear-gradient(135deg,#3b82f6,#1d4ed8)', c:'#93c5fd', dim:'rgba(147,197,253,.15)', glow:'rgba(59,130,246,.45)'  },
  EMPLOYEE    : { label:'Technician',  icon:'🔧', g:'linear-gradient(135deg,#10b981,#059669)', c:'#6ee7b7', dim:'rgba(110,231,183,.15)', glow:'rgba(16,185,129,.45)'  },
  CASHIER     : { label:'Cashier',     icon:'💰', g:'linear-gradient(135deg,#f59e0b,#d97706)', c:'#fcd34d', dim:'rgba(252,211,77,.15)',  glow:'rgba(245,158,11,.45)'  },
};

const CAT_META = {
  main       : { label:null },
  management : { label:'Management' },
  crm        : { label:'Customers'  },
  operations : { label:'Operations' },
  inventory  : { label:'Inventory'  },
  billing    : { label:'Billing'    },
  analytics  : { label:'Analytics'  },
};

const NAV_ITEMS = {
  SUPER_ADMIN:[
    {name:'Dashboard',     href:'/dashboard',          icon:'🏠',cat:'main'},
    {name:'Users',         href:'/users',              icon:'👥',cat:'management'},
    {name:'Branches',      href:'/branches',           icon:'🏢',cat:'management'},
    {name:'Customers',     href:'/customers',          icon:'🧑‍🤝‍🧑',cat:'crm'},
    {name:'Vehicles',      href:'/vehicles',           icon:'🚗',cat:'crm'},
    {name:'Jobs',          href:'/jobs',               icon:'🔧',cat:'operations'},
    {name:'Inventory',     href:'/inventory',          icon:'📦',cat:'inventory'},
    {name:'Part Requests', href:'/inventory-requests', icon:'📋',cat:'inventory',badge:'req'},
    {name:'Transfers',     href:'/inventory-transfers',icon:'🔄',cat:'inventory',badge:'trn'},
    {name:'Invoices',      href:'/invoices',           icon:'📄',cat:'billing'},
    {name:'Payments',      href:'/payments',           icon:'💳',cat:'billing'},
    {name:'Reports',       href:'/reports',            icon:'📊',cat:'analytics'},
  ],
  MANAGER:[
    {name:'Dashboard',     href:'/dashboard',          icon:'🏠',cat:'main'},
    {name:'Team',          href:'/users',              icon:'👥',cat:'management'},
    {name:'Customers',     href:'/customers',          icon:'🧑‍🤝‍🧑',cat:'crm'},
    {name:'Vehicles',      href:'/vehicles',           icon:'🚗',cat:'crm'},
    {name:'Jobs',          href:'/jobs',               icon:'🔧',cat:'operations'},
    {name:'Inventory',     href:'/inventory',          icon:'📦',cat:'inventory'},
    {name:'Part Requests', href:'/inventory-requests', icon:'📋',cat:'inventory',badge:'req'},
    {name:'Transfers',     href:'/inventory-transfers',icon:'🔄',cat:'inventory',badge:'trn'},
    {name:'Invoices',      href:'/invoices',           icon:'📄',cat:'billing'},
    {name:'Reports',       href:'/reports',            icon:'📊',cat:'analytics'},
  ],
  // ✅ UPDATED: Added Customers link for EMPLOYEE role
  EMPLOYEE:[
    {name:'Dashboard',   href:'/dashboard',          icon:'🏠',cat:'main'},
    {name:'Customers',   href:'/customers',          icon:'🧑‍🤝‍🧑',cat:'crm'},
    {name:'Vehicles',    href:'/vehicles',           icon:'🚗',cat:'crm'},
    {name:'My Jobs',     href:'/jobs',               icon:'🔧',cat:'operations'},
    {name:'Inventory',   href:'/inventory',          icon:'📦',cat:'inventory'},
    {name:'My Requests', href:'/inventory-requests', icon:'📋',cat:'inventory',badge:'req'},
  ],
  CASHIER:[
    {name:'Dashboard', href:'/dashboard', icon:'🏠',cat:'main'},
    {name:'Customers', href:'/customers', icon:'🧑‍🤝‍🧑',cat:'crm'},
    {name:'Invoices',  href:'/invoices',  icon:'📄',cat:'billing'},
    {name:'Payments',  href:'/payments',  icon:'💳',cat:'billing'},
    {name:'Reports',   href:'/reports',   icon:'📊',cat:'analytics'},
  ],
};

// ─── Main component ────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user,            setUser           ] = useState(null);
  const [collapsed,       setCollapsed      ] = useState(false);
  const [screen,          setScreen         ] = useState('desktop');
  const [hovered,         setHovered        ] = useState(null);
  const [openCats,        setOpenCats       ] = useState({});
  const [mounted,         setMounted        ] = useState(false);

  /* ── bootstrap ── */
  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem('user');
    if (raw) setUser(JSON.parse(raw));
  }, []);

  /* ── screen size ── */
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setScreen(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ── close on nav (mobile/tablet) ── */
  useEffect(() => {
    if (screen !== 'desktop' && isOpen) onClose?.();
  }, [pathname]); // eslint-disable-line

  /* ── logout ── */
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method:'POST' });
      localStorage.removeItem('user');
      router.push('/login');
    } catch(e) { console.error(e); }
  };

  const rc         = ROLES[user?.role] || ROLES.EMPLOYEE;
  const isMobile   = screen === 'mobile';
  const isTablet   = screen === 'tablet';
  const isCollapsed= collapsed && !isMobile && !isTablet;
  const W          = isCollapsed ? 76 : isMobile ? 282 : 270;

  /* ── group nav items ── */
  const items  = NAV_ITEMS[user?.role] || NAV_ITEMS.EMPLOYEE;
  const groups = items.reduce((acc, item) => {
    const c = item.cat || 'main';
    (acc[c] ??= []).push(item);
    return acc;
  }, {});

  const toggleCat = (cat) =>
    setOpenCats(p => ({ ...p, [cat]: !p[cat] }));

  return (
    <>
      <SidebarCSS />

      {/* ── overlay ── */}
      {isOpen && (isMobile || isTablet) && (
        <div
          className="sb-overlay"
          onClick={onClose}
          style={{
            position:'fixed', inset:0, zIndex:40,
            background:'rgba(0,0,0,.65)',
            backdropFilter:'blur(6px)',
            WebkitBackdropFilter:'blur(6px)',
          }}
        />
      )}

      {/* ── sidebar shell ── */}
      <aside style={{
        position:'fixed', top:0, left:0, bottom:0,
        zIndex:50, width:W,
        transform:(isMobile||isTablet)
          ? (isOpen?'translateX(0)':'translateX(-100%)')
          : 'translateX(0)',
        transition:'width .32s cubic-bezier(.4,0,.2,1), transform .32s cubic-bezier(.4,0,.2,1)',
        display:'flex', flexDirection:'column',
        background:'linear-gradient(180deg,#0b1120 0%,#0f1729 55%,#0c1222 100%)',
        borderRight:'1px solid rgba(255,255,255,.055)',
        boxShadow:'6px 0 40px rgba(0,0,0,.55)',
        overflow:'hidden',
      }}>

        {/* ════ HEADER ════ */}
        <SidebarHeader
          rc={rc} collapsed={isCollapsed}
          isMobile={isMobile} isTablet={isTablet}
          mounted={mounted}
          onCollapse={() => setCollapsed(p=>!p)}
          onClose={onClose}
        />

        {/* ════ USER CARD ════ */}
        {user && (
          <SidebarUserCard
            user={user} rc={rc}
            collapsed={isCollapsed}
          />
        )}

        {/* ════ NAV ════ */}
        <nav className="sb-nav" style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          padding: isCollapsed ? '10px 8px' : '8px 10px',
        }}>
          {Object.entries(groups).map(([cat, catItems], ci) => {
            const meta  = CAT_META[cat] || { label: cat };
            const isOpen= openCats[cat] !== false; // default open

            return (
              <div key={cat} style={{
                marginBottom: meta.label ? 2 : 0,
                animation:`sb-slide-up .4s ease ${ci*.07}s backwards`,
              }}>
                {/* category header */}
                {meta.label && !isCollapsed && (
                  <button
                    onClick={() => toggleCat(cat)}
                    style={{
                      display:'flex', alignItems:'center',
                      justifyContent:'space-between',
                      width:'100%', padding:'9px 10px 5px',
                      background:'none', border:'none', cursor:'pointer',
                    }}
                  >
                    <span style={{
                      fontSize:9, fontWeight:800,
                      color:'rgba(255,255,255,.28)',
                      textTransform:'uppercase', letterSpacing:'1.4px',
                    }}>
                      {meta.label}
                    </span>
                    <svg style={{
                      width:11, height:11,
                      color:'rgba(255,255,255,.2)',
                      transition:'transform .3s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                )}

                {/* collapsed divider */}
                {meta.label && isCollapsed && ci > 0 && (
                  <div style={{
                    height:1, margin:'8px 10px',
                    background:'rgba(255,255,255,.07)',
                  }}/>
                )}

                {/* items */}
                <div style={{
                  maxHeight:(!meta.label||isOpen||isCollapsed) ? 800 : 0,
                  overflow:'hidden',
                  transition:'max-height .38s cubic-bezier(.4,0,.2,1)',
                }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                    {catItems.map((item, i) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        isActive={pathname === item.href}
                        collapsed={isCollapsed}
                        rc={rc}
                        isMobile={isMobile}
                        isHovered={hovered === item.href}
                        onHover={() => setHovered(item.href)}
                        onLeave={() => setHovered(null)}
                        onClick={onClose}
                        animDelay={i * .05}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* ════ FOOTER ════ */}
        <SidebarFooter
          rc={rc} collapsed={isCollapsed}
          onLogout={logout}
        />
      </aside>
    </>
  );
}

// ─── Header sub-component ─────────────────────────────────
function SidebarHeader({ rc, collapsed, isMobile, isTablet, mounted, onCollapse, onClose }) {
  return (
    <div style={{
      height: isMobile ? 60 : 68,
      display:'flex', alignItems:'center',
      justifyContent: collapsed ? 'center' : 'space-between',
      padding: collapsed ? '0 10px' : '0 16px',
      borderBottom:'1px solid rgba(255,255,255,.055)',
      background:'rgba(255,255,255,.018)',
      position:'relative', overflow:'hidden', flexShrink:0,
    }}>
      {/* ambient glow */}
      <div style={{
        position:'absolute', top:-50, right:-50,
        width:120, height:120, borderRadius:'50%',
        background:rc.g, opacity:.07, filter:'blur(28px)',
        animation:'sb-glow-pulse 4s ease-in-out infinite',
        pointerEvents:'none',
      }}/>

      {/* logo / brand */}
      {!collapsed ? (
        <div style={{
          display:'flex', alignItems:'center', gap:11,
          position:'relative', zIndex:1,
          animation: mounted ? 'sb-fade-in .45s ease' : 'none',
        }}>
          <div className="sb-logo-icon" style={{
            width:38, height:38, borderRadius:11,
            background:rc.g,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:19,
            boxShadow:`0 4px 18px ${rc.glow}`,
            border:'1px solid rgba(255,255,255,.16)',
            flexShrink:0,
          }}>🚗</div>

          <div>
            <span style={{
              display:'block', fontSize:16, fontWeight:900,
              color:'white', letterSpacing:'-.6px', lineHeight:1.1,
            }}>
              Billing<span style={{ color:rc.c }}>System</span>
            </span>
            <span style={{
              display:'block', fontSize:9,
              color:'rgba(255,255,255,.35)',
              textTransform:'uppercase', letterSpacing:'1.6px', fontWeight:700,
            }}>
              {rc.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="sb-logo-icon" style={{
          width:40, height:40, borderRadius:12,
          background:rc.g,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20, boxShadow:`0 4px 18px ${rc.glow}`,
        }}>🚗</div>
      )}

      {/* collapse / close button */}
      {(!isMobile && !isTablet) ? (
        <button
          onClick={onCollapse}
          className="sb-collapse-btn"
          style={{
            width:28, height:28, borderRadius:8,
            border:'1px solid rgba(255,255,255,.08)',
            background:'rgba(255,255,255,.04)',
            cursor:'pointer', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .22s ease', position:'relative', zIndex:1,
          }}
        >
          <svg style={{
            width:13, height:13,
            color:'rgba(255,255,255,.45)',
            transition:'transform .35s ease',
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0)',
          }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          </svg>
        </button>
      ) : (
        <button
          onClick={onClose}
          style={{
            width:32, height:32, borderRadius:9,
            border:'1px solid rgba(255,255,255,.08)',
            background:'rgba(255,255,255,.055)',
            cursor:'pointer', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative', zIndex:1, transition:'all .2s',
          }}
        >
          <svg style={{ width:17, height:17, color:'rgba(255,255,255,.6)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── User card ─────────────────────────────────────────────
function SidebarUserCard({ user, rc, collapsed }) {
  return (
    <div style={{
      padding: collapsed ? '14px 0' : '14px 16px',
      borderBottom:'1px solid rgba(255,255,255,.05)',
      display:'flex',
      alignItems: collapsed ? 'center' : 'flex-start',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: collapsed ? 0 : 11,
      background:'rgba(255,255,255,.012)',
      flexShrink:0,
    }}>
      {/* avatar */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <div className="sb-avatar" style={{
          width: collapsed ? 40 : 44,
          height: collapsed ? 40 : 44,
          borderRadius: collapsed ? 13 : 15,
          background: rc.g,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'white', fontWeight:800,
          fontSize: collapsed ? 15 : 17,
          boxShadow:`0 4px 16px ${rc.glow}`,
          border:'2px solid rgba(255,255,255,.13)',
          transition:'all .3s ease', cursor:'default',
        }}>
          {user.name?.charAt(0).toUpperCase()}
        </div>

        {/* online dot */}
        <div style={{
          position:'absolute', bottom:-1, right:-1,
          width:10, height:10, borderRadius:'50%',
          background:'#10b981',
          border:'2px solid #0b1120',
          boxShadow:'0 0 0 2px rgba(16,185,129,.3)',
        }}>
          <div style={{
            position:'absolute', inset:0, borderRadius:'50%',
            background:'#10b981',
            animation:'sb-online-ping 2.4s ease-in-out infinite',
          }}/>
        </div>
      </div>

      {/* info */}
      {!collapsed && (
        <div style={{
          flex:1, minWidth:0,
          animation:'sb-fade-in .3s ease',
        }}>
          <p style={{
            margin:0, fontWeight:700, color:'white',
            fontSize:13.5,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {user.name}
          </p>
          <p style={{
            margin:'2px 0 0',
            fontSize:11, color:'rgba(255,255,255,.4)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {user.email}
          </p>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:4,
            marginTop:6, padding:'2px 8px',
            background:rc.dim, borderRadius:6,
            border:`1px solid ${rc.c}22`,
          }}>
            <span style={{ fontSize:10 }}>{rc.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color:rc.c }}>
              {rc.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nav link ──────────────────────────────────────────────
function SidebarLink({
  item, isActive, collapsed, rc,
  isMobile, isHovered, onHover, onLeave, onClick, animDelay,
}) {
  const [badge,       setBadge      ] = useState(0);
  const [showTip,     setShowTip    ] = useState(false);

  /* fetch badge count */
  useEffect(() => {
    if (!item.badge) return;
    const fetch_ = async () => {
      try {
        const url = item.badge === 'req'
          ? '/api/inventory-requests?status=PENDING'
          : '/api/inventory-transfers?status=REQUESTED';
        const r = await fetch(url);
        const d = await r.json();
        if (d.success) setBadge(d.data?.length || 0);
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 60000);
    return () => clearInterval(t);
  }, [item.badge]);

  const bg    = isActive ? rc.dim : isHovered ? 'rgba(255,255,255,.055)' : 'transparent';
  const color = isActive ? rc.c  : isHovered  ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.45)';

  return (
    <div
      style={{ position:'relative' }}
      onMouseEnter={() => { onHover(); if(collapsed) setShowTip(true); }}
      onMouseLeave={() => { onLeave(); setShowTip(false); }}
    >
      <Link
        href={item.href}
        onClick={onClick}
        className="sb-link"
        style={{
          display:'flex', alignItems:'center',
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '11px' : '9px 11px',
          borderRadius:11,
          textDecoration:'none',
          background: bg,
          color,
          fontWeight: isActive ? 700 : 500,
          fontSize:13,
          position:'relative',
          border:`1px solid ${isActive ? `${rc.c}1a` : 'transparent'}`,
          animation:`sb-slide-up .38s ease ${animDelay}s backwards`,
        }}
      >
        {/* left active bar */}
        {isActive && !collapsed && (
          <div style={{
            position:'absolute', left:-1, top:'18%',
            width:3, height:'64%',
            background:rc.g, borderRadius:3,
            boxShadow:`0 0 10px ${rc.glow}`,
          }}/>
        )}

        {/* bottom active bar (collapsed) */}
        {isActive && collapsed && (
          <div style={{
            position:'absolute', bottom:-1,
            left:'50%', transform:'translateX(-50%)',
            width:'45%', height:2.5,
            background:rc.g, borderRadius:'2px 2px 0 0',
            boxShadow:`0 0 8px ${rc.glow}`,
          }}/>
        )}

        {/* icon */}
        <span style={{
          fontSize:17.5, flexShrink:0, lineHeight:1,
          position:'relative',
          transition:'transform .22s ease',
          transform:(isHovered && !isMobile) ? 'scale(1.18)' : 'scale(1)',
          filter: isActive ? 'none' : 'grayscale(30%)',
        }}>
          {item.icon}

          {/* collapsed badge */}
          {collapsed && badge > 0 && (
            <span className="sb-badge" style={{
              position:'absolute', top:-6, right:-8,
              minWidth:14, height:14, borderRadius:7,
              background:'#ef4444', color:'white',
              fontSize:8, fontWeight:800,
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:'0 2px', border:'2px solid #0b1120',
            }}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>

        {/* label + badge */}
        {!collapsed && (
          <>
            <span style={{ flex:1, lineHeight:1.3 }}>{item.name}</span>
            {badge > 0 && (
              <span className="sb-badge" style={{
                minWidth:20, height:20, borderRadius:10,
                background: isActive ? rc.g : 'rgba(239,68,68,.9)',
                color:'white', fontSize:10, fontWeight:800,
                display:'flex', alignItems:'center', justifyContent:'center',
                padding:'0 5px', flexShrink:0,
                boxShadow:'0 2px 8px rgba(239,68,68,.35)',
              }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
            {isActive && !badge && (
              <div style={{
                width:6, height:6, borderRadius:'50%',
                background:rc.g, flexShrink:0,
                boxShadow:`0 0 0 3px ${rc.dim}`,
              }}/>
            )}
          </>
        )}
      </Link>

      {/* tooltip (collapsed desktop) */}
      {collapsed && showTip && !isMobile && (
        <div style={{
          position:'absolute',
          left:'calc(100% + 14px)',
          top:'50%', transform:'translateY(-50%)',
          padding:'6px 13px', borderRadius:9,
          background:'rgba(13,19,36,.97)',
          border:'1px solid rgba(255,255,255,.1)',
          color:'white', fontSize:12, fontWeight:600,
          whiteSpace:'nowrap', zIndex:200,
          boxShadow:'0 10px 30px rgba(0,0,0,.5)',
          animation:'sb-tooltip .2s ease',
          pointerEvents:'none',
        }}>
          {item.name}
          {badge > 0 && (
            <span style={{
              marginLeft:8, padding:'1px 6px',
              background:'#ef4444', borderRadius:5,
              fontSize:10, fontWeight:800,
            }}>{badge}</span>
          )}
          {/* arrow */}
          <div style={{
            position:'absolute', left:-5, top:'50%',
            transform:'translateY(-50%) rotate(45deg)',
            width:9, height:9,
            background:'rgba(13,19,36,.97)',
            border:'1px solid rgba(255,255,255,.1)',
            borderRight:'none', borderTop:'none',
          }}/>
        </div>
      )}
    </div>
  );
}

// ─── Footer ────────────────────────────────────────────────
function SidebarFooter({ rc, collapsed, onLogout }) {
  const [hov, setHov] = useState(false);

  return (
    <div style={{
      padding: collapsed ? '12px 8px' : '12px 12px',
      borderTop:'1px solid rgba(255,255,255,.05)',
      background:'rgba(0,0,0,.18)',
      flexShrink:0,
    }}>
      {/* system status */}
      {!collapsed && (
        <div style={{
          display:'flex', alignItems:'center', gap:7,
          padding:'7px 10px', marginBottom:8,
          borderRadius:10,
          background:'rgba(255,255,255,.025)',
          border:'1px solid rgba(255,255,255,.04)',
        }}>
          <div style={{
            width:6, height:6, borderRadius:'50%',
            background:'#10b981',
            boxShadow:'0 0 8px rgba(16,185,129,.6)',
          }}/>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.28)', fontWeight:600 }}>
            System Online · v2.1.0
          </span>
        </div>
      )}

      <button
        onClick={onLogout}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="sb-logout-btn"
        style={{
          display:'flex', alignItems:'center',
          gap: collapsed ? 0 : 11,
          justifyContent: collapsed ? 'center' : 'flex-start',
          width:'100%', padding: collapsed ? '11px' : '10px 12px',
          borderRadius:11, border:'none',
          background: hov ? 'rgba(239,68,68,.1)' : 'transparent',
          cursor:'pointer',
          color: hov ? '#f87171' : 'rgba(255,255,255,.4)',
          fontWeight:600, fontSize:13,
          transition:'all .22s ease',
        }}
        title={collapsed ? 'Logout' : ''}
      >
        <svg style={{ width:17, height:17, flexShrink:0 }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
        {!collapsed && <span>Logout</span>}
      </button>
    </div>
  );
}