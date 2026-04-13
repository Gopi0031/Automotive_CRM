// prisma/cleanup.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Starting cleanup...\n');

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const validIds = users.map(u => u.id);
  console.log(`✅ Found ${validIds.length} valid users`);

  // Clean orphaned activity logs
  const allActivities = await prisma.activityLog.findMany({
    select: { id: true, userId: true },
  });
  const orphanedActivities = allActivities.filter(a => !validIds.includes(a.userId));
  if (orphanedActivities.length > 0) {
    const deleted = await prisma.activityLog.deleteMany({
      where: { id: { in: orphanedActivities.map(a => a.id) } },
    });
    console.log(`🗑️  Deleted ${deleted.count} orphaned activity logs`);
  } else {
    console.log(`✅ No orphaned activity logs`);
  }

  // Clean orphaned payments
  const allPayments = await prisma.payment.findMany({
    select: { id: true, receivedById: true, amount: true },
  });
  const orphanedPayments = allPayments.filter(p => !validIds.includes(p.receivedById));
  if (orphanedPayments.length > 0) {
    console.log(`\n⚠️  Found ${orphanedPayments.length} payments with deleted users`);
    
    // Option 1: Reassign to a valid admin user
    const adminUser = users.find(u => u.name === 'Super Admin') || users[0];
    if (adminUser) {
      const updated = await prisma.payment.updateMany({
        where: { id: { in: orphanedPayments.map(p => p.id) } },
        data: { receivedById: adminUser.id },
      });
      console.log(`✅ Reassigned ${updated.count} payments to ${adminUser.name} (${adminUser.id})`);
    }
  } else {
    console.log(`✅ No orphaned payments`);
  }

  // Clean orphaned notifications
  const allNotifs = await prisma.notification.findMany({
    select: { id: true, userId: true },
  });
  const orphanedNotifs = allNotifs.filter(n => !validIds.includes(n.userId));
  if (orphanedNotifs.length > 0) {
    const deleted = await prisma.notification.deleteMany({
      where: { id: { in: orphanedNotifs.map(n => n.id) } },
    });
    console.log(`🗑️  Deleted ${deleted.count} orphaned notifications`);
  } else {
    console.log(`✅ No orphaned notifications`);
  }

  console.log('\n🎉 Cleanup complete!');
}

cleanup()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());