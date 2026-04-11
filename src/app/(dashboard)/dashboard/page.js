// src/app/(dashboard)/dashboard/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ActivityFeed from '../../../components/ActivityFeed';

// Global styles component
function GlobalStyles() {
  return (
    <style jsx global>{`
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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

      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }

      .content-grid {
        display: grid;
        gap: clamp(16px, 3vw, 24px);
      }

      .cashier-grid {
        display: grid;
        gap: clamp(16px, 3vw, 24px);
      }

      @media (min-width: 1024px) {
        .content-grid {
          grid-template-columns: 2fr 1fr;
        }
        .cashier-grid {
          grid-template-columns: 1fr 2fr;
        }
      }

      .container {
        padding: clamp(16px, 3vw, 32px);
      }
    `}</style>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchDashboardData(parsedUser.role);
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchDashboardData = async (role) => {
    try {
      const response = await fetch(`/api/dashboard?role=${role}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <GlobalStyles />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '300px', width: '100%' }}>
            <div style={{ 
              width: 'clamp(48px, 15vw, 64px)',
              height: 'clamp(48px, 15vw, 64px)',
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
                    border: 'clamp(3px, 1vw, 4px) solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    animation: `rotate ${1.5 - i * 0.2}s linear infinite`,
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              ))}
            </div>
            <p style={{ 
              color: 'white', 
              marginTop: 'clamp(16px, 4vw, 24px)',
              fontSize: 'clamp(14px, 3vw, 16px)',
              fontWeight: '500'
            }}>
              Loading your dashboard...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      {(() => {
        switch (user?.role) {
          case 'SUPER_ADMIN':
            return <SuperAdminDashboard user={user} stats={stats} isMobile={isMobile} />;
          case 'MANAGER':
            return <ManagerDashboard user={user} stats={stats} isMobile={isMobile} />;
          case 'EMPLOYEE':
            return <EmployeeDashboard user={user} stats={stats} isMobile={isMobile} />;
          case 'CASHIER':
            return <CashierDashboard user={user} stats={stats} isMobile={isMobile} />;
          default:
            return <DefaultDashboard user={user} />;
        }
      })()}
    </>
  );
}

function SuperAdminDashboard({ user, stats, isMobile }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 'clamp(12px, 2vw, 16px)'
    }}>
      <div className="container">
        {/* Welcome Header */}
        <div style={{
          marginBottom: 'clamp(24px, 4vw, 32px)',
          animation: 'fadeInDown 0.6s ease-out'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'clamp(8px, 2vw, 12px)',
            marginBottom: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ 
              fontSize: isMobile ? '32px' : 'clamp(32px, 6vw, 40px)',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}>
              👑
            </span>
            <h1 style={{
              fontSize: isMobile ? '20px' : 'clamp(24px, 5vw, 32px)',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              Welcome back, {isMobile ? user.name.split(' ')[0] : user.name}!
            </h1>
          </div>
          <p style={{ 
            color: '#64748b',
            fontSize: isMobile ? '13px' : 'clamp(14px, 2vw, 16px)',
            fontWeight: '500',
            margin: 0
          }}>
            Super Admin Dashboard - {isMobile ? 'Overview' : 'Complete system overview'}
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 'clamp(12px, 2vw, 16px)',
          marginBottom: 'clamp(24px, 4vw, 32px)'
        }}>
          <StatCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue?.toLocaleString() || 0}`}
            icon="💰"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            change="+12.5%"
            index={0}
            isMobile={isMobile}
          />
          <StatCard
            title="Active Jobs"
            value={stats.activeJobs || 0}
            icon="🔧"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            change="+5"
            index={1}
            isMobile={isMobile}
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers || 0}
            icon="👥"
            gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
            change="+23"
            index={2}
            isMobile={isMobile}
          />
          <StatCard
            title="All Branches"
            value={stats.totalBranches || 0}
            icon="🏢"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            index={3}
            isMobile={isMobile}
          />
        </div>

        {/* Main Content */}
        <div style={{ marginBottom: 'clamp(16px, 3vw, 24px)' }}>
          <div className="content-grid">
            <div style={{ animation: 'scaleIn 0.6s ease-out 0.3s backwards' }}>
              <ActivityFeed maxHeight={isMobile ? "400px" : "600px"} />
            </div>

            <QuickActionsCard isMobile={isMobile} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerDashboard({ user, stats, isMobile }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 'clamp(12px, 2vw, 16px)'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <DashboardHeader 
          emoji="👔"
          title={`Welcome, ${isMobile ? user.name.split(' ')[0] : user.name}!`}
          subtitle={isMobile ? "Branch overview" : "Manager Dashboard - Branch overview"}
          isMobile={isMobile}
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 'clamp(12px, 2vw, 16px)',
          marginBottom: 'clamp(24px, 4vw, 32px)'
        }}>
          <StatCard
            title="Branch Revenue"
            value={`₹${stats.branchRevenue?.toLocaleString() || 0}`}
            icon="💰"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            index={0}
            isMobile={isMobile}
          />
          <StatCard
            title="Pending Jobs"
            value={stats.pendingJobs || 0}
            icon="⏳"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            index={1}
            isMobile={isMobile}
          />
          <StatCard
            title="Team Members"
            value={stats.teamMembers || 0}
            icon="👥"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            index={2}
            isMobile={isMobile}
          />
          <StatCard
            title="Today's Jobs"
            value={stats.todaysJobs || 0}
            icon="📋"
            gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
            index={3}
            isMobile={isMobile}
          />
        </div>

        <div style={{ marginBottom: 'clamp(24px, 4vw, 32px)' }}>
          <ActivityFeed maxHeight={isMobile ? "400px" : "500px"} />
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ user, stats, isMobile }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 'clamp(12px, 2vw, 16px)'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <DashboardHeader 
          emoji="🔧"
          title={`Hello, ${isMobile ? user.name.split(' ')[0] : user.name}!`}
          subtitle={isMobile ? "Your work" : "Technician Dashboard - Your work overview"}
          isMobile={isMobile}
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 'clamp(12px, 2vw, 16px)',
          marginBottom: 'clamp(24px, 4vw, 32px)'
        }}>
          <StatCard
            title="Assigned Jobs"
            value={stats.assignedJobs || 0}
            icon="📋"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            index={0}
            isMobile={isMobile}
          />
          <StatCard
            title="In Progress"
            value={stats.inProgressJobs || 0}
            icon="⚡"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            index={1}
            isMobile={isMobile}
          />
          <StatCard
            title="Completed Today"
            value={stats.completedToday || 0}
            icon="✅"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            index={2}
            isMobile={isMobile}
          />
          <StatCard
            title="This Week"
            value={stats.completedThisWeek || 0}
            icon="📊"
            gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
            index={3}
            isMobile={isMobile}
          />
        </div>

        <ActivityFeed maxHeight={isMobile ? "400px" : "500px"} />
      </div>
    </div>
  );
}

