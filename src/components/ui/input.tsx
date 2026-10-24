import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
const inputVariants = cva('flex w-full border border-input bg-white outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary disabled:opacity-50', {
  variants: { density: { default: 'h-10 rounded-lg px-3 text-sm', compact: 'h-8 rounded-md px-2 text-xs' } },
  defaultVariants: { density: 'default' },
});
export function Input({ className, density, ...props }: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return <input data-slot="input" className={cn(inputVariants({ density }), className)} {...props} />;
}
