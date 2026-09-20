import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, Heart, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-white">
                Swasthya<span className="text-primary-400">Setu</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              India&apos;s unified open digital health gateway bridging citizens, hospitals, verified doctors, and digital health records.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Compliant with National Digital Health standards</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Public Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/hospitals" className="hover:text-white transition-colors">
                  Find Hospitals & Clinics
                </Link>
              </li>
              <li>
                <Link href="/get-diagnosed" className="hover:text-white transition-colors">
                  AI Symptom Guidance & Triage
                </Link>
              </li>
              <li>
                <Link href="/auth" className="hover:text-white transition-colors">
                  Citizen Portal Access
                </Link>
              </li>
            </ul>
          </div>

          {/* Healthcare Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Portals & Records</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Patient Health Records (PHR)
                </Link>
              </li>
              <li>
                <Link href="/dashboard/prescriptions" className="hover:text-white transition-colors">
                  Prescriptions & OCR
                </Link>
              </li>
              <li>
                <Link href="/dashboard/calendar" className="hover:text-white transition-colors">
                  Health & Medication Calendar
                </Link>
              </li>
              <li>
                <Link href="/hospital-admin" className="hover:text-white transition-colors">
                  Hospital Admin Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Emergency & Helplines */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Emergency Numbers</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>National Emergency: <strong>112</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>Medical Ambulance: <strong>108</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>National Health Helpline: <strong>1075</strong></span>
              </div>
              <div className="flex items-center gap-2 pt-1 text-slate-400">
                <Mail className="w-3.5 h-3.5" />
                <span>support@swasthyasetu.gov.in</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SwasthyaSetu. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with care for public health <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
