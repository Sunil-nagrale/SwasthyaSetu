import React from 'react';
import { PhoneCall, AlertTriangle } from 'lucide-react';

export function EmergencyBanner() {
  return (
    <aside aria-label="Medical Emergency Helplines" className="bg-rose-600 text-white py-2 px-4 text-xs font-semibold tracking-wide">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-200" />
          <span>
            <strong>MEDICAL EMERGENCY?</strong> If experiencing severe chest pain, breathlessness, or trauma, seek immediate hospital emergency care.
          </span>
        </div>
        <div className="flex items-center gap-4 text-rose-100 shrink-0">
          <a href="tel:112" className="flex items-center gap-1.5 hover:text-white transition-colors bg-rose-700/60 px-2.5 py-1 rounded-md">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>National: <strong>112</strong></span>
          </a>
          <a href="tel:108" className="flex items-center gap-1.5 hover:text-white transition-colors bg-rose-700/60 px-2.5 py-1 rounded-md">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Ambulance: <strong>108</strong></span>
          </a>
        </div>
      </div>
    </aside>
  );
}
