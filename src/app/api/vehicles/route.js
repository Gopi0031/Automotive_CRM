// app/api/vehicles/route.js
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

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    let whereClause = {};
    
    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.branchId) {
      whereClause.customer = {
        branchId: currentUser.branchId,
      };
    }

    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        jobs: {
          select: { id: true, jobNumber: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      { success: true, data: vehicles },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch vehicles error:', error);
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

    const body = await req.json();
    const {
      customerId,
      make,
      model,
      year,
      variant,
      color,
      licensePlate,
      presentOdometer,
      fuelType,
      transmissionType,
      engineCapacity,
      registrationDate,
      insuranceExpiry,
      insuranceCompany,
      insurancePolicyNo,
      pucExpiry,
      vehicleCondition,
      knownIssues,
      specialInstructions,
      customerNotes,
      internalNotes,
    } = body;

    // Validation
    if (!customerId || !make || !model || !year || !licensePlate) {
      return NextResponse.json(
        { success: false, message: 'Customer, make, model, year, and license plate are required' },
        { status: 400 }
      );
    }

    // Check if license plate already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { licensePlate: licensePlate.toUpperCase().trim() },
    });

    if (existingVehicle) {
      return NextResponse.json(
        { success: false, message: 'Vehicle with this license plate already exists' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        customerId,
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        variant: variant?.trim() || null,
        color: color?.trim() || null,
        licensePlate: licensePlate.toUpperCase().trim(),
        presentOdometer: presentOdometer ? parseInt(presentOdometer) : null,
        fuelType: fuelType || 'PETROL',
        transmissionType: transmissionType || 'MANUAL',
        engineCapacity: engineCapacity ? parseInt(engineCapacity) : null,
        registrationDate: registrationDate ? new Date(registrationDate) : null,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        insuranceCompany: insuranceCompany?.trim() || null,
        insurancePolicyNo: insurancePolicyNo?.trim() || null,
        pucExpiry: pucExpiry ? new Date(pucExpiry) : null,
        vehicleCondition: vehicleCondition || 'GOOD',
        knownIssues: knownIssues?.trim() || null,
        specialInstructions: specialInstructions?.trim() || null,
        customerNotes: customerNotes?.trim() || null,
        internalNotes: internalNotes?.trim() || null,
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Vehicle added successfully', data: vehicle },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create vehicle error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}