// src/components/Sidebar.js
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Enhanced role configurations
  const roleConfig = {
    SUPER_ADMIN: { 
      label: 'Super Admin', 
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      lightGradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(91, 33, 182, 0.1) 100%)',
      color: '#7c3aed',
      lightBg: 'rgba(124, 58, 237, 0.08)',
      icon: '👑',
      accentColor: '#a855f7'
    },
    MANAGER: { 
      label: 'Manager', 
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      lightGradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(29, 78, 216, 0.1) 100%)',
      color: '#2563eb',
      lightBg: 'rgba(37, 99, 235, 0.08)',
      icon: '👔',
      accentColor: '#3b82f6'
    },
    EMPLOYEE: { 
      label: 'Technician', 
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      lightGradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(4, 120, 87, 0.1) 100%)',
      color: '#059669',
      lightBg: 'rgba(5, 150, 105, 0.08)',
      icon: '🔧',
      accentColor: '#10b981'
    },
    CASHIER: { 
      label: 'Cashier', 
      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      lightGradient: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(180, 83, 9, 0.1) 100%)',
      color: '#d97706',
      lightBg: 'rgba(217, 119, 6, 0.08)',
      icon: '💰',
      accentColor: '#f59e0b'
    },
  };

  const userRoleConfig = roleConfig[user?.role] || roleConfig.EMPLOYEE;

  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: '🏠',
        roles: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER'],
        category: 'main'
      }
    ];

    const roleItems = {
      SUPER_ADMIN: [
        { name: 'Users', href: '/users', icon: '👥', category: 'management' },
        { name: 'Branches', href: '/branches', icon: '🏢', category: 'management' },
        { name: 'Customers', href: '/customers', icon: '🧑‍🤝‍🧑', category: 'crm' },
        { name: 'Vehicles', href: '/vehicles', icon: '🚗', category: 'crm' },
        { name: 'Jobs', href: '/jobs', icon: '🔧', category: 'operations' },
        { name: 'Inventory', href: '/inventory', icon: '📦', category: 'inventory' },
        { name: 'Part Requests', href: '/inventory-requests', icon: '📋', badge: 'requestCount', category: 'inventory' },
        { name: 'Transfers', href: '/inventory-transfers', icon: '🔄', badge: 'transferCount', category: 'inventory' },
        { name: 'Invoices', href: '/invoices', icon: '📄', category: 'billing' },
        { name: 'Payments', href: '/payments', icon: '💳', category: 'billing' },
        { name: 'Reports', href: '/reports', icon: '📊', category: 'analytics' },
      ],
      MANAGER: [
        { name: 'Team', href: '/users', icon: '👥', category: 'management' },
        { name: 'Customers', href: '/customers', icon: '🧑‍🤝‍🧑', category: 'crm' },
        { name: 'Vehicles', href: '/vehicles', icon: '🚗', category: 'crm' },
        { name: 'Jobs', href: '/jobs', icon: '🔧', category: 'operations' },
        { name: 'Inventory', href: '/inventory', icon: '📦', category: 'inventory' },
        { name: 'Part Requests', href: '/inventory-requests', icon: '📋', badge: 'requestCount', category: 'inventory' },
        { name: 'Transfers', href: '/inventory-transfers', icon: '🔄', badge: 'transferCount', category: 'inventory' },
        { name: 'Invoices', href: '/invoices', icon: '📄', category: 'billing' },
        { name: 'Reports', href: '/reports', icon: '📊', category: 'analytics' },
      ],
      EMPLOYEE: [
        { name: 'My Jobs', href: '/jobs', icon: '🔧', category: 'operations' },
        { name: 'Vehicles', href: '/vehicles', icon: '🚗', category: 'crm' },
        { name: 'Inventory', href: '/inventory', icon: '📦', category: 'inventory' },
        { name: 'My Requests', href: '/inventory-requests', icon: '📋', badge: 'requestCount', category: 'inventory' },
      ],
      CASHIER: [
        { name: 'Customers', href: '/customers', icon: '🧑‍🤝‍🧑', category: 'crm' },
        { name: 'Invoices', href: '/invoices', icon: '📄', category: 'billing' },
        { name: 'Payments', href: '/payments', icon: '💳', category: 'billing' },
        { name: 'Reports', href: '/reports', icon: '📊', category: 'analytics' },
      ],
    };

    return [...baseItems, ...(roleItems[user?.role] || [])];
  };

  const navigationItems = getNavigationItems();
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';

  // Group items by category
  const groupedItems = navigationItems.reduce((acc, item) => {
    const category = item.category || 'main';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const categoryLabels = {
    main: null,
    management: 'Management',
    crm: 'Customers',
    operations: 'Operations',
    inventory: 'Inventory',
    billing: 'Billing',
    analytics: 'Analytics'
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (isMobile || isTablet) && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        height: '100%',
        background: 'white',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: (isMobile || isTablet)
          ? (isOpen ? 'translateX(0)' : 'translateX(-100%)')
          : 'translateX(0)',
        width: collapsed && !isMobile && !isTablet ? '80px' : isMobile ? '280px' : '270px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.08)'
      }}>
        {/* Logo Header */}
        <div style={{
          height: isMobile ? '60px' : '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: userRoleConfig.gradient,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            left: '10%',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)'
          }} />

          {(!collapsed || isMobile || isTablet) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                border: '2px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                🚗
              </div>
              <div>
                <span style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: 'white',
                  letterSpacing: '-0.5px',
                  display: 'block'
                }}>
                  AutoBill Pro
                </span>
                <span style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {userRoleConfig.label}
                </span>
              </div>
            </div>
          )}

          {collapsed && !isMobile && !isTablet && (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              margin: '0 auto'
            }}>
              🚗
            </div>
          )}

          {/* Collapse/Close Button */}
          {!isMobile && !isTablet ? (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                position: 'relative',
                zIndex: 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <svg 
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  color: 'white',
                  transition: 'transform 0.3s ease',
                  transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)'
                }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <button 
              onClick={onClose}
              style={{
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255,255,255,0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1
              }}
            >
              <svg style={{ width: '20px', height: '20px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* User Info */}
        {user && (!collapsed || isMobile || isTablet) && (
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            background: userRoleConfig.lightBg
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: userRoleConfig.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '18px',
                flexShrink: 0,
                boxShadow: `0 4px 14px ${userRoleConfig.color}40`,
                border: '3px solid white'
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0,
                  fontSize: '15px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.name}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px'
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    background: 'white',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: userRoleConfig.color,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    {userRoleConfig.icon} {userRoleConfig.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed User Avatar */}
        {user && collapsed && !isMobile && !isTablet && (
          <div style={{
            padding: '16px 0',
            display: 'flex',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: userRoleConfig.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
              boxShadow: `0 4px 12px ${userRoleConfig.color}40`
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{
          padding: collapsed && !isMobile && !isTablet ? '12px 8px' : '12px 16px',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {Object.entries(groupedItems).map(([category, items], categoryIndex) => (
            <div key={category}>
              {/* Category Label */}
              {categoryLabels[category] && (!collapsed || isMobile || isTablet) && (
                <div style={{
                  padding: categoryIndex === 0 ? '4px 8px 10px' : '20px 8px 10px',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {categoryLabels[category]}
                </div>
              )}
              
              {/* Separator for collapsed mode */}
              {categoryLabels[category] && collapsed && !isMobile && !isTablet && categoryIndex > 0 && (
                <div style={{
                  height: '1px',
                  background: 'rgba(0,0,0,0.06)',
                  margin: '12px 8px'
                }} />
              )}

              {/* Navigation Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map((item, index) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={pathname === item.href}
                    collapsed={collapsed && !isMobile && !isTablet}
                    onClick={onClose}
                    index={index}
                    userRoleConfig={userRoleConfig}
                    isHovered={hoveredItem === item.href}
                    onHover={() => setHoveredItem(item.href)}
                    onLeave={() => setHoveredItem(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div style={{
          padding: collapsed && !isMobile && !isTablet ? '12px 8px' : '12px 16px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(0,0,0,0.02)'
        }}>
         

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed && !isMobile && !isTablet ? 0 : '12px',
              justifyContent: collapsed && !isMobile && !isTablet ? 'center' : 'flex-start',
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: '#6b7280',
              fontWeight: '600',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
            title={collapsed ? 'Logout' : ''}
          >
            <svg style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {(!collapsed || isMobile || isTablet) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Custom Scrollbar */
        nav::-webkit-scrollbar {
          width: 6px;
        }
        nav::-webkit-scrollbar-track {
          background: transparent;
        }
        nav::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 3px;
        }
        nav::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }
      `}</style>
    </>
  );
}

function NavItem({ item, isActive, collapsed, onClick, index, userRoleConfig, isHovered, onHover, onLeave }) {
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (!item.badge) return;

    const fetchBadgeCount = async () => {
      try {
        let url = '';
        if (item.badge === 'requestCount') {
          url = '/api/inventory-requests?status=PENDING';
        } else if (item.badge === 'transferCount') {
          url = '/api/inventory-transfers?status=REQUESTED';
        }

        if (url) {
          const response = await fetch(url);
          const data = await response.json();
          if (data.success) {
            setBadgeCount(data.data?.length || 0);
          }
        }
      } catch (error) {
        // Silently fail
      }
    };

    fetchBadgeCount();
    const interval = setInterval(fetchBadgeCount, 60000);
    return () => clearInterval(interval);
  }, [item.badge]);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '12px' : '11px 14px',
        borderRadius: '12px',
        textDecoration: 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isActive 
          ? userRoleConfig.lightGradient
          : isHovered 
            ? 'rgba(0,0,0,0.04)' 
            : 'transparent',
        color: isActive ? userRoleConfig.color : '#6b7280',
        fontWeight: isActive ? '700' : '500',
        fontSize: '14px',
        position: 'relative',
        border: isActive ? `1px solid ${userRoleConfig.color}20` : '1px solid transparent',
      }}
      title={collapsed ? item.name : ''}
    >
      {/* Active indicator */}
      {isActive && (
        <div style={{
          position: 'absolute',
          left: collapsed ? '50%' : '-1px',
          transform: collapsed ? 'translateX(-50%)' : 'none',
          top: collapsed ? 'auto' : '50%',
          bottom: collapsed ? '-1px' : 'auto',
          width: collapsed ? '50%' : '4px',
          height: collapsed ? '3px' : '50%',
          marginTop: collapsed ? 0 : '-25%',
          background: userRoleConfig.gradient,
          borderRadius: collapsed ? '3px 3px 0 0' : '0 4px 4px 0'
        }} />
      )}

      <span style={{ 
        fontSize: '20px',
        flexShrink: 0,
        filter: isActive ? 'none' : 'grayscale(30%)',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        position: 'relative',
        lineHeight: 1
      }}>
        {item.icon}
        {collapsed && badgeCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-8px',
            minWidth: '16px',
            height: '16px',
            background: '#ef4444',
            borderRadius: '8px',
            color: 'white',
            fontSize: '9px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(239,68,68,0.3)'
          }}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </span>

      {!collapsed && (
        <>
          <span style={{ flex: 1, lineHeight: 1.2 }}>{item.name}</span>
          
          {badgeCount > 0 && (
            <span style={{
              minWidth: '22px',
              height: '22px',
              background: isActive 
                ? userRoleConfig.gradient 
                : '#ef4444',
              borderRadius: '11px',
              color: 'white',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(239,68,68,0.3)'
            }}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}

          {isActive && !badgeCount && (
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: userRoleConfig.gradient,
              flexShrink: 0,
              boxShadow: `0 0 0 3px ${userRoleConfig.color}20`
            }} />
          )}
        </>
      )}
    </Link>
  );
}