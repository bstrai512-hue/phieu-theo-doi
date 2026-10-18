import * as React from 'react';
import {cn} from '../../lib/utils';
export function Input({className,...props}:React.ComponentProps<'input'>) {return <input className={cn('flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary disabled:opacity-50',className)} {...props}/>;}
