import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: {
        id_role_academicYear: {
          id: session.userId,
          role: session.role,
          academicYear: session.academicYear || 'NA',
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        academicYear: true,
        isActive: true,
        isVerified: true,
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            branch: true,
            academicYear: true,
          },
        },
      },
    });

    if (!user && session.userId && session.role) {
      user = await prisma.user.findFirst({
        where: {
          id: session.userId,
          role: session.role,
        },
        select: {
          id: true,
          email: true,
          role: true,
          academicYear: true,
          isActive: true,
          isVerified: true,
          student: {
            select: {
              id: true,
              name: true,
              surname: true,
              branch: true,
              academicYear: true,
            },
          },
        },
      });
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        academicYear: user.academicYear,
        studentId: user.student?.id || null,
        rollNo: user.student?.id || null,
        name: user.student ? `${user.student.name} ${user.student.surname || ''}`.trim() : 'Admin',
        branch: user.student?.branch || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
