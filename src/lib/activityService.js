// src/lib/activityService.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ActivityTypes = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  JOB_CREATED: 'JOB_CREATED',
  JOB_ASSIGNED: 'JOB_ASSIGNED',
  JOB_STATUS_CHANGED: 'JOB_STATUS_CHANGED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_CANCELLED: 'JOB_CANCELLED',
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_UPDATED: 'INVOICE_UPDATED',
  INVOICE_PAID: 'INVOICE_PAID',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  VEHICLE_ADDED: 'VEHICLE_ADDED',
  VEHICLE_UPDATED: 'VEHICLE_UPDATED',
  PART_ADDED: 'PART_ADDED',
  PART_UPDATED: 'PART_UPDATED',
  PART_LOW_STOCK: 'PART_LOW_STOCK',
  BRANCH_CREATED: 'BRANCH_CREATED',
  BRANCH_UPDATED: 'BRANCH_UPDATED',
};

export const ActivityIcons = {
  USER_LOGIN: '👋',
  USER_LOGOUT: '👋',
  USER_CREATED: '👤',
  USER_UPDATED: '✏️',
  USER_DELETED: '🗑️',
  JOB_CREATED: '🔧',
  JOB_ASSIGNED: '👨‍🔧',
  JOB_STATUS_CHANGED: '🔄',
  JOB_COMPLETED: '✅',
  JOB_CANCELLED: '❌',
  INVOICE_CREATED: '📄',
  INVOICE_UPDATED: '📝',
  INVOICE_PAID: '💰',
  PAYMENT_RECEIVED: '💵',
  PAYMENT_REFUNDED: '↩️',
  CUSTOMER_CREATED: '👥',
  CUSTOMER_UPDATED: '✏️',
  VEHICLE_ADDED: '🚗',
  VEHICLE_UPDATED: '🔧',
  PART_ADDED: '📦',
  PART_UPDATED: '📝',
  PART_LOW_STOCK: '⚠️',
  BRANCH_CREATED: '🏢',
  BRANCH_UPDATED: '✏️',
};

export async function createActivity({
  userId,
  action,
  entity,
  entityId,
  description,
  metadata = {},
}) {
  try {
    // Verify user exists before creating activity
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      console.warn(`Skipping activity log: User ${userId} not found`);
      return null;
    }

    const activity = await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        description,
        metadata,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            branchId: true,
          },
        },
      },
    });

    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
}

export async function getRecentActivities({
  userId,
  userRole,
  branchId,
  limit = 20,
  entityType = null,
}) {
  try {
    // Step 1: Get all valid user IDs to filter out orphaned records
    const existingUsers = await prisma.user.findMany({
      select: { id: true, branchId: true },
    });
    const validUserIds = existingUsers.map(u => u.id);

    if (validUserIds.length === 0) {
      return [];
    }

    // Step 2: Build where clause - always filter to valid users only
    let whereClause = {
      userId: { in: validUserIds },
    };

    // Step 3: Role-based filtering
    switch (userRole) {
      case 'SUPER_ADMIN':
        // Super admin sees all activities (from existing users only)
        // whereClause already has userId: { in: validUserIds }
        break;

      case 'MANAGER':
        if (branchId) {
          // Get user IDs that belong to this branch
          const branchUserIds = existingUsers
            .filter(u => u.branchId === branchId)
            .map(u => u.id);

          whereClause.userId = {
            in: branchUserIds.length > 0 ? branchUserIds : ['__none__'],
          };
        }
        break;

      case 'EMPLOYEE':
      case 'CASHIER':
        if (branchId) {
          // Get user IDs that belong to this branch
          const sameBranchUserIds = existingUsers
            .filter(u => u.branchId === branchId)
            .map(u => u.id);

          // Include own activities + branch activities
          const combinedIds = [...new Set([userId, ...sameBranchUserIds])];
          whereClause.userId = {
            in: combinedIds,
          };
        } else {
          // Only own activities
          whereClause.userId = userId;
        }
        break;

      default:
        whereClause.userId = userId;
    }

    // Step 4: Filter by entity type if provided
    if (entityType) {
      whereClause.entity = entityType;
    }

    // Step 5: Fetch activities - no relation filtering, just simple userId matching
    const activities = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Step 6: Extra safety - filter out any null users that slipped through
    return activities.filter(a => a.user !== null);
  } catch (error) {
    console.error('Error fetching activities:', error);
    // Return empty array instead of crashing
    return [];
  }
}

export function getActivityColor(action) {
  const colors = {
    USER_LOGIN: 'bg-blue-100 text-blue-700',
    USER_LOGOUT: 'bg-gray-100 text-gray-700',
    USER_CREATED: 'bg-green-100 text-green-700',
    USER_UPDATED: 'bg-yellow-100 text-yellow-700',
    USER_DELETED: 'bg-red-100 text-red-700',
    JOB_CREATED: 'bg-blue-100 text-blue-700',
    JOB_ASSIGNED: 'bg-purple-100 text-purple-700',
    JOB_STATUS_CHANGED: 'bg-yellow-100 text-yellow-700',
    JOB_COMPLETED: 'bg-green-100 text-green-700',
    JOB_CANCELLED: 'bg-red-100 text-red-700',
    INVOICE_CREATED: 'bg-blue-100 text-blue-700',
    INVOICE_UPDATED: 'bg-yellow-100 text-yellow-700',
    INVOICE_PAID: 'bg-green-100 text-green-700',
    PAYMENT_RECEIVED: 'bg-green-100 text-green-700',
    PAYMENT_REFUNDED: 'bg-orange-100 text-orange-700',
    default: 'bg-gray-100 text-gray-700',
  };

  return colors[action] || colors.default;
}