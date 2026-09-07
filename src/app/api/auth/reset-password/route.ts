import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Token and a strong password (at least 8 characters) are required.' },
        { status: 400 }
      );
    }

    // Auto-clean expired password reset tokens from database
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    }).catch(() => {});

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired password reset token.' }, { status: 400 });
    }

    if (resetRecord.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } }).catch(() => {});
      return NextResponse.json({ error: 'Password reset token has expired. Please request a new one.' }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Update password & delete used token inside transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetRecord.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You may now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Password reset API error:', error);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
