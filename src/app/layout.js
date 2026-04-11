// app/layout.js
import './globals.css';
import GlobalStyles from '@/components/GlobalStyles';
import ToastProvider from '@/components/ToastProvider';

export const metadata = {
  title: 'AutoBill Pro - Automotive Billing System',
  description: 'Modern Garage CRM and Billing Management Platform',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0e1a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GlobalStyles />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}