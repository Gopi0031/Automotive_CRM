// src/components/Navbar.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function Navbar({ user, onMenuClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [screenSize, setScreenSize] = useState('desktop');
  const dropdownRef = useRef(null);
  const router = useRouter();

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        localStorage.removeItem('user');
        toast.success('Logged out successfully');
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  // Enhanced role configurations with more distinctive colors
  const roleConfig = {
    SUPER_ADMIN: { 
      label: 'Super Admin', 
      shortLabel: 'Admin',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      lightBg: 'rgba(124, 58, 237, 0.08)',
      color: '#7c3aed',
      icon: '👑',
      borderColor: '#7c3aed'
    },
    MANAGER: { 
      label: 'Manager', 
      shortLabel: 'Manager',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      lightBg: 'rgba(37, 99, 235, 0.08)',
      color: '#2563eb',
      icon: '👔',
      borderColor: '#2563eb'
    },
    EMPLOYEE: { 
      label: 'Technician', 
      shortLabel: 'Tech',
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      lightBg: 'rgba(5, 150, 105, 0.08)',
      color: '#059669',
      icon: '🔧',
      borderColor: '#059669'
    },
    CASHIER: { 
      label: 'Cashier', 
      shortLabel: 'Cashier',
      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      lightBg: 'rgba(217, 119, 6, 0.08)',
      color: '#d97706',
      icon: '💰',
      borderColor: '#d97706'
    },
  };

  const userRole = roleConfig[user?.role] || roleConfig.EMPLOYEE;
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';

  return (
    <>
      <nav style={{
        height: isMobile ? '60px' : '68px',
        padding: isMobile ? '0 12px' : '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.95)'
      }}>
        {/* Left Section */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '10px' : '16px',
          flex: 1,
          minWidth: 0
        }}>
          {/* Mobile Menu Button */}
          {(isMobile || isTablet) && (
            <button
              onClick={onMenuClick}
              style={{
                padding: isMobile ? '8px' : '10px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg style={{ width: isMobile ? '22px' : '24px', height: isMobile ? '22px' : '24px', color: '#374151' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Welcome Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: isMobile ? '15px' : isTablet ? '17px' : '20px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {isMobile ? `Hi, ${user?.name?.split(' ')[0]}` : `Welcome back, ${user?.name?.split(' ')[0]}`}
              {!isMobile && <span style={{ fontSize: '18px' }}>👋</span>}
            </h2>
            {!isMobile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '2px'
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  background: userRole.lightBg,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: userRole.color,
                  border: `1px solid ${userRole.color}20`
                }}>
                  <span style={{ fontSize: '12px' }}>{userRole.icon}</span>
                  {isTablet ? userRole.shortLabel : userRole.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : isTablet ? '8px' : '12px'
        }}>
          {/* Quick Actions - Desktop Only */}
          {!isMobile && !isTablet && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginRight: '8px'
            }}>
              <QuickActionButton
                icon={
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                tooltip="Search"
              />
            </div>
          )}

          {/* Notification Bell */}
          <NotificationBell screenSize={screenSize} userRole={userRole} />

          {/* User Dropdown */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '10px',
                padding: isMobile ? '4px' : '6px 10px',
                borderRadius: '14px',
                border: `2px solid ${dropdownOpen ? userRole.color : 'transparent'}`,
                background: dropdownOpen ? userRole.lightBg : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (!dropdownOpen) {
                  e.currentTarget.style.background = userRole.lightBg;
                  e.currentTarget.style.borderColor = `${userRole.color}40`;
                }
              }}
              onMouseLeave={(e) => {
                if (!dropdownOpen) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <div style={{
                width: isMobile ? '34px' : '40px',
                height: isMobile ? '34px' : '40px',
                borderRadius: '12px',
                background: userRole.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: isMobile ? '14px' : '16px',
                boxShadow: `0 4px 12px ${userRole.color}40`,
                transition: 'all 0.3s ease',
                border: '2px solid rgba(255,255,255,0.9)'
              }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>

              {!isMobile && (
                <>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ 
                      color: '#1f2937', 
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'block',
                      lineHeight: 1.2
                    }}>
                      {isTablet ? user?.name?.split(' ')[0] : user?.name}
                    </span>
                    {!isTablet && (
                      <span style={{
                        fontSize: '11px',
                        color: userRole.color,
                        fontWeight: '500'
                      }}>
                        {userRole.label}
                      </span>
                    )}
                  </div>
                  <svg 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      color: '#9ca3af',
                      transition: 'transform 0.3s ease',
                      transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                right: isMobile ? '-10px' : 0,
                top: 'calc(100% + 8px)',
                width: isMobile ? 'calc(100vw - 40px)' : isTablet ? '280px' : '320px',
                maxWidth: '320px',
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                zIndex: 50,
                animation: 'dropdownSlide 0.3s ease-out forwards',
              }}>
                {/* User Info Section */}
                <div style={{
                  padding: isMobile ? '16px' : '20px',
                  background: userRole.gradient,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Decorative circles */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-30px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)'
                  }} />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '22px',
                      border: '3px solid rgba(255,255,255,0.3)'
                    }}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '17px',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {user?.name}
                      </p>
                      <p style={{
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '13px',
                        margin: 0,
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{
                          padding: '2px 8px',
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {userRole.icon} {userRole.label}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                    margin: 0,
                    marginTop: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    📧 {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div style={{ padding: '8px' }}>
                 

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease',
                      color: '#dc2626',
                      fontWeight: '600',
                      fontSize: '15px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ display: 'block' }}>Logout</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>
                        Sign out of your account
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <style jsx>{`
        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}

// Quick Action Button Component
function QuickActionButton({ icon, tooltip, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={tooltip}
      style={{
        padding: '10px',
        borderRadius: '12px',
        border: 'none',
        background: isHovered ? 'rgba(0,0,0,0.05)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isHovered ? '#374151' : '#6b7280',
        transition: 'all 0.2s ease'
      }}
    >
      {icon}
    </button>
  );
}

// ==================== NOTIFICATION BELL ====================
function NotificationBell({ screenSize, userRole }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead([notification.id]);
    }

    const routes = {
      InventoryRequest: '/inventory-requests',
      InventoryTransfer: '/inventory-transfers',
      Job: '/jobs',
    };

    const route = routes[notification.entityType];
    if (route) {
      router.push(route);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      INVENTORY_REQUEST: '📋',
      INVENTORY_APPROVED: '✅',
      INVENTORY_REJECTED: '❌',
      TRANSFER_REQUEST: '🔄',
      TRANSFER_APPROVED: '✅',
      TRANSFER_REJECTED: '❌',
      TRANSFER_SENT: '🚚',
      TRANSFER_RECEIVED: '📦',
      JOB_ASSIGNED: '🔧',
      JOB_UPDATED: '📝',
      LOW_STOCK: '⚠️',
      GENERAL: '🔔',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type) => {
    const colors = {
      INVENTORY_REQUEST: '#3b82f6',
      INVENTORY_APPROVED: '#10b981',
      INVENTORY_REJECTED: '#ef4444',
      TRANSFER_REQUEST: '#8b5cf6',
      TRANSFER_APPROVED: '#10b981',
      TRANSFER_REJECTED: '#ef4444',
      TRANSFER_SENT: '#6366f1',
      TRANSFER_RECEIVED: '#10b981',
      JOB_ASSIGNED: '#f59e0b',
      JOB_UPDATED: '#3b82f6',
      LOW_STOCK: '#f59e0b',
      GENERAL: '#6b7280',
    };
    return colors[type] || '#6b7280';
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: isMobile ? '8px' : '10px',
          background: isOpen ? userRole.lightBg : 'transparent',
          border: `2px solid ${isOpen ? userRole.color : 'transparent'}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <svg 
          style={{ 
            width: isMobile ? '20px' : '22px', 
            height: isMobile ? '20px' : '22px', 
            color: isOpen ? userRole.color : '#374151',
            transition: 'all 0.2s'
          }} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: isMobile ? '2px' : '4px',
            right: isMobile ? '2px' : '4px',
            minWidth: isMobile ? '16px' : '18px',
            height: isMobile ? '16px' : '18px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '9px',
            color: 'white',
            fontSize: isMobile ? '9px' : '10px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
            animation: 'badgePulse 2s ease-in-out infinite'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: isMobile ? '-80px' : isTablet ? '-40px' : 0,
          width: isMobile ? 'calc(100vw - 24px)' : isTablet ? '360px' : '400px',
          maxWidth: '400px',
          maxHeight: isMobile ? '70vh' : '520px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          zIndex: 100,
          animation: 'notifSlide 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: isMobile ? '14px 16px' : '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: `linear-gradient(180deg, white 0%, ${userRole.lightBg} 100%)`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ 
                fontSize: isMobile ? '16px' : '17px', 
                fontWeight: '800', 
                color: '#1a202c', 
                margin: 0 
              }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span style={{
                  padding: '3px 10px',
                  background: userRole.gradient,
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                style={{
                  fontSize: '13px',
                  color: userRole.color,
                  background: userRole.lightBg,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{
            maxHeight: isMobile ? 'calc(70vh - 120px)' : '380px',
            overflowY: 'auto',
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '48px 20px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  background: userRole.lightBg,
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: '36px'
                }}>
                  🔔
                </div>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '17px', color: '#374151', marginBottom: '6px' }}>
                  All caught up!
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                  No new notifications
                </p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: isMobile ? '12px 16px' : '14px 20px',
                    borderBottom: index !== notifications.length - 1 ? '1px solid #f8fafc' : 'none',
                    cursor: 'pointer',
                    background: notification.isRead ? 'white' : `linear-gradient(90deg, ${getNotificationColor(notification.type)}08 0%, transparent 100%)`,
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fafbfc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notification.isRead 
                      ? 'white' 
                      : `linear-gradient(90deg, ${getNotificationColor(notification.type)}08 0%, transparent 100%)`;
                  }}
                >
                  {!notification.isRead && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '50%',
                      background: getNotificationColor(notification.type),
                      borderRadius: '0 4px 4px 0'
                    }} />
                  )}

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: `${getNotificationColor(notification.type)}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0
                    }}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: notification.isRead ? '500' : '600',
                        color: '#1a202c',
                        margin: 0,
                        marginBottom: '4px',
                        lineHeight: 1.4
                      }}>
                        {notification.title}
                      </p>
                      <p style={{
                        fontSize: isMobile ? '12px' : '13px',
                        color: '#6b7280',
                        margin: 0,
                        marginBottom: '6px',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {notification.message}
                      </p>
                      <p style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        🕐 {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {!notification.isRead && (
                      <div style={{
                        width: '10px',
                        height: '10px',
                        background: getNotificationColor(notification.type),
                        borderRadius: '50%',
                        flexShrink: 0,
                        marginTop: '4px',
                        boxShadow: `0 0 0 3px ${getNotificationColor(notification.type)}20`
                      }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafbfd',
              textAlign: 'center'
            }}>
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                style={{
                  fontSize: '14px',
                  color: userRole.color,
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                View all notifications
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes notifSlide {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

// ==================== DROPDOWN LINK ====================
function DropdownLink({ href, icon, label, description, onClick, color }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 16px',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        background: isHovered ? `${color}10` : 'transparent',
        textDecoration: 'none',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: isHovered ? `${color}15` : 'rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isHovered ? color : '#6b7280',
        transition: 'all 0.2s'
      }}>
        {icon}
      </div>
      <div>
        <span style={{
          display: 'block',
          fontWeight: '600',
          fontSize: '15px',
          color: isHovered ? color : '#374151'
        }}>
          {label}
        </span>
        {description && (
          <span style={{
            display: 'block',
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '1px'
          }}>
            {description}
          </span>
        )}
      </div>
    </Link>
  );
}