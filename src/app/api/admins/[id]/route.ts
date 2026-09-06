import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([Role.SUPER_ADMIN]);
    const targetUserId = params.id;
    const { isActive, role, password } = await req.json();

    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Admin account not found.' }, { status: 404 });
    }

    const data: Record<string, any> = {};
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (role && (role === Role.ADMIN || role === Role.SUPER_ADMIN)) data.role = role;
    if (password && password.length >= 8) {
      data.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id_role_academicYear: {
          id: targetUser.id,
          role: targetUser.role,
          academicYear: targetUser.academicYear,
        },
      },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        academicYear: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, admin: updatedUser });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update admin account.' }, { status: 500 });
  }
}
