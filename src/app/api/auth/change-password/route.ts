import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, comparePassword, hashPassword, clearSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Current password and a new password (min 8 characters) are required.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id_role_academicYear: {
          id: session.userId,
          role: session.role,
          academicYear: session.academicYear || 'NA',
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: {
        id_role_academicYear: {
          id: user.id,
          role: user.role,
          academicYear: user.academicYear,
        },
      },
      data: { passwordHash: newHash },
    });

    // Clear session cookie to force logout on password change
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully! Logging out...',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to change password.' }, { status: 500 });
  }
}
