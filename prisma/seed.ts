import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (Super Admin only)...');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be defined in environment variables.');
  }

  const existingSuperAdmin = await prisma.user.findUnique({
    where: {
      id_role_academicYear: {
        id: 'SUPER_ADMIN',
        role: Role.SUPER_ADMIN,
        academicYear: 'NA',
      },
    },
  });

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);
    const superAdmin = await prisma.user.create({
      data: {
        id: 'SUPER_ADMIN',
        role: Role.SUPER_ADMIN,
        academicYear: 'NA',
        email: superAdminEmail,
        passwordHash,
        isVerified: true,
        firstLogin: false,
        isActive: true,
      },
    });
    console.log(`✅ Initial Super Admin created with ID "SUPER_ADMIN", Academic Year "NA", and Email: ${superAdmin.email}`);
  } else {
    console.log(`ℹ️ Super Admin already exists: ${superAdminEmail}`);
  }

  console.log('🎉 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