function CashierDashboard({ user, stats, isMobile }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 'clamp(12px, 2vw, 16px)'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <DashboardHeader 
          emoji="💰"
          title={`Hello, ${isMobile ? user.name.split(' ')[0] : user.name}!`}
          subtitle={isMobile ? "Billing" : "Cashier Dashboard - Billing & Payments"}
          isMobile={isMobile}
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 'clamp(12px, 2vw, 16px)',
          marginBottom: 'clamp(24px, 4vw, 32px)'
        }}>
          <StatCard
            title="Today's Collection"
            value={`₹${stats.todaysCollection?.toLocaleString() || 0}`}
            icon="💵"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            index={0}
            isMobile={isMobile}
          />
          <StatCard
            title="Pending Invoices"
            value={stats.pendingInvoices || 0}
            icon="📄"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            index={1}
            isMobile={isMobile}
          />
          <StatCard
            title="Payments Today"
            value={stats.paymentsToday || 0}
            icon="💳"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            index={2}
            isMobile={isMobile}
          />
          <StatCard
            title="Overdue"
            value={stats.overdueInvoices || 0}
            icon="⚠️"
            gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            index={3}
            isMobile={isMobile}
          />
        </div>

        <div className="cashier-grid">
          <QuickActionsCard cashier isMobile={isMobile} />
          <ActivityFeed maxHeight={isMobile ? "400px" : "500px"} />
        </div>
      </div>
    </div>
  );
}

function DefaultDashboard({ user }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 'clamp(16px, 3vw, 24px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        textAlign: 'center',
        animation: 'scaleIn 0.6s ease-out',
        padding: '20px'
      }}>
        <h1 style={{
          fontSize: 'clamp(24px, 6vw, 32px)',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px'
        }}>
          Welcome, {user?.name}!
        </h1>
        <p style={{ 
          color: '#64748b',
          fontSize: 'clamp(14px, 3vw, 16px)'
        }}>
          Your dashboard is being set up...
        </p>
      </div>
    </div>
  );
}

