// src/app/api/dashboard/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { branch: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let dashboardData = {};

    switch (currentUser.role) {
      case 'SUPER_ADMIN':
        dashboardData = await getSuperAdminStats();
        break;
      case 'MANAGER':
        dashboardData = await getManagerStats(currentUser.branchId);
        break;
      case 'EMPLOYEE':
        dashboardData = await getEmployeeStats(currentUser.id);
        break;
      case 'CASHIER':
        dashboardData = await getCashierStats(currentUser.branchId);
        break;
      default:
        dashboardData = {};
    }

    return NextResponse.json(
      {
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      { success: true, data: {}, message: 'Stats temporarily unavailable' },
      { status: 200 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function getSuperAdminStats() {
  // Get valid user IDs to avoid orphan issues with payment aggregation
  const validUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);

  const [
    totalCustomers,
    totalBranches,
    activeJobs,
    totalRevenue,
    totalInvoices,
    todaysJobs,
    todaysPayments,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.branch.count(),
    prisma.job.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS', 'AWAITING_PARTS'] } },
    }),
    prisma.payment.aggregate({
      where: { receivedById: { in: validUserIds } },
      _sum: { amount: true },
    }),
    prisma.invoice.count({
      where: { status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
    }),
    prisma.job.count({
      where: {
        createdAt: { gte: getStartOfDay() },
      },
    }),
    prisma.payment.aggregate({
      where: {
        receivedById: { in: validUserIds },
        createdAt: { gte: getStartOfDay() },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalCustomers,
    totalBranches,
    activeJobs,
    totalRevenue: totalRevenue._sum.amount || 0,
    pendingInvoices: totalInvoices,
    todaysJobs,
    todaysCollection: todaysPayments._sum.amount || 0,
  };
}

async function getManagerStats(branchId) {
  if (!branchId) return {};

  const validUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
  const today = getStartOfDay();
  const weekAgo = getStartOfWeek();

  const [
    pendingJobs,
    teamMembers,
    todaysJobs,
    branchRevenue,
    activeJobs,
    completedThisWeek,
  ] = await Promise.all([
    prisma.job.count({
      where: { branchId, status: 'PENDING' },
    }),
    prisma.user.count({
      where: { branchId, isActive: true },
    }),
    prisma.job.count({
      where: { branchId, createdAt: { gte: today } },
    }),
    prisma.payment.aggregate({
      where: {
        receivedById: { in: validUserIds },
        invoice: { branchId },
      },
      _sum: { amount: true },
    }),
    prisma.job.count({
      where: {
        branchId,
        status: { in: ['IN_PROGRESS', 'AWAITING_PARTS'] },
      },
    }),
    prisma.job.count({
      where: {
        branchId,
        status: { in: ['COMPLETED', 'DELIVERED'] },
        completedDate: { gte: weekAgo },
      },
    }),
  ]);

  return {
    pendingJobs,
    teamMembers,
    todaysJobs,
    branchRevenue: branchRevenue._sum.amount || 0,
    activeJobs,
    completedThisWeek,
  };
}

async function getEmployeeStats(userId) {
  const today = getStartOfDay();
  const weekAgo = getStartOfWeek();

  const [
    assignedJobs,
    inProgressJobs,
    completedToday,
    completedThisWeek,
  ] = await Promise.all([
    prisma.job.count({
      where: {
        assignedToId: userId,
        status: { in: ['PENDING', 'AWAITING_PARTS'] },
      },
    }),
    prisma.job.count({
      where: {
        assignedToId: userId,
        status: 'IN_PROGRESS',
      },
    }),
    prisma.job.count({
      where: {
        assignedToId: userId,
        status: { in: ['COMPLETED', 'DELIVERED'] },
        completedDate: { gte: today },
      },
    }),
    prisma.job.count({
      where: {
        assignedToId: userId,
        status: { in: ['COMPLETED', 'DELIVERED'] },
        completedDate: { gte: weekAgo },
      },
    }),
  ]);

  return {
    assignedJobs,
    inProgressJobs,
    completedToday,
    completedThisWeek,
  };
}

async function getCashierStats(branchId) {
  const validUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
  const today = getStartOfDay();

  const paymentWhere = {
    receivedById: { in: validUserIds },
    ...(branchId ? { invoice: { branchId } } : {}),
  };

  const invoiceWhere = branchId ? { branchId } : {};

  const [
    todaysCollection,
    pendingInvoices,
    paymentsToday,
    overdueInvoices,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { ...paymentWhere, createdAt: { gte: today } },
      _sum: { amount: true },
    }),
    prisma.invoice.count({
      where: { ...invoiceWhere, status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
    }),
    prisma.payment.count({
      where: { ...paymentWhere, createdAt: { gte: today } },
    }),
    prisma.invoice.count({
      where: { ...invoiceWhere, status: 'OVERDUE' },
    }),
  ]);

  return {
    todaysCollection: todaysCollection._sum.amount || 0,
    pendingInvoices,
    paymentsToday,
    overdueInvoices,
  };
}

// Helper functions
function getStartOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}