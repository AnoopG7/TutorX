/**
 * FormCheckbox — Reusable checkbox component with error display
 */

import { forwardRef } from 'react';
import type { FieldError } from 'react-hook-form';

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="space-y-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={`h-4 w-4 rounded border ${
            error ? 'border-red-500' : 'border-border'
          } bg-background text-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        />
        {label && (
          <span className="text-sm font-medium text-foreground">{label}</span>
        )}
      </label>
      {error && (
        <p className="text-xs font-medium text-red-500">{error.message}</p>
      )}
    </div>
  )
);

FormCheckbox.displayName = 'FormCheckbox';
