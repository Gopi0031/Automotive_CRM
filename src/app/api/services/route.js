// src/app/api/services/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// GET - Fetch all services
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
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    let whereClause = {};

    // Filter by active status
    if (active === 'true') {
      whereClause.isActive = true;
    } else if (active === 'false') {
      whereClause.isActive = false;
    }

    // Role-based filtering
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.branchId) {
      whereClause.OR = [
        { branchId: currentUser.branchId },
        { branchId: null }, // Global services
      ];
    }

    // Search filter
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Category filter
    if (category) {
      whereClause.category = category;
    }

    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            jobs: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(
      { success: true, data: services },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch services error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new service
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

    // Check permissions - Only SUPER_ADMIN and MANAGER can create services
    if (!['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to create services' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      code,
      name,
      description,
      category,
      basePrice,
      estimatedHours,
      branchId,
    } = body;

    // Validation
    if (!code || !name || !category || basePrice === undefined) {
      return NextResponse.json(
        { success: false, message: 'Code, name, category, and base price are required' },
        { status: 400 }
      );
    }

    if (Number(basePrice) < 0) {
      return NextResponse.json(
        { success: false, message: 'Base price cannot be negative' },
        { status: 400 }
      );
    }

    // Check if service code already exists
    const existingService = await prisma.service.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existingService) {
      return NextResponse.json(
        { success: false, message: 'Service code already exists' },
        { status: 400 }
      );
    }

    // Determine branch ID
    const serviceBranchId = currentUser.role === 'SUPER_ADMIN' && branchId
      ? branchId
      : currentUser.branchId;

    // Create service
    const service = await prisma.service.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        category: category.trim(),
        basePrice: Number(basePrice),
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        branchId: serviceBranchId,
        isActive: true,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_SERVICE',
        entity: 'Service',
        entityId: service.id,
        description: `Created service: ${service.name} (${service.code}) - ₹${service.basePrice}`,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Service created successfully', data: service },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create service error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Service code already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update service
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

    if (!currentUser || !['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update services' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      id,
      code,
      name,
      description,
      category,
      basePrice,
      estimatedHours,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Service ID is required' },
        { status: 400 }
      );
    }

    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      return NextResponse.json(
        { success: false, message: 'Service not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData = {};

    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category.trim();
    if (basePrice !== undefined) {
      if (Number(basePrice) < 0) {
        return NextResponse.json(
          { success: false, message: 'Base price cannot be negative' },
          { status: 400 }
        );
      }
      updateData.basePrice = Number(basePrice);
    }
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours ? Number(estimatedHours) : null;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_SERVICE',
        entity: 'Service',
        entityId: service.id,
        description: `Updated service: ${service.name}`,
        metadata: { changes: Object.keys(updateData) },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Service updated successfully', data: service },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update service error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Service code already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete/deactivate service
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
        { success: false, message: 'You do not have permission to delete services' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Service ID is required' },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: 'Service not found' },
        { status: 404 }
      );
    }

    // If service has been used in jobs, soft delete
    if (service._count.jobs > 0) {
      await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'DEACTIVATE_SERVICE',
          entity: 'Service',
          entityId: id,
          description: `Deactivated service: ${service.name} (has ${service._count.jobs} job records)`,
        },
      });

      return NextResponse.json(
        { success: true, message: 'Service deactivated successfully (has job history)' },
        { status: 200 }
      );
    }

    // Otherwise, hard delete
    await prisma.service.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'DELETE_SERVICE',
        entity: 'Service',
        entityId: id,
        description: `Deleted service: ${service.name}`,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Service deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete service error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}