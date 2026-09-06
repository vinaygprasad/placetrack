import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { student: true } } },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired verification token.' }, { status: 400 });
    }

    if (record.verifiedAt) {
      return NextResponse.json({ message: 'Email address has already been verified.', verified: true });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Verification token has expired. Please request a new link.' }, { status: 400 });
    }

    // Mark user email verified, update email if pending, & set firstLogin to false
    const targetEmail = record.pendingEmail || record.user.email;

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id_role_academicYear: {
            id: record.userId,
            role: record.userRole,
            academicYear: record.userAcademicYear,
          },
        },
        data: {
          email: targetEmail,
          isVerified: true,
          firstLogin: false,
        },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { verifiedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Email address successfully verified! Your account is now fully active.',
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Server error during email verification.' }, { status: 500 });
  }
}
