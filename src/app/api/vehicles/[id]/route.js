// app/api/vehicles/[id]/route.js
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

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        customer: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          include: {
            services: { include: { service: true } },
            parts: { include: { part: true } },
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: vehicle },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch vehicle error:', error);
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

    const body = await req.json();

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { success: false, message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // If license plate is being changed, check for duplicates
    if (body.licensePlate && body.licensePlate !== existingVehicle.licensePlate) {
      const duplicatePlate = await prisma.vehicle.findUnique({
        where: { licensePlate: body.licensePlate.toUpperCase().trim() },
      });

      if (duplicatePlate) {
        return NextResponse.json(
          { success: false, message: 'License plate already exists' },
          { status: 400 }
        );
      }
    }

    const updateData = {};
    
    const stringFields = ['make', 'model', 'variant', 'color', 'insuranceCompany', 
                          'insurancePolicyNo', 'knownIssues', 'specialInstructions', 
                          'customerNotes', 'internalNotes'];
    
    stringFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]?.trim() || null;
      }
    });

    if (body.licensePlate) {
      updateData.licensePlate = body.licensePlate.toUpperCase().trim();
    }

    const intFields = ['year', 'presentOdometer', 'lastServiceOdometer', 
                       'nextServiceOdometer', 'engineCapacity'];
    
    intFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] ? parseInt(body[field]) : null;
      }
    });

    const dateFields = ['registrationDate', 'insuranceExpiry', 'pucExpiry', 
                        'lastServiceDate', 'nextServiceDue'];
    
    dateFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] ? new Date(body[field]) : null;
      }
    });

    const enumFields = ['fuelType', 'transmissionType', 'vehicleCondition'];
    
    enumFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Vehicle updated successfully', data: vehicle },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update vehicle error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
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
        { success: false, message: 'You do not have permission to delete vehicles' },
        { status: 403 }
      );
    }

    // Check if vehicle has jobs
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { jobs: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (vehicle.jobs.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete vehicle with job history' },
        { status: 400 }
      );
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: 'Vehicle deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete vehicle error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Update odometer reading
export async function PATCH(req, { params }) {
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

    const body = await req.json();
    const { presentOdometer } = body;

    if (!presentOdometer || presentOdometer < 0) {
      return NextResponse.json(
        { success: false, message: 'Valid odometer reading is required' },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        presentOdometer: parseInt(presentOdometer),
      },
    });

    return NextResponse.json(
      { success: true, message: 'Odometer updated successfully', data: vehicle },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update odometer error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}