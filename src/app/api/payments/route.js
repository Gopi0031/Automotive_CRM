// src/app/api/payments/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// GET - Fetch all payments
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
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const method = searchParams.get('method');
    const search = searchParams.get('search');

    // Get all valid user IDs to filter out orphaned payments
    const existingUsers = await prisma.user.findMany({
      select: { id: true },
    });
    const validUserIds = existingUsers.map(u => u.id);

    // Build where clause using AND array
    let conditions = [];

    // Filter out payments with deleted receivedBy users
    if (validUserIds.length > 0) {
      conditions.push({
        receivedById: { in: validUserIds },
      });
    }

    // Role-based branch filter
    if (currentUser.role !== 'SUPER_ADMIN') {
      if (!currentUser.branchId) {
        return NextResponse.json(
          { success: false, message: 'No branch assigned' },
          { status: 403 }
        );
      }
      conditions.push({
        invoice: {
          branchId: currentUser.branchId,
        },
      });
    }

    // Method filter
    if (method) {
      conditions.push({ method });
    }

    // Date filters
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
      }
      conditions.push({ createdAt: dateFilter });
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Find matching invoice IDs first to avoid nested OR conflicts
      const matchingInvoices = await prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
            { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
            { customer: { phone: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        },
        select: { id: true },
      });

      const invoiceIds = matchingInvoices.map(i => i.id);

      const searchConditions = [];
      if (searchTerm) {
        searchConditions.push({ reference: { contains: searchTerm, mode: 'insensitive' } });
      }
      if (invoiceIds.length > 0) {
        searchConditions.push({ invoiceId: { in: invoiceIds } });
      }

      if (searchConditions.length > 0) {
        conditions.push({ OR: searchConditions });
      } else if (invoiceIds.length === 0) {
        // No matches found - return empty
        return NextResponse.json(
          { success: true, data: [] },
          { status: 200 }
        );
      }
    }

    const whereClause = conditions.length > 0 ? { AND: conditions } : {};

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            job: {
              select: {
                id: true,
                jobNumber: true,
                vehicle: {
                  select: {
                    licensePlate: true,
                    make: true,
                    model: true,
                  },
                },
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      { success: true, data: payments },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch payments error:', error);
    return NextResponse.json(
      { success: true, data: [], message: 'Payments temporarily unavailable' },
      { status: 200 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new payment
export async function POST(req) {
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
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (!['SUPER_ADMIN', 'MANAGER', 'CASHIER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to process payments' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { invoiceId, amount, method, reference, notes } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, message: 'Invoice is required' },
        { status: 400 }
      );
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid payment amount is required' },
        { status: 400 }
      );
    }

    if (!method) {
      return NextResponse.json(
        { success: false, message: 'Payment method is required' },
        { status: 400 }
      );
    }

    const validMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'MOBILE_MONEY'];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { success: false, message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        customer: true,
        job: {
          select: {
            id: true,
            jobNumber: true,
            status: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { success: false, message: 'Invoice is already fully paid' },
        { status: 400 }
      );
    }

    if (invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, message: 'Cannot add payment to cancelled invoice' },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    const remainingBalance = invoice.total - invoice.amountPaid;

    if (parsedAmount > remainingBalance + 0.01) {
      return NextResponse.json(
        { success: false, message: `Payment amount (₹${parsedAmount}) exceeds remaining balance (₹${remainingBalance.toFixed(2)})` },
        { status: 400 }
      );
    }

    const newAmountPaid = invoice.amountPaid + parsedAmount;
    const newStatus = newAmountPaid >= invoice.total ? 'PAID' : 'PARTIALLY_PAID';

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: parsedAmount,
          method,
          reference: reference || null,
          notes: notes || null,
          receivedById: currentUser.id,
        },
        include: {
          invoice: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          receivedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
        },
      });

      // Auto-deliver on full payment
      if (newStatus === 'PAID' && invoice.job && invoice.job.status === 'COMPLETED') {
        await tx.job.update({
          where: { id: invoice.job.id },
          data: { status: 'DELIVERED' },
        });
      }

      return payment;
    });

    // Log activity (non-blocking)
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { id: true },
      });
      if (userExists) {
        await prisma.activityLog.create({
          data: {
            userId: currentUser.id,
            action: 'PAYMENT_RECEIVED',
            entity: 'Payment',
            entityId: result.id,
            description: `received payment of ₹${parsedAmount.toLocaleString('en-IN')} for invoice ${invoice.invoiceNumber} via ${method}`,
            metadata: {
              invoiceId,
              invoiceNumber: invoice.invoiceNumber,
              amount: parsedAmount,
              method,
              newStatus,
              customerName: invoice.customer?.name,
            },
          },
        });
      }
    } catch (actErr) {
      console.error('Activity log failed:', actErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: newStatus === 'PAID'
          ? 'Payment processed! Invoice is now fully paid.'
          : `Payment of ₹${parsedAmount.toLocaleString('en-IN')} processed successfully`,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Void payment
export async function DELETE(req) {
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
    });

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only Super Admin can void payments' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amountPaid: true,
            total: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 404 }
      );
    }

    const newAmountPaid = Math.max(0, payment.invoice.amountPaid - payment.amount);
    const newStatus = newAmountPaid <= 0 ? 'PENDING' : 'PARTIALLY_PAID';

    await prisma.$transaction([
      prisma.payment.delete({ where: { id } }),
      prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
        },
      }),
    ]);

    // Log activity (non-blocking)
    try {
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'VOID_PAYMENT',
          entity: 'Payment',
          entityId: id,
          description: `voided payment of ₹${payment.amount.toLocaleString('en-IN')} for invoice ${payment.invoice.invoiceNumber}`,
          metadata: {
            amount: payment.amount,
            invoiceNumber: payment.invoice.invoiceNumber,
          },
        },
      });
    } catch (actErr) {
      console.error('Activity log failed:', actErr);
    }

    return NextResponse.json(
      { success: true, message: 'Payment voided successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Void payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}