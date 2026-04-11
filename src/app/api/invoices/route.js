// src/app/api/invoices/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Generate unique invoice number
const generateInvoiceNumber = async (branchId) => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  
  const count = await prisma.invoice.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      ...(branchId && { branchId }),
    },
  });
  
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

// GET - Fetch all invoices
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
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereClause = {};

    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin can see all invoices
    } else if (currentUser.branchId) {
      whereClause.branchId = currentUser.branchId;
    } else {
      return NextResponse.json(
        { success: false, message: 'No branch assigned' },
        { status: 403 }
      );
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        job: {
          include: {
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
                make: true,
                model: true,
              }
            },
            services: {
              include: {
                service: true
              }
            },
            parts: {
              include: {
                part: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
            email: true,
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      { success: true, data: invoices },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new invoice
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
        { success: false, message: 'You do not have permission to create invoices' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    console.log('📥 Received invoice data:', body);

    const { 
      jobId, 
      subtotal, 
      tax, 
      discount, 
      dueDate, 
      notes,
      termsConditions,
    } = body;

    // Validation
    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job is required' },
        { status: 400 }
      );
    }

    // Get job with services and parts
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        vehicle: {
          include: {
            customer: true
          }
        },
        services: {
          include: {
            service: true
          }
        },
        parts: {
          include: {
            part: true
          }
        },
        invoice: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice already exists for this job' },
        { status: 400 }
      );
    }

    const invoiceBranchId = job.branchId || currentUser.branchId;

    if (!invoiceBranchId) {
      return NextResponse.json(
        { success: false, message: 'Branch is required' },
        { status: 400 }
      );
    }

    // ✅ FIX: Properly parse all numeric values
    const parsedSubtotal = Number(subtotal) || 0;
    const parsedTax = Number(tax) || 0;
    const parsedDiscount = Number(discount) || 0;
    
    // ✅ FIX: Calculate total correctly with numbers
    const calculatedTotal = parsedSubtotal + parsedTax - parsedDiscount;

    console.log('💰 Parsed values:', {
      subtotal: parsedSubtotal,
      tax: parsedTax,
      discount: parsedDiscount,
      total: calculatedTotal
    });

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(invoiceBranchId);

    // Create invoice with correct numeric values
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        jobId,
        customerId: job.vehicle.customer.id,
        branchId: invoiceBranchId,
        subtotal: parsedSubtotal,
        tax: parsedTax,
        discount: parsedDiscount,
        total: calculatedTotal,
        amountPaid: 0,
        status: 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: notes || null,
        termsConditions: termsConditions || 'Payment is due within 7 days. Thank you for your business!',
      },
      include: {
        job: {
          include: {
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
                make: true,
                model: true,
              }
            },
            services: {
              include: {
                service: true
              }
            },
            parts: {
              include: {
                part: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        },
        payments: true,
      },
    });

    console.log('✅ Created invoice:', {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      total: invoice.total
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_INVOICE',
        entity: 'Invoice',
        entityId: invoice.id,
        description: `Created invoice ${invoice.invoiceNumber} for ₹${calculatedTotal.toFixed(2)}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Invoice created successfully', data: invoice },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update invoice
export async function PUT(req) {
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
        { success: false, message: 'You do not have permission to update invoices' },
        { status: 403 }
      );
    }

    const { id, status, subtotal, tax, discount, dueDate, notes } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData = {};
    
    if (status) updateData.status = status;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (notes !== undefined) updateData.notes = notes;

    // Handle amount updates
    let newSubtotal = existingInvoice.subtotal;
    let newTax = existingInvoice.tax;
    let newDiscount = existingInvoice.discount;

    if (subtotal !== undefined) {
      newSubtotal = Number(subtotal) || 0;
      updateData.subtotal = newSubtotal;
    }
    if (tax !== undefined) {
      newTax = Number(tax) || 0;
      updateData.tax = newTax;
    }
    if (discount !== undefined) {
      newDiscount = Number(discount) || 0;
      updateData.discount = newDiscount;
    }

    // Recalculate total if any amount changed
    if (subtotal !== undefined || tax !== undefined || discount !== undefined) {
      updateData.total = newSubtotal + newTax - newDiscount;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          include: {
            vehicle: true
          }
        },
        customer: true,
        payments: true,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Invoice updated successfully', data: invoice },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Cancel invoice
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

    if (!currentUser || !['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to cancel invoices' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.payments.length > 0 && invoice.amountPaid > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot cancel invoice with payments. Please refund payments first.' },
        { status: 400 }
      );
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CANCEL_INVOICE',
        entity: 'Invoice',
        entityId: id,
        description: `Cancelled invoice ${invoice.invoiceNumber}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Invoice cancelled successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cancel invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}