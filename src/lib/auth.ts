import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'placetrack-super-secret-jwt-key-32charsmin';
const TOKEN_COOKIE_NAME = 'placetrack_session';

export interface UserSessionPayload {
  userId: string;
  role: Role;
  academicYear: string;
  email?: string | null;
  studentId?: string | null;
  rollNo?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<UserSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(payload: UserSessionPayload) {
  const token = generateToken(payload);
  const cookieStore = cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

/**
 * Enforce role requirement. Returns user payload or throws Error
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<UserSessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  let user = await prisma.user.findUnique({
    where: {
      id_role_academicYear: {
        id: session.userId,
        role: session.role,
        academicYear: session.academicYear || 'NA',
      },
    },
    select: { id: true, role: true, academicYear: true, isActive: true, isVerified: true },
  });

  if (!user && session.userId && session.role) {
    user = await prisma.user.findFirst({
      where: {
        id: session.userId,
        role: session.role,
      },
      select: { id: true, role: true, academicYear: true, isActive: true, isVerified: true },
    });
    if (user) {
      session.academicYear = user.academicYear;
    }
  }

  if (!user || !user.isActive) {
    throw new Error('UNAUTHORIZED');
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      throw new Error('FORBIDDEN');
    }
  }

  return session;
}

/**
 * Backend Student Ownership Check:
 * Ensures a student can ONLY access or modify their own resource ID.
 */
export async function requireStudentOwnership(targetStudentId: string): Promise<UserSessionPayload> {
  const session = await requireAuth();
  
  if (session.role === Role.SUPER_ADMIN || session.role === Role.ADMIN) {
    return session;
  }

  if (session.role === Role.STUDENT) {
    if (session.userId !== targetStudentId && session.studentId !== targetStudentId) {
      throw new Error('FORBIDDEN');
    }
    return session;
  }

  return session;
}

/**
 * All fields permitted for student self-service edit (Full Student Profile)
 */
export const PERMITTED_STUDENT_SELF_EDIT_FIELDS = [
  'fullName',
  'fullNameAsPerSSC',
  'name',
  'surname',
  'gender',
  'dob',
  'mobileNo',
  'altEmail',
  'emergencyContact',
  'tenthCGPA',
  'tenthYear',
  'tenthBoard',
  'tenthSchool',
  'interDiplomaPercentage',
  'interDiplomaBranch',
  'interDiplomaYear',
  'interDiplomaCollege',
  'interDiplomaBoard',
  'btechCGPA',
  'activeBacklogs',
  'eamcetRank',
  'jeeRank',
  'ecetRank',
  'fatherName',
  'fatherOccupation',
  'fatherOrg',
  'motherMaidenName',
  'motherName',
  'motherOccupation',
  'motherOrg',
  'category',
  'permanentAddress',
  'hometown',
  'district',
  'state',
  'currentAddress',
  'panNumber',
  'aadharNumber',
];

/**
 * Sanitize student self-update payload to allow only white-listed fields
 */
export function sanitizeStudentSelfUpdateData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  PERMITTED_STUDENT_SELF_EDIT_FIELDS.forEach((field) => {
    if (data[field] !== undefined) {
      sanitized[field] = data[field];
    }
  });

  // Handle Date conversions
  if (sanitized.dob !== undefined) {
    const dobStr = sanitized.dob ? String(sanitized.dob).trim() : '';
    sanitized.dob = dobStr ? new Date(dobStr) : null;
  }

  // Number conversions
  if (sanitized.tenthCGPA !== undefined) sanitized.tenthCGPA = sanitized.tenthCGPA ? parseFloat(sanitized.tenthCGPA) : null;
  if (sanitized.tenthYear !== undefined) sanitized.tenthYear = sanitized.tenthYear ? parseInt(sanitized.tenthYear, 10) : null;
  if (sanitized.interDiplomaPercentage !== undefined) sanitized.interDiplomaPercentage = sanitized.interDiplomaPercentage ? parseFloat(sanitized.interDiplomaPercentage) : null;
  if (sanitized.interDiplomaYear !== undefined) sanitized.interDiplomaYear = sanitized.interDiplomaYear ? parseInt(sanitized.interDiplomaYear, 10) : null;
  if (sanitized.btechCGPA !== undefined) sanitized.btechCGPA = sanitized.btechCGPA ? parseFloat(sanitized.btechCGPA) : null;
  if (sanitized.activeBacklogs !== undefined) sanitized.activeBacklogs = sanitized.activeBacklogs ? parseInt(sanitized.activeBacklogs, 10) : 0;
  if (sanitized.eamcetRank !== undefined) sanitized.eamcetRank = sanitized.eamcetRank ? parseInt(sanitized.eamcetRank, 10) : null;
  if (sanitized.jeeRank !== undefined) sanitized.jeeRank = sanitized.jeeRank ? parseInt(sanitized.jeeRank, 10) : null;
  if (sanitized.ecetRank !== undefined) sanitized.ecetRank = sanitized.ecetRank ? parseInt(sanitized.ecetRank, 10) : null;

  return sanitized;
}
