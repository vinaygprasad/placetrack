import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Role, PlacementStatus, Prisma } from '@prisma/client';
import { generateStudentExcel } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await requireAuth([Role.SUPER_ADMIN, Role.ADMIN]);
    const { searchParams } = new URL(req.url);

    const idsParam = searchParams.get('ids') || '';
    const onlyFiltered = searchParams.get('onlyFiltered') === 'true';
    const excludePlacement = searchParams.get('excludePlacement') === 'true';

    const selectedIds = idsParam
      ? idsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    const where: Prisma.StudentWhereInput = {};

    if (selectedIds.length > 0) {
      // Export only specific selected student records
      where.id = { in: selectedIds };
    } else if (onlyFiltered) {
      // Export only filtered records matching active search criteria
      const query = searchParams.get('q') || '';
      const branchParam = searchParams.get('branch') || searchParams.get('dept') || '';
      const yearParam = searchParams.get('academicYear') || searchParams.get('year') || '';
      const secParam = searchParams.get('sec') || searchParams.get('section') || '';
      const status = searchParams.get('status') || '';
      const company = searchParams.get('company') || '';
      const minCgpa = searchParams.get('minCgpa') ? parseFloat(searchParams.get('minCgpa')!) : null;

      const selectedDepts = branchParam
        ? branchParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const selectedYears = yearParam
        ? yearParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const selectedSections = secParam
        ? secParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      if (query) {
        where.OR = [
          { id: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
          { placement: { companyName: { contains: query, mode: 'insensitive' } } },
        ];
      }

      if (selectedDepts.length > 0) {
        where.branch = { in: selectedDepts };
      }

      if (selectedYears.length > 0) {
        where.academicYear = { in: selectedYears };
      }

      if (selectedSections.length > 0) {
        where.section = { in: selectedSections };
      }

      if (minCgpa !== null && !isNaN(minCgpa)) {
        where.btechCGPA = { gte: minCgpa };
      }

      if (status || company) {
        where.placement = {};
        if (status) {
          where.placement.status = status as PlacementStatus;
        }
        if (company) {
          where.placement.companyName = { contains: company, mode: 'insensitive' };
        }
      }
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        user: { select: { email: true } },
        placement: true,
        placementOffers: {
          orderBy: { packageOffered: 'desc' },
        },
      },
    });

    const filterDescription = selectedIds.length > 0
      ? `Selected (${selectedIds.length})`
      : onlyFiltered
      ? 'Filtered Students'
      : 'All Students';

    const exportModeParam = searchParams.get('exportMode') || (searchParams.get('excludePlacement') === 'true' ? 'master' : 'master');
    const exportMode: 'master' | 'placement' = exportModeParam === 'placement' ? 'placement' : 'master';

    const excelBuffer = await generateStudentExcel(students, session.userId, filterDescription, {
      exportMode,
    });

    const filePrefix = exportMode === 'master' ? 'Master_Student_Database' : 'Placement_Details';
    const filename = `VNRVJIET_${filePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Excel export error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel export.' }, { status: 500 });
  }
}
