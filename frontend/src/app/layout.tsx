import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { EmergencyBanner } from '@/components/common/emergency-banner';
import { Navbar } from '@/components/common/navbar';
import { Footer } from '@/components/common/footer';

export const metadata: Metadata = {
  title: 'SwasthyaSetu - National Unified Health Gateway',
  description:
    'Search verified hospitals, doctors, and diagnostic tests. AI clinical triage, secure digital health records, and seamless appointment booking across India.',
  keywords: 'healthcare, hospitals, appointments, prescriptions, textract, medical records, doctors, India',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
        <AuthProvider>
          <ToastProvider>
            <EmergencyBanner />
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
