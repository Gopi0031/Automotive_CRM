// src/app/(dashboard)/layout.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      const small = window.innerWidth < 640;
      setSidebarWidth(isLargeScreen ? 256 : 0);
      setIsSmallScreen(small);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading || !mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '300px', width: '100%' }}>
          <div style={{
            position: 'relative',
            width: 'clamp(60px, 15vw, 80px)',
            height: 'clamp(60px, 15vw, 80px)',
            margin: '0 auto 24px'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(32px, 8vw, 40px)',
              fontWeight: '800',
              color: 'white'
            }}>
              🚗
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: '-8px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '24px',
                  animation: `spin ${2 - i * 0.3}s linear infinite`,
                  animationDelay: `${i * 0.15}s`
                }}
              />
            ))}
          </div>

          <h2 style={{
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: '800',
            color: 'white',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            AutoBill Pro
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 'clamp(13px, 3vw, 15px)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            Loading your dashboard...
          </p>
          
          <div style={{
            width: '100%',
            maxWidth: '200px',
            height: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            margin: '24px auto 0',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'white',
              borderRadius: '2px',
              animation: 'loadingBar 1.5s ease-in-out infinite'
            }} />
          </div>
        </div>
        
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.98); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes loadingBar {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 70%; margin-left: 15%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <div style={{
          marginLeft: `${sidebarWidth}px`,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <Navbar 
            user={user} 
            onMenuClick={() => setSidebarOpen(true)}
          />
          
          <main style={{
            flex: 1,
            padding: 'clamp(16px, 3vw, 32px)'
          }}>
            <div style={{
              maxWidth: '1600px',
              margin: '0 auto',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              {children}
            </div>
          </main>

          <footer style={{
            padding: '16px clamp(16px, 3vw, 24px)',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              maxWidth: '1600px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: isSmallScreen ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: 'clamp(12px, 2vw, 14px)',
              color: '#6b7280'
            }}>
              <p style={{ margin: 0 }}>
                © {new Date().getFullYear()} AutoBill Pro. All rights reserved.
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(12px, 3vw, 16px)',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {['Privacy', 'Terms', 'Support'].map((link) => (
                  <FooterLink key={link} label={link} />
                ))}
              </div>
            </div>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @media (max-width: 640px) {
          body {
            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
}

function FooterLink({ label }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="#"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        color: isHovered ? '#374151' : '#6b7280',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
        fontWeight: '500'
      }}
    >
      {label}
    </a>
  );
}