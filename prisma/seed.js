// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Super Admin ONLY
  const superAdminPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@autobill.com' },
    update: {},
    create: {
      email: 'admin@autobill.com',
      password: superAdminPassword,
      name: 'Super Admin',
      phone: '9999999999',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('✅ Super Admin created:', superAdmin.email);
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   Super Admin: admin@autobill.com / admin123');
  console.log('');
  console.log('ℹ️  Existing users (manager, technician, cashier) were NOT touched.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });