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
      // Create a dummy domQueryService to prevent errors
      // @ts-expect-error - Intentionally adding to window object
      window.domQueryService = window.domQueryService || {
        querySelector: () => null,
        querySelectorAll: () => [],
      };

      // Intercept console errors related to browser extensions
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // Filter out known browser extension errors
        const errorString = args.join(' ');
        if (
          errorString.includes('bootstrap-legacy-autofill-overlay') ||
          errorString.includes('domQueryService')
        ) {
          // Suppress these specific errors
          return;
        }

        // Pass through other errors
        originalConsoleError.apply(console, args);
      };

      return () => {
        // Restore original console.error when component unmounts
        console.error = originalConsoleError;
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}
