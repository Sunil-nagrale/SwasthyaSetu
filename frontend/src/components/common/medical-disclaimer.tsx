import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MedicalDisclaimer({ className, text }: { className?: string; text?: string }) {
  const defaultText =
    text ||
    'SwasthyaSetu AI guidance and records extraction provide clinical information support only. It does not constitute formal medical diagnosis, treatment prescription, or emergency care. Always consult a certified healthcare professional.';

  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900',
        className
      )}
    >
      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
      <p className="leading-relaxed">{defaultText}</p>
    </div>
  );
}
