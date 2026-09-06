import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/brevo';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    // Always respond with success to prevent user enumeration attacks
    if (!user || !user.isActive) {
      return NextResponse.json({
        success: true,
        message: 'If an active account exists for this email, password reset instructions have been sent.',
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        userRole: user.role,
        userAcademicYear: user.academicYear,
      },
    });

    // Save reset token in DB
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        userRole: user.role,
        userAcademicYear: user.academicYear,
        tokenHash,
        expiresAt,
      },
    });

    // Dispatch reset email via Brevo API using dynamic request origin
    if (user.email) {
      const origin = new URL(req.url).origin;
      await sendPasswordResetEmail(user.email, token, origin);
    }

    return NextResponse.json({
      success: true,
      message: 'If an active account exists for this email, password reset instructions have been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    return NextResponse.json({ error: 'Failed to process password reset request.' }, { status: 500 });
  }
}
