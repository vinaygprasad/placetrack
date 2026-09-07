import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    await requireAuth([Role.SUPER_ADMIN]);

    const admins = await prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ admins });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch admin accounts.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth([Role.SUPER_ADMIN]);
    const body = await req.json();
    const { empId, id, email, password, role } = body;
    const adminId = empId || id;

    if (!adminId || !email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Employee ID, valid email, and a password of at least 8 characters are required.' },
        { status: 400 }
      );
    }

    const normalizedEmpId = String(adminId).trim().toUpperCase();
    const normalizedEmail = email.toLowerCase().trim();
    const assignedRole = role === 'SUPER_ADMIN' ? Role.SUPER_ADMIN : Role.ADMIN;

    const existingId = await prisma.user.findUnique({
      where: { id: normalizedEmpId },
    });
    if (existingId) {
      return NextResponse.json({ error: `An admin account with Employee ID "${normalizedEmpId}" already exists.` }, { status: 400 });
    }

    const existingEmail = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existingEmail) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newAdmin = await prisma.user.create({
      data: {
        id: normalizedEmpId,
        role: assignedRole,
        email: normalizedEmail,
        passwordHash,
        isVerified: true,
        firstLogin: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create admin account.' }, { status: 500 });
  }
}
