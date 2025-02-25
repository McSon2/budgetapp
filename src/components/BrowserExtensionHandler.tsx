'use client';

import { useEffect } from 'react';

/**
 * Component to handle browser extension conflicts
 * This component addresses issues with browser extensions like password managers
 * and autofill services that might cause errors in the application
 */
export function BrowserExtensionHandler() {
  useEffect(() => {
    // Handle the bootstrap-legacy-autofill-overlay error
    if (typeof window !== 'undefined') {
      // Create a more comprehensive dummy domQueryService to prevent errors
      // @ts-expect-error - Intentionally adding to window object
      window.domQueryService = {
        querySelector: (selector: string) => {
          try {
            return document.querySelector(selector);
          } catch {
            return null;
          }
        },
        querySelectorAll: (selector: string) => {
          try {
            return document.querySelectorAll(selector);
          } catch {
            return [];
          }
        },
        // Add additional methods that might be called by the extension
        contains: () => false,
        matches: () => false,
        closest: () => null,
        getAttribute: () => null,
        hasAttribute: () => false,
        getElementsByTagName: () => [],
        getElementsByClassName: () => [],
      };

      // Intercept console errors related to browser extensions
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // Filter out known browser extension errors
        const errorString = args.join(' ');
        if (
          errorString.includes('bootstrap-legacy-autofill-overlay') ||
          errorString.includes('domQueryService') ||
          errorString.includes('autofill') ||
          errorString.includes('notificationBar')
        ) {
          // Suppress these specific errors
          return;
        }

        // Pass through other errors
        originalConsoleError.apply(console, args);
      };

      // Intercept unhandled errors
      const originalOnError = window.onerror;
      window.onerror = function (message, source, lineno, colno, error) {
        if (
          source?.includes('bootstrap-legacy-autofill-overlay') ||
          source?.includes('notificationBar') ||
          message?.toString().includes('domQueryService')
        ) {
          // Prevent the error from bubbling up
          return true;
        }

        // Call the original handler for other errors
        if (originalOnError) {
          return originalOnError.apply(this, [message, source, lineno, colno, error]);
        }
        return false;
      };

      return () => {
        // Restore original handlers when component unmounts
        console.error = originalConsoleError;
        window.onerror = originalOnError;
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}
