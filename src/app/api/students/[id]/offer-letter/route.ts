import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentOwnership } from '@/lib/auth';
import { uploadOfferLetterToDrive, deleteOfferLetterFromDrive } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const session = await requireStudentOwnership(studentId);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const companyName = (formData.get('companyName') as string || 'General').trim();
    const documentType = (formData.get('documentType') as string || 'OL').trim().toUpperCase();

    if (!file) {
      return NextResponse.json({ error: 'No PDF file attached.' }, { status: 400 });
    }

    // 1. Validate file type (PDF/JPG/PNG)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPG, and PNG documents are allowed.' },
        { status: 400 }
      );
    }

    // 2. Validate file size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 5MB maximum limit.' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Calculate offer number for filename (e.g. 1, 2, 3...)
    const existingCount = await prisma.offerLetter.count({ where: { studentId } });
    const offerNumber = existingCount + 1;

    // Upload to Google Drive under AcademicYear/Batch/
    const uploadResult = await uploadOfferLetterToDrive(
      fileBuffer,
      student.id,
      documentType,
      companyName,
      student.academicYear,
      student.branch,
      file.type || 'application/pdf',
      file.name,
      offerNumber
    );

    // Create OfferLetter record
    const offerLetter = await prisma.offerLetter.create({
      data: {
        studentId,
        googleDriveFileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        fileSizeBytes: uploadResult.fileSizeBytes,
        mimeType: file.type || 'application/pdf',
      },
    });

    // Update Placement record with latest file ID
    await prisma.placement.upsert({
      where: { studentId },
      create: {
        studentId,
        status: 'PLACED',
        companyName,
        googleDriveFileId: uploadResult.fileId,
      },
      update: {
        googleDriveFileId: uploadResult.fileId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Offer letter PDF successfully uploaded to Google Drive!',
      offerLetter: {
        id: offerLetter.id,
        googleDriveFileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        fileSizeBytes: uploadResult.fileSizeBytes,
        uploadedAt: offerLetter.uploadedAt,
        webViewLink: uploadResult.webViewLink,
      },
    });
  } catch (error: any) {
    if (error.message?.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Offer letter upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload offer letter.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const session = await requireStudentOwnership(studentId);

    const placement = await prisma.placement.findUnique({
      where: { studentId },
    });

    if (!placement || !placement.googleDriveFileId) {
      return NextResponse.json({ error: 'No offer letter found to delete.' }, { status: 404 });
    }

    const fileId = placement.googleDriveFileId;

    // Delete from Google Drive or local storage
    await deleteOfferLetterFromDrive(fileId);

    // Update placement record
    await prisma.placement.update({
      where: { studentId },
      data: { googleDriveFileId: null },
    });

    return NextResponse.json({ success: true, message: 'Offer letter deleted.' });
  } catch (error: any) {
    if (error.message?.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete offer letter.' }, { status: 500 });
  }
}
