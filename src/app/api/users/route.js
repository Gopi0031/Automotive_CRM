// src/app/api/users/route.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { verifyToken } from '../../../lib/auth.js';
import { createActivity } from '../../../lib/activityService.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Helper function to check permissions
const canManageRole = (currentUserRole, targetRole) => {
  const roleHierarchy = {
    'SUPER_ADMIN': ['MANAGER', 'EMPLOYEE', 'CASHIER'],
    'MANAGER': ['EMPLOYEE', 'CASHIER'],
    'EMPLOYEE': [],
    'CASHIER': [],
  };
  return roleHierarchy[currentUserRole]?.includes(targetRole) || false;
};

// GET - Fetch all users
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
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const branchId = searchParams.get('branchId') || '';

    let whereClause = {};

    // Role-based filtering
    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin can see all users
    } else if (currentUser.role === 'MANAGER') {
      // Manager can only see users in their branch (excluding Super Admins)
      whereClause = {
        AND: [
          { branchId: currentUser.branchId },
          { role: { not: 'SUPER_ADMIN' } }
        ]
      };
    } else {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view users' },
        { status: 403 }
      );
    }

    // Apply search filter
    if (search) {
      whereClause = {
        ...whereClause,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Apply role filter
    if (role) {
      whereClause.role = role;
    }

    // Apply status filter
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    // Apply branch filter (for Super Admin)
    if (branchId && currentUser.role === 'SUPER_ADMIN') {
      whereClause.branchId = branchId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          }
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            jobs: true,
            payments: true,
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(
      { success: true, data: users },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new user
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

    // Only Super Admin and Manager can create users
    if (!['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to create users' },
        { status: 403 }
      );
    }

    const { email, password, name, phone, role, branchId } = await req.json();

    // Validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: email, password, name, role' },
        { status: 400 }
      );
    }

    // Check if current user can create this role
    if (!canManageRole(currentUser.role, role)) {
      return NextResponse.json(
        { success: false, message: `You cannot create a user with role: ${role}` },
        { status: 403 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already in use' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine branch ID
    let assignedBranchId = null;
    if (currentUser.role === 'SUPER_ADMIN') {
      assignedBranchId = branchId || null;
    } else {
      // Managers can only assign their own branch
      assignedBranchId = currentUser.branchId;
    }

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        phone: phone?.trim() || null,
        role,
        branchId: assignedBranchId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
          }
        },
        isActive: true,
        createdAt: true,
      }
    });

    // Log activity
    try {
      await createActivity({
        userId: currentUser.id,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: newUser.id,
        description: `created new user ${newUser.name} as ${newUser.role}`,
        metadata: { 
          targetUserId: newUser.id, 
          targetUserName: newUser.name,
          targetUserRole: newUser.role,
          targetUserEmail: newUser.email,
          branchId: assignedBranchId
        }
      });
    } catch (activityError) {
      console.error('Failed to log user creation activity:', activityError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update user
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

    const { id, name, email, phone, role, branchId, isActive, password } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Target user not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canEdit = 
      currentUser.id === id || // Users can edit themselves (limited)
      currentUser.role === 'SUPER_ADMIN' ||
      (currentUser.role === 'MANAGER' && 
       canManageRole(currentUser.role, targetUser.role) && 
       targetUser.branchId === currentUser.branchId);

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update this user' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData = {};
    const changes = [];
    
    // Name and phone can be updated by the user themselves
    if (name && name !== targetUser.name) {
      updateData.name = name.trim();
      changes.push('name');
    }
    if (phone !== undefined && phone !== targetUser.phone) {
      updateData.phone = phone?.trim() || null;
      changes.push('phone');
    }
    
    // Only admins/managers can change these fields
    if (currentUser.id !== id) {
      if (email && email !== targetUser.email) {
        // Check if email is already taken
        const existingUser = await prisma.user.findFirst({
          where: { 
            email: email.toLowerCase().trim(),
            NOT: { id }
          }
        });
        if (existingUser) {
          return NextResponse.json(
            { success: false, message: 'Email already in use' },
            { status: 400 }
          );
        }
        updateData.email = email.toLowerCase().trim();
        changes.push('email');
      }
      
      if (role && role !== targetUser.role) {
        if (!canManageRole(currentUser.role, role)) {
          return NextResponse.json(
            { success: false, message: `You cannot assign role: ${role}` },
            { status: 403 }
          );
        }
        updateData.role = role;
        changes.push('role');
      }
      
      if (branchId !== undefined && branchId !== targetUser.branchId && currentUser.role === 'SUPER_ADMIN') {
        updateData.branchId = branchId || null;
        changes.push('branch');
      }
      
      if (typeof isActive === 'boolean' && isActive !== targetUser.isActive) {
        updateData.isActive = isActive;
        changes.push('status');
      }
    }
    
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 12);
      changes.push('password');
    }

    // If no changes, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: true, message: 'No changes detected', data: targetUser },
        { status: 200 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
          }
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Log activity
    try {
      await createActivity({
        userId: currentUser.id,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: id,
        description: `updated user ${updatedUser.name}${changes.length > 0 ? ` (${changes.join(', ')})` : ''}`,
        metadata: { 
          targetUserId: id,
          targetUserName: updatedUser.name,
          changes: changes,
          updatedFields: updateData
        }
      });
    } catch (activityError) {
      console.error('Failed to log user update activity:', activityError);
    }

    return NextResponse.json(
      { success: true, message: 'User updated successfully', data: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Deactivate user
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

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Target user not found' },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check permissions
    const canDelete = 
      currentUser.role === 'SUPER_ADMIN' ||
      (currentUser.role === 'MANAGER' && 
       canManageRole(currentUser.role, targetUser.role) && 
       targetUser.branchId === currentUser.branchId);

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to delete this user' },
        { status: 403 }
      );
    }

    // Prevent deleting Super Admin
    if (targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete Super Admin account' },
        { status: 403 }
      );
    }

    if (permanent && currentUser.role === 'SUPER_ADMIN') {
      // Permanent delete (only Super Admin)
      await prisma.user.delete({
        where: { id },
      });

      // Log activity
      try {
        await createActivity({
          userId: currentUser.id,
          action: 'USER_DELETED',
          entity: 'User',
          entityId: id,
          description: `permanently deleted user ${targetUser.name}`,
          metadata: { 
            targetUserId: id,
            targetUserName: targetUser.name,
            targetUserRole: targetUser.role,
            permanent: true
          }
        });
      } catch (activityError) {
        console.error('Failed to log user deletion activity:', activityError);
      }
    } else {
      // Soft delete - just deactivate
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Log activity
      try {
        await createActivity({
          userId: currentUser.id,
          action: 'USER_UPDATED',
          entity: 'User',
          entityId: id,
          description: `deactivated user ${targetUser.name}`,
          metadata: { 
            targetUserId: id,
            targetUserName: targetUser.name,
            targetUserRole: targetUser.role,
            action: 'deactivated'
          }
        });
      } catch (activityError) {
        console.error('Failed to log user deactivation activity:', activityError);
      }
    }

    return NextResponse.json(
      { success: true, message: `User ${permanent ? 'deleted' : 'deactivated'} successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}