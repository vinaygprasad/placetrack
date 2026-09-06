import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentOwnership } from '@/lib/auth';
import { PlacementStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    await requireStudentOwnership(studentId);

    const [placement, offers] = await Promise.all([
      prisma.placement.findUnique({ where: { studentId } }),
      prisma.placementOffer.findMany({
        where: { studentId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return NextResponse.json({ placement, offers });
  } catch (error: any) {
    if (error.message.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch placement record.' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    await requireStudentOwnership(studentId);

    const body = await req.json();
    const {
      status,
      companyName,
      packageOffered,
      offers, // Array of offers: [{ id?, companyName, packageOffered }]
    } = body;

    let existingPlacement = await prisma.placement.findUnique({
      where: { studentId },
    });

    if (!existingPlacement) {
      existingPlacement = await prisma.placement.create({
        data: {
          studentId,
          status: status || PlacementStatus.UNPLACED,
        },
      });
    }

    // Check current placement offers in database (sorted by package)
    const currentOffers = await prisma.placementOffer.findMany({
      where: { studentId },
      orderBy: { packageOffered: 'desc' },
    });

    const isUnplaced = status === PlacementStatus.UNPLACED || currentOffers.length === 0;
    const primaryOffer = currentOffers.length > 0 ? currentOffers[0] : null;

    const finalStatus = isUnplaced ? PlacementStatus.UNPLACED : PlacementStatus.PLACED;
    const finalCompanyName = isUnplaced ? null : primaryOffer?.companyName || (companyName?.trim() || null);
    const finalPackage = isUnplaced
      ? null
      : primaryOffer
      ? primaryOffer.packageOffered
      : packageOffered !== undefined && packageOffered !== null && packageOffered !== ''
      ? parseFloat(packageOffered)
      : null;
    const finalDriveId = isUnplaced ? null : primaryOffer?.googleDriveFileId || null;

    const updatedPlacement = await prisma.placement.update({
      where: { studentId },
      data: {
        status: finalStatus,
        companyName: finalCompanyName,
        packageOffered: finalPackage,
        googleDriveFileId: finalDriveId,
      },
    });

    return NextResponse.json({ success: true, placement: updatedPlacement, offers: currentOffers });
  } catch (error: any) {
    if (error.message.startsWith('FORBIDDEN') || error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }
    console.error('Update placement error:', error);
    return NextResponse.json({ error: 'Failed to update placement details.' }, { status: 500 });
  }
}
