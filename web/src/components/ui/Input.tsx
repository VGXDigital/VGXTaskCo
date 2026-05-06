// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'rounded-md border px-3 py-2 text-sm outline-none transition-colors',
            'bg-white text-gray-900 placeholder-gray-400',
            'dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500',
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
