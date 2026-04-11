// src/app/api/inventory-requests/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Generate unique request number
const generateRequestNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const count = await prisma.inventoryRequest.count({
    where: {
      createdAt: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lte: new Date(today.setHours(23, 59, 59, 999)),
      },
    },
  });
  
  return `REQ-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

// GET - Fetch inventory requests
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
    const jobId = searchParams.get('jobId');

    let whereClause = {};

    // Role-based filtering
    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin sees all requests
    } else if (currentUser.role === 'MANAGER') {
      // Manager sees their branch requests
      whereClause.branchId = currentUser.branchId;
    } else if (currentUser.role === 'EMPLOYEE') {
      // Technician sees only their own requests
      whereClause.requestedById = currentUser.id;
    } else {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    if (status) {
      whereClause.status = status;
    }

    if (jobId) {
      whereClause.jobId = jobId;
    }

    const requests = await prisma.inventoryRequest.findMany({
      where: whereClause,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            description: true,
            vehicle: {
              select: {
                licensePlate: true,
                make: true,
                model: true,
              }
            }
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        },
        items: {
          include: {
            part: {
              select: {
                id: true,
                partNumber: true,
                name: true,
                quantity: true,
                sellingPrice: true,
                category: true,
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { urgency: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json(
      { success: true, data: requests },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch inventory requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new inventory request (Technician)
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

    // Only technicians (EMPLOYEE) can create requests
    if (currentUser.role !== 'EMPLOYEE') {
      return NextResponse.json(
        { success: false, message: 'Only technicians can create inventory requests' },
        { status: 403 }
      );
    }

    const { jobId, items, notes, urgency } = await req.json();

    // Validation
    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Verify job exists and is assigned to this technician
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.assignedToId !== currentUser.id) {
      return NextResponse.json(
        { success: false, message: 'This job is not assigned to you' },
        { status: 403 }
      );
    }

    // Generate request number
    const requestNumber = await generateRequestNumber();

    // Create request with items
    const request = await prisma.inventoryRequest.create({
      data: {
        requestNumber,
        jobId,
        requestedById: currentUser.id,
        branchId: job.branchId,
        notes: notes || null,
        urgency: urgency || 'MEDIUM',
        items: {
          create: items.map(item => ({
            partId: item.partId,
            quantityRequested: parseInt(item.quantity),
            notes: item.notes || null,
          }))
        }
      },
      include: {
        job: {
          select: {
            jobNumber: true,
            vehicle: {
              select: {
                licensePlate: true,
              }
            }
          }
        },
        items: {
          include: {
            part: true
          }
        }
      }
    });

    // Notify branch manager(s)
    const managers = await prisma.user.findMany({
      where: {
        branchId: job.branchId,
        role: 'MANAGER',
        isActive: true,
      },
    });

    // Create notifications for managers
    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map(manager => ({
          userId: manager.id,
          type: 'INVENTORY_REQUEST',
          title: 'New Inventory Request',
          message: `${currentUser.name} requested ${items.length} item(s) for Job ${request.job.jobNumber}`,
          entityType: 'InventoryRequest',
          entityId: request.id,
        }))
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_INVENTORY_REQUEST',
        entity: 'InventoryRequest',
        entityId: request.id,
        description: `Created inventory request ${request.requestNumber} for job ${job.jobNumber}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Inventory request created successfully', data: request },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create inventory request error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}