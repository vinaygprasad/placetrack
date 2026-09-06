import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getOfferLetterFileStreamFromDrive } from '@/lib/drive';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params.id;
    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get('download') === 'true';

    // Find OfferLetter by googleDriveFileId or id, or PlacementOffer
    let targetDriveId = fileId;
    let fileName = 'offer_letter.pdf';
    let mimeType = 'application/pdf';
    let studentId: string | null = null;

    const offerLetter = await prisma.offerLetter.findFirst({
      where: {
        OR: [
          { id: fileId },
          { googleDriveFileId: fileId },
        ],
      },
    });

    if (offerLetter) {
      targetDriveId = offerLetter.googleDriveFileId;
      fileName = offerLetter.fileName;
      mimeType = offerLetter.mimeType || 'application/pdf';
      studentId = offerLetter.studentId;
    } else {
      const offer = await prisma.placementOffer.findFirst({
        where: {
          OR: [
            { id: fileId },
            { googleDriveFileId: fileId },
          ],
        },
      });

      if (offer) {
        targetDriveId = offer.googleDriveFileId;
        fileName = offer.documentFileName;
        mimeType = offer.mimeType || 'application/pdf';
        studentId = offer.studentId;
      }
    }

    // Access control: Only Super Admin, Admin, or target Student can view
    if (session.role === 'STUDENT' && studentId && session.studentId !== studentId) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // Stream file directly from Google Drive API
    const { stream, metadata } = await getOfferLetterFileStreamFromDrive(targetDriveId);

    const dispositionType = isDownload ? 'attachment' : 'inline';
    const finalFileName = fileName || metadata.name || 'offer_letter.pdf';
    const finalMimeType = mimeType || metadata.mimeType || 'application/pdf';

    const webStream = Readable.toWeb(stream as any);

    return new Response(webStream as any, {
      headers: {
        'Content-Type': finalMimeType,
        'Content-Disposition': `${dispositionType}; filename="${encodeURIComponent(finalFileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error streaming offer letter from Google Drive:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve offer letter from Google Drive.' },
      { status: 500 }
    );
  }
}