// Reusable Components
function DashboardHeader({ emoji, title, subtitle, isMobile }) {
  return (
    <div style={{
      marginBottom: 'clamp(24px, 4vw, 32px)',
      animation: 'fadeInDown 0.6s ease-out'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'clamp(8px, 2vw, 12px)',
        marginBottom: '8px',
        flexWrap: 'wrap'
      }}>
        <span style={{ 
          fontSize: isMobile ? '32px' : 'clamp(32px, 6vw, 40px)',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}>
          {emoji}
        </span>
        <h1 style={{
          fontSize: isMobile ? '20px' : 'clamp(24px, 5vw, 32px)',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
          margin: 0
        }}>
          {title}
        </h1>
      </div>
      <p style={{ 
        color: '#64748b',
        fontSize: isMobile ? '13px' : 'clamp(14px, 2vw, 16px)',
        fontWeight: '500',
        margin: 0
      }}>
        {subtitle}
      </p>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, change, index, isMobile }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered(!isHovered)}
      style={{
        background: 'white',
        borderRadius: isMobile ? '16px' : '20px',
        padding: isMobile ? '16px' : 'clamp(16px, 3vw, 24px)',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0,0,0,0.12)'
          : '0 4px 12px rgba(0,0,0,0.05)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered && !isMobile ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        animation: `scaleIn 0.5s ease-out ${index * 0.1}s backwards`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        touchAction: 'manipulation'
      }}
    >
      {/* Background gradient on hover */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: isMobile ? '100px' : '150px',
        height: isMobile ? '100px' : '150px',
        background: gradient,
        borderRadius: '50%',
        opacity: isHovered ? 0.05 : 0,
        transform: 'translate(50%, -50%)',
        transition: 'opacity 0.4s ease'
      }} />

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: isMobile ? '12px' : '16px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ 
            fontSize: isMobile ? '11px' : 'clamp(11px, 2vw, 13px)',
            color: '#64748b',
            fontWeight: '600',
            marginBottom: isMobile ? '6px' : '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </p>
          <p style={{ 
            fontSize: isMobile ? '20px' : 'clamp(20px, 4vw, 32px)',
            fontWeight: '800',
            color: '#1a202c',
            marginBottom: '4px',
            letterSpacing: '-0.5px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {value}
          </p>
          {change && (
            <p style={{ 
              fontSize: isMobile ? '11px' : 'clamp(11px, 2vw, 13px)',
              fontWeight: '600',
              color: change.startsWith('+') ? '#10b981' : '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{change.startsWith('+') ? '↑' : '↓'}</span>
              {change}
            </p>
          )}
        </div>
        <div style={{
          width: isMobile ? '48px' : 'clamp(48px, 10vw, 64px)',
          height: isMobile ? '48px' : 'clamp(48px, 10vw, 64px)',
          background: gradient,
          borderRadius: isMobile ? '14px' : '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? '24px' : 'clamp(24px, 5vw, 32px)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered && !isMobile ? 'rotate(10deg) scale(1.1)' : 'rotate(0deg) scale(1)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          flexShrink: 0
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickActionsCard({ cashier, isMobile }) {
  const actions = cashier ? [
    { label: 'Create Invoice', icon: '📝', href: '/invoices/new', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
    { label: 'Record Payment', icon: '💰', href: '/payments/new', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { label: 'View Reports', icon: '📊', href: '/reports', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
  ] : [
    { label: 'Manage Users', icon: '👤', href: '/users', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
    { label: 'View Reports', icon: '📊', href: '/reports', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
    { label: 'Manage Branches', icon: '🏢', href: '/branches', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    { label: 'System Settings', icon: '⚙️', href: '/settings', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: isMobile ? '20px' : '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      padding: isMobile ? '20px' : 'clamp(20px, 3vw, 24px)',
      animation: 'scaleIn 0.6s ease-out 0.4s backwards'
    }}>
      <h2 style={{ 
        fontSize: isMobile ? '18px' : 'clamp(18px, 3vw, 20px)',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: isMobile ? '16px' : '20px',
        letterSpacing: '-0.5px'
      }}>
        Quick Actions
      </h2>
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '10px' : '12px'
      }}>
        {actions.map((action, index) => (
          <QuickActionButton 
            key={action.href}
            {...action}
            index={index}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

function QuickActionButton({ label, icon, href, gradient, index, isMobile }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (isMobile) {
          setIsHovered(!isHovered);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '12px' : '16px',
        padding: isMobile ? '12px' : '16px',
        borderRadius: isMobile ? '14px' : '16px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isHovered ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
        border: '2px solid',
        borderColor: isHovered ? 'rgba(102, 126, 234, 0.2)' : 'rgba(0,0,0,0.05)',
        textDecoration: 'none',
        transform: isHovered && !isMobile ? 'translateX(8px)' : 'translateX(0)',
        cursor: 'pointer',
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s backwards`,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <div style={{
        width: isMobile ? '44px' : '48px',
        height: isMobile ? '44px' : '48px',
        background: gradient,
        borderRadius: isMobile ? '12px' : '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? '20px' : '24px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered && !isMobile ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
        boxShadow: isHovered ? '0 8px 16px rgba(0,0,0,0.15)' : '0 4px 8px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <span style={{ 
        fontWeight: '600',
        color: isHovered ? '#667eea' : '#1a202c',
        fontSize: isMobile ? '14px' : 'clamp(14px, 2vw, 15px)',
        transition: 'color 0.3s ease',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {label}
      </span>
      {!isMobile && (
        <svg 
          style={{ 
            marginLeft: 'auto',
            width: '20px',
            height: '20px',
            color: isHovered ? '#667eea' : '#cbd5e0',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
            flexShrink: 0
          }} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </a>
  );
}