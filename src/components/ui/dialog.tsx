import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type {ReactNode} from 'react';
import { cn } from '../../lib/utils';
export const Dialog=DialogPrimitive.Root;
export function DialogContent({children,title,description,className}:{children:ReactNode,title:string,description:string,className?:string}) {return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm"/><DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl",className)}><DialogPrimitive.Title className="text-xl font-semibold">{title}</DialogPrimitive.Title><DialogPrimitive.Description className="mt-2 mb-6 text-sm text-muted-foreground">{description}</DialogPrimitive.Description><DialogPrimitive.Close aria-label="Đóng" className="absolute right-4 top-4 rounded p-1 hover:bg-muted"><X size={18}/></DialogPrimitive.Close>{children}</DialogPrimitive.Content></DialogPrimitive.Portal>;}
