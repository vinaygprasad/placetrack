import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.identifier || body.email || '').trim();
    const password = body.password;
    const portal = body.portal || (req.url.includes('portal=admin') ? 'admin' : 'student');

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'ID / Email and password are required.' },
        { status: 400 }
      );
    }

    // Lookup all candidate user accounts matching email OR user id (Roll No / EMP_ID / SUPER_ADMIN)
    const candidates = await prisma.user.findMany({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { id: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      include: {
        student: {
          select: { id: true, name: true, surname: true, fullName: true, fullNameAsPerSSC: true, branch: true, academicYear: true },
        },
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid ID or password.' },
        { status: 401 }
      );
    }

    // Determine target roles based on portal
    const targetRoles = portal === 'admin' ? ['ADMIN', 'SUPER_ADMIN'] : ['STUDENT'];
    
    // Filter candidates for this portal
    const portalCandidates = candidates.filter((u) => targetRoles.includes(u.role));

    if (portalCandidates.length === 0) {
      if (portal === 'admin') {
        return NextResponse.json(
          { error: 'This portal is for Admins. Please use the Student Login.' },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { error: 'This portal is for students. Please use the Admin Login.' },
          { status: 403 }
        );
      }
    }

    // Verify password against portal-eligible candidate accounts
    let matchingUser = null;
    for (const candidate of portalCandidates) {
      if (!candidate.isActive) continue;
      const isMatch = await comparePassword(password, candidate.passwordHash);
      if (isMatch) {
        matchingUser = candidate;
        break;
      }
    }

    if (!matchingUser) {
      // Check if any matching portal accounts were disabled and password matched
      const disabledCandidates = portalCandidates.filter((u) => !u.isActive);
      for (const candidate of disabledCandidates) {
        const isMatch = await comparePassword(password, candidate.passwordHash);
        if (isMatch) {
          return NextResponse.json(
            { error: 'Account is disabled. Please contact the Placement Cell Administrator.' },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Invalid ID or password.' },
        { status: 401 }
      );
    }

    const user = matchingUser;

    const sessionPayload = {
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    await setSessionCookie(sessionPayload);

    // If student has not set up / verified their email
    const requireEmailSetup = user.role === 'STUDENT' && (user.firstLogin || !user.isVerified || !user.email);

    return NextResponse.json({
      success: true,
      requireEmailSetup,
      user: {
        id: user.id,
        role: user.role,
        academicYear: user.student?.academicYear || null,
        email: user.email,
        studentId: user.student?.id || null,
        rollNo: user.student?.id || null,
        name: user.student ? (user.student.fullName || `${user.student.name || ''} ${user.student.surname || ''}`.trim() || user.student.fullNameAsPerSSC) : 'Admin',
        firstLogin: user.firstLogin,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
