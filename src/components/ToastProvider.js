// src/components/ToastProvider.js
'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={10}
      containerStyle={{
        top: 20,
        right: 20,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'rgba(15, 23, 42, 0.92)',
          color: '#e2e8f0',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '14px 18px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow:
            '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.04)',
          maxWidth: '420px',
        },
        success: {
          duration: 3000,
          style: {
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#34d399',
            border: '1px solid rgba(52, 211, 153, 0.25)',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#0f172a',
          },
        },
        error: {
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.25)',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#0f172a',
          },
        },
        loading: {
          style: {
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#93c5fd',
            border: '1px solid rgba(147, 197, 253, 0.2)',
          },
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#0f172a',
          },
        },
      }}
    />
  );
}