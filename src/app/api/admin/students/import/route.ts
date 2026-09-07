import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { DEPARTMENTS } from '@/lib/constants';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Access denied. Admin authorization required.' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    let rows: any[] = [];
    let startRowIndex = 2;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (!body.students || !Array.isArray(body.students) || body.students.length === 0) {
        return NextResponse.json({ error: 'No student data rows provided in request body.' }, { status: 400 });
      }
      rows = body.students;
      if (typeof body.startRowIndex === 'number') {
        startRowIndex = body.startRowIndex;
      }
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No Excel file provided.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return NextResponse.json({ error: 'Excel sheet is empty.' }, { status: 400 });
      }

      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        return NextResponse.json({ error: 'No data rows found in Excel sheet.' }, { status: 400 });
      }
    }

    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Helper to find header key ignoring case and punctuation
    const findValue = (row: any, keys: string[]): string => {
      const rowKeys = Object.keys(row);
      for (const k of keys) {
        const matchKey = rowKeys.find(
          (rk) => rk.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
          return String(row[matchKey]).trim();
        }
      }
      return '';
    };

    // Pre-calculate password hashes in parallel for maximum speed
    const preparedRows = await Promise.all(
      rows.map(async (row, i) => {
        const rowNum = startRowIndex + i;

        const rollNo = findValue(row, ['roll', 'rollno', 'rollnumber', 'studentrollno']);
        const rawFullName = findValue(row, ['fullname', 'full_name', 'name', 'studentname', 'nameofthecandidate']);
        const rawGivenName = findValue(row, ['givenname', 'firstname', 'first_name', 'given_name']);
        const rawSurname = findValue(row, ['surname', 'lastname', 'last_name']);
        const rawPassword = findValue(row, ['password', 'pass']);
        const deptRaw = findValue(row, ['dept', 'department', 'branch']);
        const sectionRaw = findValue(row, ['section', 'sec', 'studentsection']);
        const academicYear = findValue(row, ['academicyear', 'year', 'batch']);

        const passwordToHash = rawPassword || `${rollNo}@123`;
        const passwordHash = rollNo ? await bcrypt.hash(passwordToHash, 10) : '';

        return {
          row,
          rowNum,
          rollNo,
          rawFullName,
          rawGivenName,
          rawSurname,
          rawPassword,
          deptRaw,
          sectionRaw,
          academicYear,
          passwordHash,
        };
      })
    );

    // Process each student row sequentially in DB
    for (const item of preparedRows) {
      const {
        rowNum,
        rollNo,
        rawFullName,
        rawGivenName,
        rawSurname,
        deptRaw,
        sectionRaw,
        academicYear,
        passwordHash,
      } = item;

      const section = sectionRaw
        ? sectionRaw.replace(/^sec(tion)?\s*/i, '').trim().toUpperCase()
        : null;

      const fullNameCandidate = rawFullName
        ? rawFullName.trim()
        : rawGivenName
        ? `${rawGivenName.trim()} ${rawSurname ? rawSurname.trim() : ''}`.trim()
        : '';

      if (!rollNo || !fullNameCandidate || !deptRaw || !academicYear) {
        errors.push(
          `Row ${rowNum}: Skipped - Missing required field(s). Roll Number, Name, Department (Dept), and Academic Year are required.`
        );
        skippedCount++;
        continue;
      }

      const givenName = rawGivenName ? rawGivenName.trim() : '';
      const surname = rawSurname ? rawSurname.trim() : null;

      // Standardize Department / Branch match
      const matchedDept = DEPARTMENTS.find(
        (d) => d.toLowerCase().replace(/[^a-z0-9]/g, '') === deptRaw.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      const branch = matchedDept || deptRaw;

      // Check if student or user with rollNo already exists
      const existingStudent = await prisma.student.findUnique({
        where: { id: rollNo },
      });
      const existingUser = await prisma.user.findFirst({
        where: { id: rollNo },
      });

      if (existingStudent || existingUser) {
        errors.push(`Row ${rowNum}: Skipped - Roll No "${rollNo}" already exists.`);
        skippedCount++;
        continue;
      }

      const cleanYear = academicYear.trim();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              id: rollNo,
              role: 'STUDENT',
              passwordHash,
              isVerified: false,
              firstLogin: true,
            },
          });

          const derivedFullName = fullNameCandidate;
          const student = await tx.student.create({
            data: {
              id: rollNo,
              userRole: 'STUDENT',
              academicYear: cleanYear,
              fullName: derivedFullName,
              name: null,
              surname: null,
              fullNameAsPerSSC: null,
              branch,
              section,
            },
          });

          await tx.placement.create({
            data: {
              studentId: student.id,
              status: 'UNPLACED',
            },
          });
        });

        successCount++;
      } catch (err: any) {
        console.error(`Error importing row ${rowNum}:`, err);
        errors.push(`Row ${rowNum}: Failed to save student ${rollNo} - ${err.message}`);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${rows.length} rows (${successCount} created, ${skippedCount} skipped).`,
      summary: {
        imported: successCount,
        skipped: skippedCount,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Admin Excel import error:', error);
    return NextResponse.json({ error: 'Failed to process Excel import.' }, { status: 500 });
  }
}
