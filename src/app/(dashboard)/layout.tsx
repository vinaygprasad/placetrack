import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/common/Navbar';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  let fullName: string | null = null;
  if (session.role === 'STUDENT' && session.userId) {
    const s = await prisma.student.findUnique({
      where: { id: session.userId },
      select: { fullName: true, name: true, surname: true, fullNameAsPerSSC: true },
    });
    if (s) {
      fullName = s.fullName || (s.surname ? `${s.name || ''} ${s.surname}`.trim() : s.name) || s.fullNameAsPerSSC || null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        user={{
          id: session.userId,
          name: fullName || session.userId,
          fullName: fullName,
          email: session.email,
          role: session.role,
          rollNo: session.userId,
        }}
      />
      <div className="flex-1 flex bg-slate-50 text-slate-900">{children}</div>
    </div>
  );
}
