// src/components/ActivityFeed.js
'use client';

import { useState, useEffect } from 'react';
import { useActivities } from '../hooks/useActivities';
import { ActivityIcons, getActivityColor } from '../lib/activityService';

export default function ActivityFeed({ 
  maxHeight = '500px', 
  showHeader = true,
  limit = 20 
}) {
  const { activities, loading, error, refresh } = useActivities(5000);
  const [filter, setFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.entity === filter;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading && activities.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '24px',
        padding: '48px',
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background gradient */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'rotate 20s linear infinite',
        }} />
        
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <LoadingSpinner />
          <p style={{ color: 'white', marginTop: '24px', fontSize: '16px', fontWeight: '500' }}>
            Loading activities...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        borderRadius: '24px',
        padding: '48px',
        boxShadow: '0 20px 60px rgba(240, 147, 251, 0.3)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            backdropFilter: 'blur(10px)'
          }}>
            <svg style={{ width: '32px', height: '32px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p style={{ color: 'white', fontWeight: '600', fontSize: '18px' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '24px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.05)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {showHeader && (
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1
          }}>
            <div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: 'white',
                marginBottom: '4px',
                letterSpacing: '-0.5px'
              }}>
                Recent Activity
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'rgba(255,255,255,0.8)',
                fontWeight: '400'
              }}>
                Live updates from your team
              </p>
            </div>
            <button
              onClick={handleRefresh}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Refresh"
            >
              <svg style={{ width: '20px', height: '20px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Filter Pills */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginTop: '20px', 
            overflowX: 'auto',
            paddingBottom: '8px',
            position: 'relative',
            zIndex: 1
          }}>
            {['all', 'User', 'Job', 'Invoice', 'Payment', 'Customer'].map((filterOption) => (
              <FilterPill
                key={filterOption}
                active={filter === filterOption}
                onClick={() => setFilter(filterOption)}
                label={filterOption === 'all' ? 'All Activity' : filterOption}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ 
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {filteredActivities.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div>
            {filteredActivities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                formatTimeAgo={formatTimeAgo}
                index={index}
                isHovered={hoveredItem === activity.id}
                onHover={() => setHoveredItem(activity.id)}
                onLeave={() => setHoveredItem(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div style={{ 
      width: '56px', 
      height: '56px', 
      margin: '0 auto',
      position: 'relative'
    }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            animation: `rotate ${1.5 - i * 0.2}s linear infinite`,
            animationDelay: `${i * 0.15}s`
          }}
        />
      ))}
    </div>
  );
}

// Filter Pill Component
function FilterPill({ active, onClick, label }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '8px 20px',
        fontSize: '13px',
        fontWeight: '600',
        borderRadius: '20px',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: active 
          ? 'white'
          : isHovered 
            ? 'rgba(255,255,255,0.15)' 
            : 'rgba(255,255,255,0.1)',
        color: active ? '#667eea' : 'white',
        border: active ? '2px solid white' : '2px solid rgba(255,255,255,0.2)',
        transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
        boxShadow: active 
          ? '0 8px 16px rgba(255,255,255,0.3)' 
          : isHovered 
            ? '0 4px 12px rgba(255,255,255,0.2)' 
            : 'none',
      }}
    >
      {label}
    </button>
  );
}

// Empty State Component
function EmptyState({ filter }) {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '80px 24px',
      animation: 'scaleIn 0.5s ease-out'
    }}>
      <div style={{
        width: '120px',
        height: '120px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
        animation: 'float 3s ease-in-out infinite',
        transform: 'rotate(-5deg)'
      }}>
        <svg style={{ width: '60px', height: '60px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 style={{ 
        fontSize: '22px', 
        fontWeight: '700', 
        color: '#1a202c',
        marginBottom: '8px',
        letterSpacing: '-0.5px'
      }}>
        No recent activity
      </h3>
      <p style={{ 
        color: '#718096', 
        fontSize: '15px',
        maxWidth: '300px',
        margin: '0 auto'
      }}>
        {filter !== 'all' ? 'Try changing the filter to see more activities' : 'Activity will appear here as your team works'}
      </p>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity, formatTimeAgo, index, isHovered, onHover, onLeave }) {
  const icon = ActivityIcons[activity.action] || '📌';
  const colorClass = getActivityColor(activity.action);
  
  // Convert Tailwind classes to inline styles
  const getColorStyles = (colorClass) => {
    const colorMap = {
      'bg-blue-100 text-blue-700': { background: '#dbeafe', color: '#1d4ed8' },
      'bg-gray-100 text-gray-700': { background: '#f3f4f6', color: '#374151' },
      'bg-green-100 text-green-700': { background: '#d1fae5', color: '#047857' },
      'bg-yellow-100 text-yellow-700': { background: '#fef3c7', color: '#b45309' },
      'bg-red-100 text-red-700': { background: '#fee2e2', color: '#b91c1c' },
      'bg-purple-100 text-purple-700': { background: '#ede9fe', color: '#6d28d9' },
      'bg-orange-100 text-orange-700': { background: '#ffedd5', color: '#c2410c' },
    };
    return colorMap[colorClass] || colorMap['bg-gray-100 text-gray-700'];
  };

  const iconStyles = getColorStyles(colorClass);

  return (
    <div 
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isHovered 
          ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)'
          : 'white',
        transform: isHovered ? 'translateX(8px)' : 'translateX(0)',
        cursor: 'pointer',
        animation: `fadeInUp 0.5s ease-out ${index * 0.05}s backwards`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Hover gradient effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: isHovered ? 0 : '-100%',
        width: '4px',
        height: '100%',
        background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />

      <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '16px',
          ...iconStyles,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
          boxShadow: isHovered ? '0 8px 16px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
        }}>
          {icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ 
                fontSize: '15px', 
                color: '#1a202c',
                lineHeight: '1.6',
                marginBottom: '6px'
              }}>
                <span style={{ fontWeight: '700', color: '#667eea' }}>
                  {activity.user?.name || 'Unknown User'}
                </span>
                {' '}
                <span style={{ color: '#4a5568' }}>
                  {activity.description}
                </span>
              </p>
              
              {/* Metadata */}
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  {activity.user?.branch?.name && (
                    <MetadataBadge
                      icon={
                        <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      }
                      text={activity.user.branch.name}
                    />
                  )}
                  <MetadataBadge
                    icon={
                      <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                    text={activity.user?.role?.replace('_', ' ')}
                  />
                </div>
              )}
            </div>

            {/* Time Badge */}
            <div style={{
              padding: '6px 14px',
              background: isHovered ? 'rgba(102, 126, 234, 0.1)' : 'rgba(0,0,0,0.04)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              color: isHovered ? '#667eea' : '#718096',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              {formatTimeAgo(activity.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metadata Badge Component
function MetadataBadge({ icon, text }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: 'rgba(102, 126, 234, 0.08)',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#667eea'
    }}>
      {icon}
      <span>{text}</span>
    </div>
  );
}