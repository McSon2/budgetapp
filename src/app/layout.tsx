import '@/app/globals.css';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { BrowserExtensionHandler } from '@/components/BrowserExtensionHandler';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Budget App - Personal Finance Management',
  description: 'Track your expenses, manage your budget, and plan your financial future',
  other: {
    'format-detection': 'telephone=no',
    robots: 'noarchive',
    autocomplete: 'off',
    'password-manager': 'disable',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
        <meta name="autocomplete" content="off" />

        {/* Script pour bloquer les erreurs d'autofill avant l'exécution du JS de l'extension */}
        <Script id="browser-extension-blocker" strategy="beforeInteractive">
          {`
            (function() {
              // Définir domQueryService avant que les extensions ne le cherchent
              window.domQueryService = {
                querySelector: function() { return null; },
                querySelectorAll: function() { return []; },
                contains: function() { return false; },
                matches: function() { return false; },
                closest: function() { return null; },
                getAttribute: function() { return null; },
                hasAttribute: function() { return false; },
                getElementsByTagName: function() { return []; },
                getElementsByClassName: function() { return []; }
              };
              
              // Intercepter les erreurs globales
              window.addEventListener('error', function(event) {
                if (event.filename && (
                  event.filename.includes('bootstrap-legacy-autofill-overlay') ||
                  event.filename.includes('notificationBar') ||
                  (event.error && event.error.stack && (
                    event.error.stack.includes('bootstrap-legacy-autofill-overlay') ||
                    event.error.stack.includes('notificationBar') ||
                    event.error.stack.includes('domQueryService')
                  ))
                )) {
                  event.preventDefault();
                  event.stopPropagation();
                  return false;
                }
              }, true);
            })();
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <BrowserExtensionHandler />
            {children}
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
