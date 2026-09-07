import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentOwnership, requireAuth, sanitizeStudentSelfUpdateData } from '@/lib/auth';
import { Role } from '@prisma/client';
import { sendVerificationEmail } from '@/lib/brevo';
import { decryptStudentSensitiveData, encryptStudentSensitiveData } from '@/lib/encryption';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    await requireStudentOwnership(studentId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { id: true, email: true, isVerified: true, isActive: true, role: true },
        },
        placement: true,
        offerLetters: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    const decryptedStudent = decryptStudentSensitiveData(student);

    return NextResponse.json({ student: decryptedStudent });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Fetch student detail error:', error);
    return NextResponse.json({ error: 'Failed to retrieve student record.' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const session = await requireStudentOwnership(studentId);
    const body = await req.json();

    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    let updateData: Record<string, any> = {};
    let emailVerificationSent = false;
    let pendingEmailAddress: string | null = null;

    // STRICT BACKEND AUTHORIZATION FOR FIELD PERMISSIONS
    if (session.role === Role.STUDENT) {
      // Students can ONLY edit permitted contact & personal fields
      updateData = sanitizeStudentSelfUpdateData(body);

      // EMAIL MODIFICATION TOKEN VERIFICATION CHECK
      if (body.email) {
        const newEmail = (body.email as string).trim().toLowerCase();
        const currentEmail = (existingStudent.user?.email || '').trim().toLowerCase();

        if (newEmail && newEmail !== currentEmail) {
          // Check if new email is already used by another active user
          const existingUser = await prisma.user.findFirst({
            where: {
              email: newEmail,
              NOT: { id: session.userId },
            },
          });

          if (existingUser) {
            return NextResponse.json(
              { error: 'This email address is already registered to another account.' },
              { status: 400 }
            );
          }

          // Generate verification token
          const token = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

          await prisma.emailVerificationToken.deleteMany({
            where: { userId: session.userId },
          });

          await prisma.emailVerificationToken.create({
            data: {
              userId: session.userId,
              pendingEmail: newEmail,
              tokenHash,
              expiresAt,
            },
          });

          const origin = new URL(req.url).origin;
          await sendVerificationEmail(newEmail, token, origin);
          emailVerificationSent = true;
          pendingEmailAddress = newEmail;
        }
      }
    } else {
      // Admin / SuperAdmin can update all fields including academic records
      updateData = { ...body };
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      if (body.email !== undefined) {
        const adminNewEmail = body.email ? String(body.email).toLowerCase().trim() : null;
        await prisma.user.update({
          where: { id: studentId },
          data: { email: adminNewEmail },
        });
        delete updateData.email;
      }

      // Handle date formatting & sanitization if present
      if (updateData.section !== undefined) {
        updateData.section = updateData.section ? String(updateData.section).trim().toUpperCase() : null;
      }
      if (updateData.dob !== undefined) {
        const dobStr = updateData.dob ? String(updateData.dob).trim() : '';
        updateData.dob = dobStr ? new Date(dobStr) : null;
      }
      if (updateData.tenthCGPA !== undefined) updateData.tenthCGPA = updateData.tenthCGPA ? parseFloat(updateData.tenthCGPA) : null;
      if (updateData.tenthYear !== undefined) updateData.tenthYear = updateData.tenthYear ? parseInt(updateData.tenthYear, 10) : null;
      if (updateData.interDiplomaPercentage !== undefined) updateData.interDiplomaPercentage = updateData.interDiplomaPercentage ? parseFloat(updateData.interDiplomaPercentage) : null;
      if (updateData.interDiplomaYear !== undefined) updateData.interDiplomaYear = updateData.interDiplomaYear ? parseInt(updateData.interDiplomaYear, 10) : null;
      if (updateData.btechCGPA !== undefined) updateData.btechCGPA = updateData.btechCGPA ? parseFloat(updateData.btechCGPA) : null;
      if (updateData.activeBacklogs !== undefined) updateData.activeBacklogs = updateData.activeBacklogs ? parseInt(updateData.activeBacklogs, 10) : 0;
      if (updateData.eamcetRank !== undefined) updateData.eamcetRank = updateData.eamcetRank ? parseInt(updateData.eamcetRank, 10) : null;
      if (updateData.jeeRank !== undefined) updateData.jeeRank = updateData.jeeRank ? parseInt(updateData.jeeRank, 10) : null;
      if (updateData.ecetRank !== undefined) updateData.ecetRank = updateData.ecetRank ? parseInt(updateData.ecetRank, 10) : null;
    }

    const dataToSave = encryptStudentSensitiveData(updateData);

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: dataToSave,
      include: { placement: true, user: { select: { email: true } } },
    });

    const decryptedUpdatedStudent = decryptStudentSensitiveData(updatedStudent);

    return NextResponse.json({
      success: true,
      student: decryptedUpdatedStudent,
      emailVerificationSent,
      pendingEmail: pendingEmailAddress,
      message: emailVerificationSent
        ? `Profile updated! A verification link has been sent to ${pendingEmailAddress}. Please check your inbox and verify the link to confirm your email change.`
        : undefined,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Failed to update student profile.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([Role.SUPER_ADMIN, Role.ADMIN]);
    const studentId = params.id;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    // Deleting User automatically cascades to Student, Placement, OfferLetter
    await prisma.user.delete({
      where: { id: studentId },
    });

    return NextResponse.json({ success: true, message: 'Student record deleted successfully.' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student record.' }, { status: 500 });
  }
}
