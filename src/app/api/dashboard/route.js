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
      include: { branch: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let dashboardData = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
      { success: true, data: dashboardData },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function getSuperAdminStats() {
  const [
    totalCustomers,
    totalBranches,
    activeJobs,
    totalRevenue
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.branch.count(),
    prisma.job.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS', 'AWAITING_PARTS'] } }
    }),
    prisma.payment.aggregate({
      _sum: { amount: true }
    })
  ]);

  return {
    totalCustomers,
    totalBranches,
    activeJobs,
    totalRevenue: totalRevenue._sum.amount || 0
  };
}

async function getManagerStats(branchId) {
  if (!branchId) return {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    pendingJobs,
    teamMembers,
    todaysJobs,
    branchRevenue
  ] = await Promise.all([
    prisma.job.count({
      where: { 
        branchId,
        status: 'PENDING'
      }
    }),
    prisma.user.count({
      where: { branchId, isActive: true }
    }),
    prisma.job.count({
      where: {
        branchId,
        createdAt: { gte: today }
      }
    }),
    prisma.payment.aggregate({
      where: {
        invoice: { branchId }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    pendingJobs,
    teamMembers,
    todaysJobs,
    branchRevenue: branchRevenue._sum.amount || 0
  };
}

async function getEmployeeStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    assignedJobs,
    inProgressJobs,
    completedToday,
    completedThisWeek
  ] = await Promise.all([
    prisma.job.count({
      where: { 
        assignedToId: userId,
        status: { in: ['PENDING', 'AWAITING_PARTS'] }
      }
    }),
    prisma.job.count({
      where: { 
        assignedToId: userId,
        status: 'IN_PROGRESS'
      }
    }),
    prisma.job.count({
      where: {
        assignedToId: userId,
        status: 'COMPLETED',
        completedDate: { gte: today }
      }
    }),
    prisma.job.count({
      where: {
        assignedToId: userId,
        status: 'COMPLETED',
        completedDate: { gte: weekAgo }
      }
    })
  ]);

  return {
    assignedJobs,
    inProgressJobs,
    completedToday,
    completedThisWeek
  };
}

async function getCashierStats(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const whereClause = branchId ? { invoice: { branchId } } : {};
  const invoiceWhere = branchId ? { branchId } : {};

  const [
    todaysCollection,
    pendingInvoices,
    paymentsToday,
    overdueInvoices
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        ...whereClause,
        createdAt: { gte: today }
      },
      _sum: { amount: true }
    }),
    prisma.invoice.count({
      where: {
        ...invoiceWhere,
        status: 'PENDING'
      }
    }),
    prisma.payment.count({
      where: {
        ...whereClause,
        createdAt: { gte: today }
      }
    }),
    prisma.invoice.count({
      where: {
        ...invoiceWhere,
        status: 'OVERDUE'
      }
    })
  ]);

  return {
    todaysCollection: todaysCollection._sum.amount || 0,
    pendingInvoices,
    paymentsToday,
    overdueInvoices
  };
}