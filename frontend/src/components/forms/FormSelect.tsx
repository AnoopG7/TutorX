/**
 * FormSelect — Reusable select component with error display
 */

import { forwardRef } from 'react';
import type { FieldError } from 'react-hook-form';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: FieldError;
  options: { value: string | number; label: string }[];
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full px-3 py-2 rounded border ${
          error ? 'border-red-500' : 'border-border'
        } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs font-medium text-red-500">{error.message}</p>
      )}
    </div>
  )
);

FormSelect.displayName = 'FormSelect';
