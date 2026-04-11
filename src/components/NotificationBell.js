// src/components/NotificationBell.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { }
  };

  const markAsRead = async (ids) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids }),
      });
      fetchNotifications();
    } catch { }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      fetchNotifications();
    } catch { }
  };

  const handleClick = (n) => {
    if (!n.isRead) markAsRead([n.id]);
    const routes = {
      InventoryRequest: '/inventory-requests',
      InventoryTransfer: '/inventory-transfers',
      Job: '/jobs',
    };
    if (routes[n.entityType]) router.push(routes[n.entityType]);
    setIsOpen(false);
  };

  const getIcon = (type) => ({
    INVENTORY_REQUEST: '📋', INVENTORY_APPROVED: '✅', INVENTORY_REJECTED: '❌',
    TRANSFER_REQUEST: '🔄', TRANSFER_APPROVED: '✅', TRANSFER_REJECTED: '❌',
    TRANSFER_SENT: '🚚', TRANSFER_RECEIVED: '📦', JOB_ASSIGNED: '🔧',
    JOB_UPDATED: '📝', LOW_STOCK: '⚠️', GENERAL: '🔔',
  }[type] || '🔔');

  const getColor = (type) => ({
    INVENTORY_REQUEST: '#3b82f6', INVENTORY_APPROVED: '#10b981', INVENTORY_REJECTED: '#ef4444',
    TRANSFER_REQUEST: '#8b5cf6', TRANSFER_APPROVED: '#10b981', TRANSFER_REJECTED: '#ef4444',
    TRANSFER_SENT: '#6366f1', TRANSFER_RECEIVED: '#10b981', JOB_ASSIGNED: '#f59e0b',
    JOB_UPDATED: '#3b82f6', LOW_STOCK: '#f59e0b', GENERAL: '#6b7280',
  }[type] || '#6b7280');

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <style jsx global>{`
        .nb-dropdown {
          animation: nbSlide 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes nbSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nb-bell-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .nb-item:hover {
          background: rgba(255,255,255,0.04) !important;
        }
        .nb-badge {
          animation: nbPulse 2s ease-in-out infinite;
        }
        @keyframes nbPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="nb-bell-btn"
        style={{
          position: 'relative',
          width: 40, height: 40, borderRadius: 10,
          background: isOpen ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
          border: `1.5px solid ${isOpen ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.25s',
        }}
      >
        <svg style={{
          width: 20, height: 20,
          color: isOpen ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
          transition: 'color 0.2s',
        }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {unreadCount > 0 && (
          <span className="nb-badge" style={{
            position: 'absolute', top: 3, right: 3,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#ef4444', color: 'white',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '2px solid #0c1222',
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="nb-dropdown" style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 380, maxHeight: 500,
          background: 'rgba(15,23,42,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden', zIndex: 100,
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: 0 }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span style={{
                  padding: '2px 10px', borderRadius: 10,
                  background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: 'white', fontSize: 11, fontWeight: 700,
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  fontSize: 12, color: '#a5b4fc',
                  background: 'rgba(99,102,241,0.12)',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                  padding: '5px 12px', borderRadius: 8,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: 32,
                }}>
                  🔔
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 4 }}>
                  All caught up!
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const nc = getColor(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="nb-item"
                    style={{
                      padding: '14px 20px',
                      borderBottom: i < notifications.length - 1
                        ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      cursor: 'pointer',
                      background: n.isRead
                        ? 'transparent'
                        : `linear-gradient(90deg, ${nc}08, transparent)`,
                      transition: 'all 0.2s', position: 'relative',
                    }}
                  >
                    {!n.isRead && (
                      <div style={{
                        position: 'absolute', left: 0, top: '20%',
                        width: 3, height: '60%',
                        background: nc, borderRadius: '0 3px 3px 0',
                        boxShadow: `0 0 6px ${nc}50`,
                      }} />
                    )}

                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: `${nc}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                      }}>
                        {getIcon(n.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: n.isRead ? 500 : 650,
                          color: 'white', margin: '0 0 3px', lineHeight: 1.4,
                        }}>
                          {n.title}
                        </p>
                        <p style={{
                          fontSize: 12, color: 'rgba(255,255,255,0.4)',
                          margin: '0 0 5px', lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.message}
                        </p>
                        <span style={{
                          fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 500,
                        }}>
                          🕐 {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {!n.isRead && (
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: nc, flexShrink: 0, marginTop: 4,
                          boxShadow: `0 0 0 3px ${nc}20`,
                        }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}