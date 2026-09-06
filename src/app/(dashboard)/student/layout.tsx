import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/common/Sidebar';
import { Role } from '@prisma/client';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== Role.STUDENT) {
    redirect('/login');
  }

  return (
    <div className="flex-1 flex bg-slate-50 text-slate-900 min-h-screen">
      <Sidebar role={session.role} />
      <main className="flex-1 p-6 md:p-8 max-w-5xl overflow-x-hidden bg-slate-50">{children}</main>
    </div>
  );
}
