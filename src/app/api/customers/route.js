// app/api/customers/route.js
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
      where: { id: decoded.userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let customers;
    if (currentUser.role === 'SUPER_ADMIN') {
      customers = await prisma.customer.findMany({
        include: {
          vehicles: true,
          createdByUser: { select: { name: true, email: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (currentUser.branchId) {
      customers = await prisma.customer.findMany({
        where: { branchId: currentUser.branchId },
        include: {
          vehicles: true,
          createdByUser: { select: { name: true, email: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      customers = await prisma.customer.findMany({
        where: { createdBy: currentUser.id },
        include: {
          vehicles: true,
          createdByUser: { select: { name: true, email: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(
      { success: true, data: customers },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch customers error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

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
      where: { id: decoded.userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to create customers' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, phone, address, city, state, pincode } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { phone: phone },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer with this phone number already exists' },
        { status: 400 }
      );
    }

    const customerData = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      createdBy: currentUser.id,
    };

    // Only add branchId if user has one
    if (currentUser.branchId) {
      customerData.branchId = currentUser.branchId;
    }

    const customer = await prisma.customer.create({
      data: customerData,
      include: {
        vehicles: true,
        createdByUser: { select: { name: true, email: true } },
        branch: { select: { name: true } },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Customer created successfully', data: customer },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}