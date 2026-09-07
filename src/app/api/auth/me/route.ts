import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            fullName: true,
            branch: true,
            academicYear: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        academicYear: user.student?.academicYear || null,
        studentId: user.student?.id || null,
        rollNo: user.student?.id || null,
        name: user.student ? (user.student.fullName || `${user.student.name || ''} ${user.student.surname || ''}`.trim()) : 'Admin',
        branch: user.student?.branch || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
