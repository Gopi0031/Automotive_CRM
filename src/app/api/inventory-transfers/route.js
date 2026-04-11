// src/app/api/inventory-transfers/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Generate unique transfer number
const generateTransferNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const count = await prisma.inventoryTransfer.count({
    where: {
      createdAt: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lte: new Date(today.setHours(23, 59, 59, 999)),
      },
    },
  });
  
  return `TRF-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

// GET - Fetch inventory transfers
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

    // Only managers and super admins can view transfers
    if (!['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let whereClause = {};

    if (currentUser.role === 'MANAGER') {
      if (type === 'incoming') {
        whereClause.toBranchId = currentUser.branchId;
      } else if (type === 'outgoing') {
        whereClause.fromBranchId = currentUser.branchId;
      } else {
        whereClause.OR = [
          { fromBranchId: currentUser.branchId },
          { toBranchId: currentUser.branchId },
        ];
      }
    }

    if (status) {
      whereClause.status = status;
    }

    const transfers = await prisma.inventoryTransfer.findMany({
      where: whereClause,
      include: {
        fromBranch: {
          select: {
            id: true,
            name: true,
            location: true,
          }
        },
        toBranch: {
          select: {
            id: true,
            name: true,
            location: true,
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          }
        },
        receivedBy: {
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
                category: true,
                sellingPrice: true,
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
      { success: true, data: transfers },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch transfers error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new transfer request
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

    if (!['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'Only managers can create transfer requests' },
        { status: 403 }
      );
    }

    const { fromBranchId, toBranchId, items, notes, urgency } = await req.json();

    if (!fromBranchId || !toBranchId) {
      return NextResponse.json(
        { success: false, message: 'Source and destination branches are required' },
        { status: 400 }
      );
    }

    if (fromBranchId === toBranchId) {
      return NextResponse.json(
        { success: false, message: 'Source and destination branches must be different' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one item is required' },
        { status: 400 }
      );
    }

    if (currentUser.role === 'MANAGER' && toBranchId !== currentUser.branchId) {
      return NextResponse.json(
        { success: false, message: 'Managers can only request items to their own branch' },
        { status: 403 }
      );
    }

    const transferNumber = await generateTransferNumber();

    const transfer = await prisma.inventoryTransfer.create({
      data: {
        transferNumber,
        fromBranchId,
        toBranchId,
        requestedById: currentUser.id,
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
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            part: true
          }
        }
      }
    });

    // Notify managers of source branch
    const sourceManagers = await prisma.user.findMany({
      where: {
        branchId: fromBranchId,
        role: 'MANAGER',
        isActive: true,
      },
    });

    if (sourceManagers.length > 0) {
      await prisma.notification.createMany({
        data: sourceManagers.map(manager => ({
          userId: manager.id,
          type: 'TRANSFER_REQUEST',
          title: 'New Transfer Request',
          message: `${currentUser.name} (${transfer.toBranch.name}) requested ${items.length} item(s) from your branch`,
          entityType: 'InventoryTransfer',
          entityId: transfer.id,
        }))
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_TRANSFER_REQUEST',
        entity: 'InventoryTransfer',
        entityId: transfer.id,
        description: `Created transfer request ${transfer.transferNumber} from ${transfer.fromBranch.name} to ${transfer.toBranch.name}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Transfer request created successfully', data: transfer },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create transfer request error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}