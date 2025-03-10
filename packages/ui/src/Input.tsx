import clsx from 'clsx';
import dynamic from 'next/dynamic';
import type { ComponentProps, ReactNode } from 'react';
import { forwardRef, useId } from 'react';

import { FieldError } from './Form';

const HelpTooltip = dynamic(() => import('./HelpTooltip'));

interface InputProps extends Omit<ComponentProps<'input'>, 'prefix'> {
  label?: string;
  prefix?: string | ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  helper?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    prefix,
    type = 'text',
    iconLeft,
    iconRight,
    error,
    className = '',
    helper,
    ...props
  },
  ref
) {
  const id = useId();

  const iconStyles = [
    'text-zinc-500 [&>*]:peer-focus:text-brand [&>*]:h-5',
    { '!text-red-500 [&>*]:peer-focus:!text-red-500': error }
  ];

  return (
    <label className="w-full" htmlFor={id}>
      {label ? (
        <div className="mb-1 flex items-center space-x-1.5">
          <div className="font-medium text-gray-800 dark:text-gray-200">
            {label}
          </div>
          <HelpTooltip content={helper} />
        </div>
      ) : null}
      <div className="flex">
        {prefix ? (
          <span className="lt-text-gray-500 inline-flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 px-3 dark:border-gray-700 dark:bg-gray-900">
            {prefix}
          </span>
        ) : null}
        <div
          className={clsx(
            { 'bg-gray-500/20 opacity-60': props.disabled },
            error ? '!border-red-500' : 'focus-within:ring-1',
            prefix ? 'rounded-r-xl' : 'rounded-xl',
            'focus-within:border-brand-500 focus-within:ring-brand-400 flex w-full items-center border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900'
          )}
        >
          <input
            id={id}
            className={clsx(
              { 'placeholder:text-red-500': error },
              prefix ? 'rounded-r-xl' : 'rounded-xl',
              'peer w-full border-none bg-transparent outline-none focus:ring-0',
              className
            )}
            type={type}
            ref={ref}
            {...props}
          />
          <span
            tabIndex={-1}
            className={clsx({ 'order-first pl-3': iconLeft }, iconStyles)}
          >
            {iconLeft}
          </span>
          <span
            tabIndex={-1}
            className={clsx({ 'order-last pr-3': iconRight }, iconStyles)}
          >
            {iconRight}
          </span>
        </div>
      </div>
      {props.name ? <FieldError name={props.name} /> : null}
    </label>
  );
});
