import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentOwnership } from '@/lib/auth';
import { uploadOfferLetterToDrive, deleteOfferLetterFromDrive } from '@/lib/drive';

export const dynamic = 'force-dynamic';

// GET all placement offers for student
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    await requireStudentOwnership(studentId);

    const offers = await prisma.placementOffer.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ offers });
  } catch (error: any) {
    if (error.message?.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch offers.' }, { status: 500 });
  }
}

// POST create new placement offer (+ Add Offer)
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const session = await requireStudentOwnership(studentId);

    const formData = await req.formData();
    const companyName = (formData.get('companyName') as string || '').trim();
    const jobRole = (formData.get('jobRole') as string || '').trim();
    const packageStr = (formData.get('packageOffered') as string || '').trim();
    const documentType = (formData.get('documentType') as string || 'OL').trim().toUpperCase();
    const file = formData.get('file') as File | null;

    if (!companyName || !packageStr || !file) {
      return NextResponse.json(
        { error: 'Company Name, Salary Package, and Offer Letter Document file are required.' },
        { status: 400 }
      );
    }

    const packageOffered = parseFloat(packageStr);
    if (isNaN(packageOffered) || packageOffered <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid salary package in LPA.' },
        { status: 400 }
      );
    }

    // Fetch Student for rollNo, branch, and academicYear
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    let driveFileId = '';
    let fileName = '';
    let fileSizeBytes = 0;
    let mimeType = 'application/pdf';

    // File Validation & Drive Upload (if attached)
    if (file && file.size > 0) {
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds the 5MB maximum limit.' },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const existingCount = await prisma.placementOffer.count({ where: { studentId } });
      const offerNumber = existingCount + 1;

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

      driveFileId = uploadResult.fileId;
      fileName = uploadResult.fileName;
      fileSizeBytes = uploadResult.fileSizeBytes;
      mimeType = file.type || 'application/pdf';
    }

    // Save PlacementOffer record in DB
    const offer = await prisma.placementOffer.create({
      data: {
        studentId,
        companyName,
        packageOffered,
        documentType,
        documentFileName: fileName,
        fileSizeBytes,
        mimeType,
        googleDriveFileId: driveFileId,
      },
    });

    // Also update Student's overall Placement record to PLACED
    await prisma.placement.upsert({
      where: { studentId },
      create: {
        studentId,
        status: 'PLACED',
        companyName,
        packageOffered,
        googleDriveFileId: driveFileId,
      },
      update: {
        status: 'PLACED',
        companyName,
        packageOffered,
        googleDriveFileId: driveFileId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Placement offer added successfully!',
      offer,
    });
  } catch (error: any) {
    if (error.message?.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Error adding offer:', error);
    return NextResponse.json({ error: error.message || 'Failed to add placement offer.' }, { status: 500 });
  }
}

// PATCH update an existing placement offer (Edit Offer)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    await requireStudentOwnership(studentId);

    const formData = await req.formData();
    const offerId = (formData.get('offerId') as string || '').trim();
    const companyName = (formData.get('companyName') as string || '').trim();
    const packageStr = (formData.get('packageOffered') as string || '').trim();
    const documentType = (formData.get('documentType') as string || 'OL').trim().toUpperCase();
    const file = formData.get('file') as File | null;

    if (!offerId || !companyName || !packageStr) {
      return NextResponse.json(
        { error: 'Offer ID, Company Name, and Salary Package are required.' },
        { status: 400 }
      );
    }

    const packageOffered = parseFloat(packageStr);
    if (isNaN(packageOffered) || packageOffered <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid salary package in LPA.' },
        { status: 400 }
      );
    }

    const existingOffer = await prisma.placementOffer.findUnique({
      where: { id: offerId },
    });

    if (!existingOffer || existingOffer.studentId !== studentId) {
      return NextResponse.json({ error: 'Placement offer record not found.' }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    let updatedDriveId = existingOffer.googleDriveFileId;
    let updatedFileName = existingOffer.documentFileName;
    let updatedMimeType = existingOffer.mimeType;
    let updatedSizeBytes = existingOffer.fileSizeBytes;

    // If a new file is attached during editing
    if (file && file.size > 0) {
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds the 5MB maximum limit.' },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Upload new file to Drive
      const uploadResult = await uploadOfferLetterToDrive(
        fileBuffer,
        student.id,
        documentType,
        companyName,
        student.academicYear,
        student.branch,
        file.type || 'application/pdf',
        file.name
      );

      // Delete old file from Drive
      if (existingOffer.googleDriveFileId) {
        await deleteOfferLetterFromDrive(existingOffer.googleDriveFileId);
      }

      updatedDriveId = uploadResult.fileId;
      updatedFileName = uploadResult.fileName;
      updatedMimeType = file.type || 'application/pdf';
      updatedSizeBytes = uploadResult.fileSizeBytes;
    }

    // Update PlacementOffer DB record
    const updatedOffer = await prisma.placementOffer.update({
      where: { id: offerId },
      data: {
        companyName,
        packageOffered,
        documentType,
        documentFileName: updatedFileName,
        fileSizeBytes: updatedSizeBytes,
        mimeType: updatedMimeType,
        googleDriveFileId: updatedDriveId,
      },
    });

    // Recalculate top offer for overall student placement status
    const allOffers = await prisma.placementOffer.findMany({
      where: { studentId },
      orderBy: { packageOffered: 'desc' },
    });

    if (allOffers.length > 0) {
      const topOffer = allOffers[0];
      await prisma.placement.upsert({
        where: { studentId },
        create: {
          studentId,
          status: 'PLACED',
          companyName: topOffer.companyName,
          packageOffered: topOffer.packageOffered,
          googleDriveFileId: topOffer.googleDriveFileId,
        },
        update: {
          status: 'PLACED',
          companyName: topOffer.companyName,
          packageOffered: topOffer.packageOffered,
          googleDriveFileId: topOffer.googleDriveFileId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Placement offer updated successfully!',
      offer: updatedOffer,
    });
  } catch (error: any) {
    if (error.message?.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Error updating offer:', error);
    return NextResponse.json({ error: error.message || 'Failed to update placement offer.' }, { status: 500 });
  }
}

// DELETE a placement offer
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const session = await requireStudentOwnership(studentId);

    const { searchParams } = new URL(req.url);
    const offerId = searchParams.get('offerId');

    if (!offerId) {
      return NextResponse.json({ error: 'Offer ID is required.' }, { status: 400 });
    }

    const offer = await prisma.placementOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer || offer.studentId !== studentId) {
      return NextResponse.json({ error: 'Placement offer record not found.' }, { status: 404 });
    }

    // Delete file from Drive/local
    await deleteOfferLetterFromDrive(offer.googleDriveFileId);

    // Delete DB record
    await prisma.placementOffer.delete({
      where: { id: offerId },
    });

    // Recalculate remaining offers for student status
    const remainingOffers = await prisma.placementOffer.findMany({
      where: { studentId },
    });

    if (remainingOffers.length === 0) {
      await prisma.placement.update({
        where: { studentId },
        data: {
          status: 'UNPLACED',
          companyName: null,
          packageOffered: null,
          googleDriveFileId: null,
        },
      });
    } else {
      const topOffer = remainingOffers[remainingOffers.length - 1];
      await prisma.placement.update({
        where: { studentId },
        data: {
          status: 'PLACED',
          companyName: topOffer.companyName,
          packageOffered: topOffer.packageOffered,
          googleDriveFileId: topOffer.googleDriveFileId,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Offer deleted successfully.' });
  } catch (error: any) {
    if (error.message?.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete offer.' }, { status: 500 });
  }
}
