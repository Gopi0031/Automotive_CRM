// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Super Admin
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
  console.log('✅ Super Admin created:', superAdmin.email);

  // Create a sample branch
  const branch = await prisma.branch.upsert({
    where: { id: '000000000000000000000001' },
    update: {},
    create: {
      name: 'Main Branch',
      location: 'Mumbai, Maharashtra',
      phone: '022-12345678',
      email: 'main@autobill.com',
    },
  });
  console.log('✅ Branch created:', branch.name);

  // Create sample users for each role
  const roles = [
    { email: 'manager@autobill.com', name: 'Branch Manager', role: 'MANAGER', phone: '9876543210' },
    { email: 'technician@autobill.com', name: 'John Technician', role: 'EMPLOYEE', phone: '9876543211' },
    { email: 'cashier@autobill.com', name: 'Jane Cashier', role: 'CASHIER', phone: '9876543212' },
  ];

  for (const userData of roles) {
    const password = await bcrypt.hash('password123', 12);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password,
        branchId: branch.id,
        isActive: true,
      },
    });
    console.log(`✅ ${userData.role} created:`, user.email);
  }

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   Super Admin: admin@autobill.com / admin123');
  console.log('   Manager: manager@autobill.com / password123');
  console.log('   Technician: technician@autobill.com / password123');
  console.log('   Cashier: cashier@autobill.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });