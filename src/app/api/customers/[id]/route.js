// app/api/customers/[id]/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(req, { params }) {
  try {
    const { id } = params;
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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        vehicles: true,
        invoices: true,
        createdByUser: { select: { name: true, email: true } },
        branch: { select: { name: true } },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: customer },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch customer error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
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

    if (!currentUser || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to delete customers' },
        { status: 403 }
      );
    }

    // Check if customer has vehicles or invoices
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        vehicles: true,
        invoices: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.vehicles.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete customer with vehicles. Remove vehicles first.' },
        { status: 400 }
      );
    }

    if (customer.invoices.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete customer with invoices.' },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: 'Customer deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
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

    if (!currentUser || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update customers' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, phone, address, city, state, pincode } = body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: name?.trim(),
        email: email?.trim() || null,
        phone: phone?.trim(),
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        pincode: pincode?.trim() || null,
      },
      include: {
        vehicles: true,
        createdByUser: { select: { name: true, email: true } },
        branch: { select: { name: true } },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Customer updated successfully', data: customer },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}