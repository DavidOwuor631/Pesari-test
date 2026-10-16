import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Pesira Task Tracker',
  description: 'A Notion-inspired project and task management system built with Next.js and Spring Boot',
  keywords: ['project management', 'task tracker', 'notion', 'productivity'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
