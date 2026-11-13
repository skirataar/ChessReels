'use client';

import React from 'react';
import { haptics, HapticPattern } from '@/lib/haptics';

export interface HapticButtonProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  pattern?: HapticPattern;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLLabelElement>) => void;
  title?: string;
  'data-testid'?: string;
  'aria-label'?: string;
}

export const HapticButton = React.forwardRef<HTMLLabelElement, HapticButtonProps>(
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
      onKeyDown,
      ...props
    },
    ref
  ) => {
    return (
      <label
        ref={ref}
        htmlFor={disabled ? undefined : 'doomchess-native-taptic-switch'}
        role="button"
        tabIndex={disabled ? -1 : 0}
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
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            (e.currentTarget as HTMLLabelElement).click();
          }
          onKeyDown?.(e);
        }}
        className={`inline-flex items-center justify-center select-none ${
          disabled ? 'pointer-events-none opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
        {...props}
      >
        {children}
      </label>
    );
  }
);

HapticButton.displayName = 'HapticButton';

