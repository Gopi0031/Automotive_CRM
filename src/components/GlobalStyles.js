// src/components/GlobalStyles.js
'use client';

export default function GlobalStyles() {
  return (
    <style jsx global>{`
      /* ═══════════════════════════════════════
         GLOBAL RESETS & UTILITIES
         ═══════════════════════════════════════ */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
        -webkit-text-size-adjust: 100%;
      }

      body {
        margin: 0;
        padding: 0;
        overflow-x: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background: #0a0e1a;
        color: white;
        min-height: 100vh;
      }

      /* Focus styles */
      :focus-visible {
        outline: 2px solid rgba(99, 102, 241, 0.5);
        outline-offset: 2px;
        border-radius: 4px;
      }

      /* Selection */
      ::selection {
        background: rgba(99, 102, 241, 0.3);
        color: white;
      }

      /* Scrollbar */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.25);
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.45);
      }

      /* Remove tap highlight on mobile */
      * {
        -webkit-tap-highlight-color: transparent;
      }

      /* Smooth images */
      img {
        max-width: 100%;
        height: auto;
        display: block;
      }

      /* Links */
      a {
        color: inherit;
        text-decoration: none;
      }

      /* Buttons & inputs base */
      button,
      input,
      textarea,
      select {
        font-family: inherit;
      }

      /* ═══════════════════════════════════════
         TOAST ANIMATIONS
         ═══════════════════════════════════════ */
      [data-sonner-toaster] [data-sonner-toast],
      div[class*="go"] {
        animation: toastSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }

      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(20px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      /* ═══════════════════════════════════════
         GLASS CARD UTILITY
         ═══════════════════════════════════════ */
      .glass-card {
        background: rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .glass-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.12);
      }

      /* ═══════════════════════════════════════
         RESPONSIVE
         ═══════════════════════════════════════ */
      @media (max-width: 640px) {
        body {
          font-size: 14px;
        }
      }

      /* Safe area for notched devices */
      @supports (padding: max(0px)) {
        body {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      }

      /* Reduce motion */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}