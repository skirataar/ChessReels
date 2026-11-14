'use client';

import React from 'react';
import { haptics, HapticPattern } from '@/lib/haptics';

export interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pattern?: HapticPattern;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  'data-testid'?: string;
  'aria-label'?: string;
}

export const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
  (
    {
      pattern = 'button',
      disabled = false,
      children,
      className = '',
      onClick,
      title,
      'data-testid': testId,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        title={title}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          haptics.trigger(pattern);
          onClick?.(e);
        }}
        className={`relative inline-flex items-center justify-center select-none ${
          disabled ? 'pointer-events-none opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
        {...props}
      >
        {!disabled && (
          <label
            htmlFor="doomchess-native-taptic-switch"
            className="absolute inset-0 cursor-pointer z-10"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

HapticButton.displayName = 'HapticButton';
