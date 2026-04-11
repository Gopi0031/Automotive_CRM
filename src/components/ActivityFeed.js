// src/components/ActivityFeed.js
'use client';

import { useState, useEffect } from 'react';
import { useActivities } from '../hooks/useActivities';
import { ActivityIcons, getActivityColor } from '../lib/activityService';

export default function ActivityFeed({
  maxHeight = '500px',
  showHeader = true,
  limit = 20,
}) {
  const { activities, loading, error, refresh } = useActivities(5000);
  const [filter, setFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const filtered = activities.filter(a => filter === 'all' || a.entity === filter);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <div className="glass-card" style={{
        borderRadius: 24, padding: 48,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto', position: 'relative' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: i * 6,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: i === 0 ? '#6366f1' : i === 1 ? '#3b82f6' : '#06b6d4',
                animation: `rotate ${1.2 - i * 0.2}s linear infinite`,
              }} />
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 20, fontSize: 14, fontWeight: 500 }}>
            Loading activities...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass-card" style={{
        borderRadius: 24, padding: 48,
        border: '1px solid rgba(239,68,68,0.2)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28,
          }}>
            ⚠️
          </div>
          <p style={{ color: '#f87171', fontWeight: 600, fontSize: 16 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ActivityFeedStyles />
      <div className="glass-card" style={{
        borderRadius: 24, overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {showHeader && (
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Subtle gradient bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, #6366f1, #06b6d4, #6366f1)',
              backgroundSize: '200% 100%',
              animation: 'actGradientSlide 3s linear infinite',
            }} />

            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px rgba(16,185,129,0.5)',
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: '#10b981',
                      animation: 'actPing 2s ease infinite',
                    }} />
                  </div>
                  <h3 style={{
                    fontSize: 17, fontWeight: 700, color: 'white',
                    margin: 0, letterSpacing: '-0.3px',
                  }}>
                    Recent Activity
                  </h3>
                </div>
                <p style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.35)',
                  fontWeight: 500, margin: 0,
                }}>
                  Live updates from your team
                </p>
              </div>
              <button
                onClick={handleRefresh}
                className="act-refresh-btn"
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                }}
              >
                <svg style={{
                  width: 16, height: 16, color: 'rgba(255,255,255,0.5)',
                  transition: 'transform 0.6s ease',
                  transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0)',
                }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Filter chips */}
            <div style={{
              display: 'flex', gap: 6, marginTop: 16,
              overflowX: 'auto', paddingBottom: 4,
            }}>
              {['all', 'User', 'Job', 'Invoice', 'Payment', 'Customer'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="act-filter-chip"
                  style={{
                    padding: '5px 14px', fontSize: 11, fontWeight: 600,
                    borderRadius: 20, whiteSpace: 'nowrap', cursor: 'pointer',
                    transition: 'all 0.25s',
                    background: filter === f ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    color: filter === f ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${filter === f ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activities list */}
        <div style={{ maxHeight, overflowY: 'auto', overflowX: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              animation: 'actScaleIn 0.5s ease',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 22,
                background: 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 36,
                animation: 'actFloat 3s ease-in-out infinite',
              }}>
                🕐
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 6 }}>
                No recent activity
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, maxWidth: 250, margin: '0 auto' }}>
                {filter !== 'all'
                  ? 'Try a different filter'
                  : 'Activity will appear as your team works'}
              </p>
            </div>
          ) : (
            filtered.map((a, i) => (
              <ActivityRow
                key={a.id}
                activity={a}
                timeAgo={timeAgo}
                index={i}
                isHovered={hoveredItem === a.id}
                onHover={() => setHoveredItem(a.id)}
                onLeave={() => setHoveredItem(null)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Activity Row ──
function ActivityRow({ activity, timeAgo, index, isHovered, onHover, onLeave }) {
  const icon = ActivityIcons[activity.action] || '📌';
  const colorClass = getActivityColor(activity.action);

  const colorMap = {
    'bg-blue-100 text-blue-700': { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd' },
    'bg-green-100 text-green-700': { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7' },
    'bg-yellow-100 text-yellow-700': { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
    'bg-red-100 text-red-700': { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5' },
    'bg-purple-100 text-purple-700': { bg: 'rgba(139,92,246,0.15)', color: '#c4b5fd' },
    'bg-orange-100 text-orange-700': { bg: 'rgba(249,115,22,0.15)', color: '#fdba74' },
    'bg-gray-100 text-gray-700': { bg: 'rgba(148,163,184,0.15)', color: '#cbd5e1' },
  };
  const cs = colorMap[colorClass] || colorMap['bg-gray-100 text-gray-700'];

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="act-row"
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor: 'pointer',
        position: 'relative',
        animation: `actSlideUp 0.4s ease ${index * 0.04}s backwards`,
      }}
    >
      {/* Hover bar */}
      <div style={{
        position: 'absolute', left: 0, top: '15%',
        width: 3, height: '70%', borderRadius: '0 3px 3px 0',
        background: cs.color,
        opacity: isHovered ? 0.8 : 0,
        transition: 'opacity 0.25s',
        boxShadow: `0 0 6px ${cs.color}40`,
      }} />

      <div style={{ display: 'flex', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: cs.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          transition: 'all 0.25s',
          transform: isHovered ? 'scale(1.08) rotate(4deg)' : 'scale(1) rotate(0)',
        }}>
          {icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', gap: 10,
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'white', lineHeight: 1.5, margin: '0 0 4px' }}>
                <span style={{ fontWeight: 700, color: '#a5b4fc' }}>
                  {activity.user?.name || 'Unknown'}
                </span>
                {' '}
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {activity.description}
                </span>
              </p>

              {/* Meta badges */}
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {activity.user?.branch?.name && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(99,102,241,0.1)',
                      fontSize: 10, fontWeight: 500, color: '#a5b4fc',
                    }}>
                      🏢 {activity.user.branch.name}
                    </span>
                  )}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.05)',
                    fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.35)',
                  }}>
                    👤 {activity.user?.role?.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Time */}
            <span style={{
              padding: '4px 10px', borderRadius: 8,
              background: isHovered ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
              fontSize: 11, fontWeight: 600,
              color: isHovered ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap', transition: 'all 0.25s',
              flexShrink: 0,
            }}>
              {timeAgo(activity.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityFeedStyles() {
  return (
    <style jsx global>{`
      @keyframes actGradientSlide {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      @keyframes actPing {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.8); }
      }
      @keyframes actSlideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes actScaleIn {
        from { opacity: 0; transform: scale(0.92); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes actFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .act-refresh-btn:hover {
        background: rgba(255,255,255,0.1) !important;
        border-color: rgba(255,255,255,0.15) !important;
      }
      .act-filter-chip:hover {
        background: rgba(99,102,241,0.15) !important;
        color: #a5b4fc !important;
        border-color: rgba(99,102,241,0.3) !important;
      }
      .act-row:hover {
        transform: translateX(4px);
      }
      @media (max-width: 640px) {
        .act-row:hover { transform: none; }
      }
    `}</style>
  );
}