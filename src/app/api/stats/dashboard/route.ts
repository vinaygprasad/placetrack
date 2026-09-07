import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Role, Prisma } from '@prisma/client';
import { DEPARTMENTS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAuth([Role.SUPER_ADMIN, Role.ADMIN]);

    const { searchParams } = new URL(req.url);

    // Extract multi-select filters
    const deptParam = searchParams.get('dept') || searchParams.get('branch') || '';
    const yearParam = searchParams.get('year') || searchParams.get('academicYear') || '';
    const secParam = searchParams.get('sec') || searchParams.get('section') || '';

    const selectedDepts = deptParam
      ? deptParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const selectedYears = yearParam
      ? yearParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const selectedSections = secParam
      ? secParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // Query available academic years & sections dynamically from DB
    const [dbYears, dbSections] = await Promise.all([
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
    const availableYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

    const secSet = new Set<string>();
    dbSections.forEach((s) => {
      if (s.section && s.section.trim()) {
        secSet.add(s.section.trim().toUpperCase());
      }
    });
    const availableSections = Array.from(secSet).sort();

    // Construct student filter clause
    const studentWhere: Prisma.StudentWhereInput = {};

    if (selectedDepts.length > 0) {
      studentWhere.branch = { in: selectedDepts };
    }

    if (selectedYears.length > 0) {
      studentWhere.academicYear = { in: selectedYears };
    }

    if (selectedSections.length > 0) {
      studentWhere.section = { in: selectedSections };
    }

    // Get matching student records
    const matchingStudents = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true, branch: true },
    });

    const totalStudents = matchingStudents.length;
    const studentIds = matchingStudents.map((s) => s.id);

    if (totalStudents === 0) {
      return NextResponse.json({
        summary: {
          totalStudents: 0,
          placedCount: 0,
          unplacedCount: 0,
          placementPercentage: '0',
          avgPackage: '0.00',
          medianPackage: '0.00',
          maxPackage: '0.00',
        },
        statusDistribution: [
          { status: 'PLACED', count: 0 },
          { status: 'UNPLACED', count: 0 },
        ],
        branchDistribution: [],
        topRecruiters: [],
        availableYears,
        availableDepts: DEPARTMENTS,
        availableSections,
      });
    }

    // Get placement records & offers for matching students
    const [placements, offers] = await Promise.all([
      prisma.placement.findMany({
        where: { studentId: { in: studentIds } },
      }),
      prisma.placementOffer.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, companyName: true, packageOffered: true },
      }),
    ]);

    const placedCount = placements.filter((p) => p.status === 'PLACED').length;
    const unplacedCount = totalStudents - placedCount;
    const placementPercentage = ((placedCount / totalStudents) * 100).toFixed(1);

    // Package metrics: Collect max package for each placed student (only max for multiple offers)
    const studentMaxPackageMap = new Map<string, number>();

    placements.forEach((p) => {
      if (p.status === 'PLACED' && p.packageOffered && p.packageOffered > 0) {
        studentMaxPackageMap.set(p.studentId, p.packageOffered);
      }
    });

    offers.forEach((off) => {
      if (off.packageOffered && off.packageOffered > 0) {
        const currentMax = studentMaxPackageMap.get(off.studentId) || 0;
        if (off.packageOffered > currentMax) {
          studentMaxPackageMap.set(off.studentId, off.packageOffered);
        }
      }
    });

    const packages = Array.from(studentMaxPackageMap.values());
    const sortedPackages = [...packages].sort((a, b) => a - b);
    const N = sortedPackages.length;

    const avgPackage =
      N > 0
        ? (sortedPackages.reduce((sum, val) => sum + val, 0) / N).toFixed(2)
        : '0.00';

    let medianPackage = '0.00';
    if (N > 0) {
      if (N % 2 === 1) {
        // Odd N (e.g. 21 -> index 10, i.e. 11th item)
        medianPackage = sortedPackages[Math.floor(N / 2)].toFixed(2);
      } else {
        // Even N (e.g. 20 -> avg of index 9 & 10, i.e. 10th & 11th items)
        const mid1 = sortedPackages[N / 2 - 1];
        const mid2 = sortedPackages[N / 2];
        medianPackage = ((mid1 + mid2) / 2).toFixed(2);
      }
    }

    const maxPackage = N > 0 ? Math.max(...sortedPackages).toFixed(2) : '0.00';

    // Top recruiters
    const companyCountMap: Record<string, { count: number; packages: number[] }> = {};
    placements.forEach((p) => {
      if (p.companyName && p.companyName.trim()) {
        const comp = p.companyName.trim();
        if (!companyCountMap[comp]) {
          companyCountMap[comp] = { count: 0, packages: [] };
        }
        companyCountMap[comp].count += 1;
        if (p.packageOffered && p.packageOffered > 0) {
          companyCountMap[comp].packages.push(p.packageOffered);
        }
      }
    });

    offers.forEach((off) => {
      if (off.companyName && off.companyName.trim()) {
        const comp = off.companyName.trim();
        if (!companyCountMap[comp]) {
          companyCountMap[comp] = { count: 0, packages: [] };
        }
        if (off.packageOffered && off.packageOffered > 0) {
          if (!companyCountMap[comp].packages.includes(off.packageOffered)) {
            companyCountMap[comp].packages.push(off.packageOffered);
          }
        }
      }
    });

    const topRecruiters = Object.entries(companyCountMap)
      .map(([company, data]) => {
        const avgPkg =
          data.packages.length > 0
            ? (data.packages.reduce((a, b) => a + b, 0) / data.packages.length).toFixed(2)
            : 'N/A';
        const maxPkg =
          data.packages.length > 0 ? Math.max(...data.packages).toFixed(2) : 'N/A';
        return {
          company,
          count: data.count,
          avgPackage: avgPkg,
          maxPackage: maxPkg,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Branch distribution for matching students
    const branchCountMap: Record<string, number> = {};
    matchingStudents.forEach((s) => {
      branchCountMap[s.branch] = (branchCountMap[s.branch] || 0) + 1;
    });

    const branchDistribution = Object.entries(branchCountMap).map(([branch, count]) => ({
      branch,
      count,
    }));

    return NextResponse.json({
      summary: {
        totalStudents,
        placedCount,
        unplacedCount,
        placementPercentage,
        avgPackage,
        medianPackage,
        maxPackage,
      },
      statusDistribution: [
        { status: 'PLACED', count: placedCount },
        { status: 'UNPLACED', count: unplacedCount },
      ],
      branchDistribution,
      topRecruiters,
      availableYears,
      availableDepts: DEPARTMENTS,
      availableSections,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to load placement stats.' }, { status: 500 });
  }
}
