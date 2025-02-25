'use client';

import { cn } from '@/lib/utils';
import React from 'react';

interface FormWrapperProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * A wrapper component for forms that adds attributes to prevent autofill issues
 */
export function FormWrapper({ children, className, ...props }: FormWrapperProps) {
  return (
    <form
      className={cn('space-y-4', className)}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck="false"
      data-form-type="other"
      data-lpignore="true"
      {...props}
    >
      {children}
    </form>
  );
}
