import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/brevo';
import crypto from 'crypto';
import { Role, PlacementStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      rollNo,
      surname,
      name,
      fullNameAsPerSSC,
      gender,
      branch,
      mobileNo,
    } = body;

    const studentId = rollNo || body.id;

    if (!email || !password || !studentId || !name || !branch) {
      return NextResponse.json(
        { error: 'Missing required registration fields.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRollNo = String(studentId).trim().toUpperCase();

    // Check existing user or student ID
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 400 }
      );
    }

    const existingStudent = await prisma.student.findUnique({
      where: { id: normalizedRollNo },
    });
    if (existingStudent) {
      return NextResponse.json(
        { error: 'A student with this Roll Number is already registered.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const academicYear = body.academicYear || '2024-2028';

    // Create User & Student Profile inside transaction
    const { user, student } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: normalizedRollNo,
          role: Role.STUDENT,
          academicYear,
          email: normalizedEmail,
          passwordHash,
          isVerified: false, // Require email verification
          firstLogin: false,
          isActive: true,
        },
      });

      const newStudent = await tx.student.create({
        data: {
          id: normalizedRollNo,
          userRole: Role.STUDENT,
          academicYear,
          surname: surname ? surname.trim() : null,
          name: name.trim(),
          fullNameAsPerSSC: body.fullNameAsPerSSC ? body.fullNameAsPerSSC.trim() : null,
          gender: gender || 'Male',
          branch: branch.trim(),
          mobileNo: mobileNo || '',
        },
      });

      // Initialize unplaced status
      await tx.placement.create({
        data: {
          studentId: newStudent.id,
          status: PlacementStatus.UNPLACED,
        },
      });

      return { user: newUser, student: newStudent };
    });

    // Create email verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        userRole: user.role,
        userAcademicYear: user.academicYear,
        pendingEmail: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    // Send verification email via Brevo using dynamic request origin
    const origin = new URL(req.url).origin;
    const emailSent = await sendVerificationEmail(normalizedEmail, token, origin);

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Registration successful! A verification link has been sent to ${normalizedEmail}. Please check your inbox.`
        : `Registration successful! (Dev Mode link generated)`,
      verifyLinkPreview: process.env.NODE_ENV === 'development' ? `/verify-email?token=${token}` : undefined,
    });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Server error during registration. Please try again.' },
      { status: 500 }
    );
  }
}
