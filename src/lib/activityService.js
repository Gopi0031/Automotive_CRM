// src/lib/activityService.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ActivityTypes = {
  // User Activities
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  
  // Job Activities
  JOB_CREATED: 'JOB_CREATED',
  JOB_ASSIGNED: 'JOB_ASSIGNED',
  JOB_STATUS_CHANGED: 'JOB_STATUS_CHANGED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_CANCELLED: 'JOB_CANCELLED',
  
  // Invoice Activities
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_UPDATED: 'INVOICE_UPDATED',
  INVOICE_PAID: 'INVOICE_PAID',
  
  // Payment Activities
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  
  // Customer Activities
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  
  // Vehicle Activities
  VEHICLE_ADDED: 'VEHICLE_ADDED',
  VEHICLE_UPDATED: 'VEHICLE_UPDATED',
  
  // Parts Activities
  PART_ADDED: 'PART_ADDED',
  PART_UPDATED: 'PART_UPDATED',
  PART_LOW_STOCK: 'PART_LOW_STOCK',
  
  // Branch Activities
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
    throw error;
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
    let whereClause = {};

    // Role-based filtering
    switch (userRole) {
      case 'SUPER_ADMIN':
        // Super admin sees all activities
        break;
      case 'MANAGER':
        // Manager sees activities from their branch
        if (branchId) {
          whereClause = {
            user: {
              branchId: branchId,
            },
          };
        }
        break;
      case 'EMPLOYEE':
      case 'CASHIER':
        // Employees and cashiers see activities from their branch
        if (branchId) {
          whereClause = {
            OR: [
              { userId: userId }, // Their own activities
              {
                user: {
                  branchId: branchId,
                },
              },
            ],
          };
        }
        break;
    }

    // Filter by entity type if provided
    if (entityType) {
      whereClause.entity = entityType;
    }

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

    return activities;
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
}

export function getActivityColor(action) {
  const colors = {
    // User activities
    USER_LOGIN: 'bg-blue-100 text-blue-700',
    USER_LOGOUT: 'bg-gray-100 text-gray-700',
    USER_CREATED: 'bg-green-100 text-green-700',
    USER_UPDATED: 'bg-yellow-100 text-yellow-700',
    USER_DELETED: 'bg-red-100 text-red-700',
    
    // Job activities
    JOB_CREATED: 'bg-blue-100 text-blue-700',
    JOB_ASSIGNED: 'bg-purple-100 text-purple-700',
    JOB_STATUS_CHANGED: 'bg-yellow-100 text-yellow-700',
    JOB_COMPLETED: 'bg-green-100 text-green-700',
    JOB_CANCELLED: 'bg-red-100 text-red-700',
    
    // Invoice activities
    INVOICE_CREATED: 'bg-blue-100 text-blue-700',
    INVOICE_UPDATED: 'bg-yellow-100 text-yellow-700',
    INVOICE_PAID: 'bg-green-100 text-green-700',
    
    // Payment activities
    PAYMENT_RECEIVED: 'bg-green-100 text-green-700',
    PAYMENT_REFUNDED: 'bg-orange-100 text-orange-700',
    
    // Default
    default: 'bg-gray-100 text-gray-700',
  };

  return colors[action] || colors.default;
}