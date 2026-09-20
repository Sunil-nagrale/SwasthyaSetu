import HospitalDetailClient from './hospital-detail-client';

export async function generateStaticParams() {
  return [
    { hospitalId: '11111111-1111-1111-1111-111111111111' },
    { hospitalId: '22222222-2222-2222-2222-222222222222' },
    { hospitalId: '33333333-3333-3333-3333-333333333333' },
    { hospitalId: '44444444-4444-4444-4444-444444444444' },
    { hospitalId: '55555555-5555-5555-5555-555555555555' },
    { hospitalId: '66666666-6666-6666-6666-666666666666' },
    { hospitalId: '77777777-7777-7777-7777-777777777777' },
    { hospitalId: '88888888-8888-8888-8888-888888888888' },
    { hospitalId: '99999999-9999-9999-9999-999999999999' },
    { hospitalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  ];
}

export default function Page() {
  return <HospitalDetailClient />;
}
