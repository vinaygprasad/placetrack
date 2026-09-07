import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';
import { Role, PlacementStatus, Prisma } from '@prisma/client';
import { DEPARTMENTS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const query = searchParams.get('q') || '';
    const branchParam = searchParams.get('branch') || '';
    const yearParam = searchParams.get('academicYear') || '';
    const sectionParam = searchParams.get('section') || '';
    const status = searchParams.get('status');
    const company = searchParams.get('company');
    const minCgpa = searchParams.get('minCgpa') ? parseFloat(searchParams.get('minCgpa')!) : null;
    const maxBacklogs = searchParams.get('maxBacklogs') ? parseInt(searchParams.get('maxBacklogs')!, 10) : null;
    
    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

    const skip = (page - 1) * limit;

    const selectedDepts = branchParam
      ? branchParam.split(',').map((d) => d.trim()).filter(Boolean)
      : [];

    const selectedYears = yearParam
      ? yearParam.split(',').map((y) => y.trim()).filter(Boolean)
      : [];

    const selectedSections = sectionParam
      ? sectionParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];

    // Build Prisma filter clauses
    const where: Prisma.StudentWhereInput = {};

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

    if (maxBacklogs !== null && !isNaN(maxBacklogs)) {
      where.activeBacklogs = { lte: maxBacklogs };
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

    // Determine sort ordering with deterministic tie-breakers (id)
    let orderBy: Prisma.StudentOrderByWithRelationInput[] = [
      { id: sortOrder },
    ];
    if (sortBy === 'name') {
      orderBy = [
        { fullName: sortOrder },
        { id: sortOrder },
      ];
    } else if (sortBy === 'branch') {
      orderBy = [
        { branch: sortOrder },
        { id: sortOrder },
      ];
    } else if (sortBy === 'btechCGPA') {
      orderBy = [
        { btechCGPA: sortOrder },
        { id: sortOrder },
      ];
    } else if (sortBy === 'activeBacklogs') {
      orderBy = [
        { activeBacklogs: sortOrder },
        { id: sortOrder },
      ];
    } else if (sortBy === 'packageOffered' || sortBy === 'package') {
      orderBy = [
        { placement: { packageOffered: sortOrder } },
        { id: sortOrder },
      ];
    }

    const [total, totalSystemCount, students, dbYears, dbSections] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.count(),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { email: true, isVerified: true } },
          placement: true,
          placementOffers: {
            orderBy: { packageOffered: 'desc' },
          },
          offerLetters: {
            orderBy: { uploadedAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.student.findMany({
        select: { academicYear: true },
        distinct: ['academicYear'],
      }),
      prisma.student.findMany({
        select: { section: true },
        distinct: ['section'],
        where: { section: { not: null } },
      }),
    ]);

    const yearSet = new Set<string>();
    dbYears.forEach((y) => {
      if (y.academicYear && y.academicYear.trim()) {
        yearSet.add(y.academicYear.trim());
      }
    });

    const secSet = new Set<string>();
    dbSections.forEach((s) => {
      if (s.section && s.section.trim()) {
        secSet.add(s.section.trim().toUpperCase());
      }
    });

    const availableYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
    const availableSections = Array.from(secSet).sort();

    return NextResponse.json({
      students,
      availableYears,
      availableSections,
      pagination: {
        total,
        totalSystemCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Fetch students API error:', error);
    return NextResponse.json({ error: 'Failed to fetch student records.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth([Role.SUPER_ADMIN, Role.ADMIN]);
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
      section,
      academicYear,
      mobileNo,
      btechCGPA,
      activeBacklogs,
    } = body;

    const studentId = rollNo || body.id;
    const studentFullName = (body.fullName || name || '').trim();

    if (!studentId || !studentFullName || !branch) {
      return NextResponse.json({ error: 'Missing required student fields. Roll Number (ID), Full Name, and Department are required.' }, { status: 400 });
    }

    const normalizedRollNo = String(studentId).trim().toUpperCase();
    const normalizedEmail = email ? String(email).toLowerCase().trim() : null;

    const existingStudent = await prisma.student.findUnique({ where: { id: normalizedRollNo } });
    if (existingStudent) {
      return NextResponse.json({ error: `Student account with Roll Number "${normalizedRollNo}" already exists.` }, { status: 400 });
    }

    if (normalizedEmail) {
      const existingUserWithEmail = await prisma.user.findFirst({
        where: { email: normalizedEmail },
      });
      if (existingUserWithEmail) {
        return NextResponse.json({ error: 'User account with this email already exists.' }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(password || `${normalizedRollNo}@123`);

    const matchedDept = DEPARTMENTS.find(
      (d) => d.toLowerCase().replace(/[^a-z0-9]/g, '') === branch.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    const normalizedBranch = matchedDept || branch.trim();
    const cleanYear = academicYear ? academicYear.trim() : '2024-2028';

    const { student } = await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: normalizedRollNo,
          role: Role.STUDENT,
          email: normalizedEmail,
          passwordHash,
          isVerified: Boolean(normalizedEmail),
          firstLogin: !normalizedEmail,
          isActive: true,
        },
      });

      const surNameVal = surname ? surname.trim() : null;
      const derivedFullName = studentFullName;
      const derivedFullNameSSC = body.fullNameAsPerSSC ? String(body.fullNameAsPerSSC).trim() : null;

      const newStudent = await tx.student.create({
        data: {
          id: normalizedRollNo,
          userRole: Role.STUDENT,
          academicYear: cleanYear,
          name: name ? String(name).trim() : null,
          surname: surNameVal,
          fullName: derivedFullName,
          fullNameAsPerSSC: derivedFullNameSSC,
          gender: gender || null,
          branch: normalizedBranch,
          section: section ? section.replace(/^sec(tion)?\s*/i, '').trim().toUpperCase() : null,
          mobileNo: mobileNo || '',
          btechCGPA: btechCGPA ? parseFloat(btechCGPA) : null,
          activeBacklogs: activeBacklogs ? parseInt(activeBacklogs, 10) : 0,
        },
      });

      await tx.placement.create({
        data: {
          studentId: newStudent.id,
          status: PlacementStatus.UNPLACED,
        },
      });

      return { student: newStudent };
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student record.' }, { status: 500 });
  }
}
