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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const method = searchParams.get('method');
    const search = searchParams.get('search');

    // Build where clause based on role
    let whereClause = {};

    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin can see all payments
    } else if (currentUser.branchId) {
      // Others see only their branch payments
      whereClause.invoice = {
        branchId: currentUser.branchId
      };
    } else {
      return NextResponse.json(
        { success: false, message: 'No branch assigned' },
        { status: 403 }
      );
    }

    // Apply filters
    if (method) {
      whereClause.method = method;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      };
    } else if (startDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.createdAt = {
        lte: new Date(endDate + 'T23:59:59'),
      };
    }

    if (search) {
      whereClause.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        { invoice: { customer: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

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
              }
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
                  }
                }
              }
            },
            branch: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
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
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
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

    // Check permissions
    if (!['SUPER_ADMIN', 'MANAGER', 'CASHIER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to process payments' },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log('📥 Received payment data:', body);

    const { invoiceId, amount, method, reference, notes } = body;

    // Validation
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

    // Validate payment method
    const validMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'MOBILE_MONEY'];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { success: false, message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    // Get invoice with existing payments
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice is already paid or cancelled
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

    // Calculate payment amounts
    const parsedAmount = Number(amount);
    const remainingBalance = invoice.total - invoice.amountPaid;

    // Validate payment doesn't exceed remaining balance
    if (parsedAmount > remainingBalance + 0.01) { // Small tolerance for floating point
      return NextResponse.json(
        { success: false, message: `Payment amount (₹${parsedAmount}) exceeds remaining balance (₹${remainingBalance.toFixed(2)})` },
        { status: 400 }
      );
    }

    const newAmountPaid = invoice.amountPaid + parsedAmount;
    const newStatus = newAmountPaid >= invoice.total ? 'PAID' : 'PARTIALLY_PAID';

    console.log('💰 Payment calculation:', {
      invoiceTotal: invoice.total,
      previouslyPaid: invoice.amountPaid,
      thisPayment: parsedAmount,
      newAmountPaid,
      newStatus
    });

    // Create payment
    const payment = await prisma.payment.create({
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
              }
            }
          }
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    // Update invoice with new amount paid and status
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
        description: `Received payment of ₹${parsedAmount.toFixed(2)} for invoice ${invoice.invoiceNumber} via ${method}`,
        metadata: {
          invoiceId,
          amount: parsedAmount,
          method,
          newStatus
        }
      }
    });

    console.log('✅ Payment created:', payment.id);

    return NextResponse.json(
      { 
        success: true, 
        message: newStatus === 'PAID' 
          ? 'Payment processed successfully. Invoice is now fully paid!' 
          : 'Payment processed successfully', 
        data: payment 
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

// DELETE - Void/Refund payment (Super Admin only)
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
      include: { invoice: true }
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 404 }
      );
    }

    // Update invoice amounts
    const newAmountPaid = payment.invoice.amountPaid - payment.amount;
    let newStatus = 'PENDING';
    if (newAmountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    // Delete payment and update invoice in transaction
    await prisma.$transaction([
      prisma.payment.delete({
        where: { id }
      }),
      prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: Math.max(0, newAmountPaid),
          status: newStatus
        }
      })
    ]);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'VOID_PAYMENT',
        entity: 'Payment',
        entityId: id,
        description: `Voided payment of ₹${payment.amount.toFixed(2)} for invoice ${payment.invoice.invoiceNumber}`,
      }
    });

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