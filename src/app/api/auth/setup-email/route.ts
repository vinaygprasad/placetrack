import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/brevo';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { primaryEmail } = await req.json();
    const cleanEmail = (primaryEmail || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid primary email address.' },
        { status: 400 }
      );
    }

    // Check if email is already used by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: { id: session.userId },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email address is already registered to another account.' },
        { status: 400 }
      );
    }

    // Generate secure verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete existing unused tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: session.userId },
    });

    // Store token in database with pending email address
    await prisma.emailVerificationToken.create({
      data: {
        userId: session.userId,
        pendingEmail: cleanEmail,
        tokenHash,
        expiresAt,
      },
    });

    // Send verification email via Brevo using dynamic request origin
    const origin = new URL(req.url).origin;
    const emailSent = await sendVerificationEmail(cleanEmail, token, origin);

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Verification email sent to ${cleanEmail}. Please check your inbox and click the token link to complete email setup.`
        : `Email setup saved! (Dev Mode preview generated for ${cleanEmail})`,
      verifyLinkPreview: process.env.NODE_ENV === 'development' ? `/verify-email?token=${token}` : undefined,
    });
  } catch (error: any) {
    console.error('Setup email error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    );
  }
}
