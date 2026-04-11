// src/app/api/branches/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Helper: clean managerId - convert empty/falsy to null
const cleanManagerId = (managerId) => {
  if (!managerId || managerId === '' || managerId.trim() === '' || managerId === 'undefined' || managerId === 'null') {
    return null;
  }
  return managerId.trim();
};

// GET - Fetch all branches
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

    let branches;
    
    if (currentUser.role === 'SUPER_ADMIN') {
      branches = await prisma.branch.findMany({
        include: { 
          manager: { 
            select: { id: true, name: true, email: true, phone: true } 
          },
          _count: {
            select: { 
              staff: true, 
              customers: true, 
              jobs: true,
              invoices: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (currentUser.branchId) {
      branches = await prisma.branch.findMany({
        where: { id: currentUser.branchId },
        include: { 
          manager: { 
            select: { id: true, name: true, email: true, phone: true } 
          },
          _count: {
            select: { 
              staff: true, 
              customers: true, 
              jobs: true,
              invoices: true,
            }
          }
        },
      });
    } else {
      branches = [];
    }

    return NextResponse.json({ success: true, data: branches }, { status: 200 });
  } catch (error) {
    console.error('Fetch branches error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new branch
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

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only Super Admin can create branches' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, location, phone, email, managerId } = body;

    console.log('📥 Branch create request:', { name, location, phone, email, managerId });

    // Validation
    if (!name || !location || !phone || !email) {
      return NextResponse.json(
        { success: false, message: 'Name, location, phone, and email are required' },
        { status: 400 }
      );
    }

    // ✅ FIX: Properly clean managerId
    const validManagerId = cleanManagerId(managerId);

    console.log('🔍 Cleaned managerId:', validManagerId, '(original:', managerId, ')');

    // If manager specified, validate
    if (validManagerId) {
      // Check if manager exists
      const manager = await prisma.user.findUnique({
        where: { id: validManagerId }
      });

      if (!manager) {
        return NextResponse.json(
          { success: false, message: 'Selected manager not found' },
          { status: 404 }
        );
      }

      if (manager.role !== 'MANAGER') {
        return NextResponse.json(
          { success: false, message: 'Selected user must have MANAGER role' },
          { status: 400 }
        );
      }

      // Check if manager is already assigned to another branch
      const existingAssignment = await prisma.branch.findUnique({
        where: { managerId: validManagerId }
      });

      if (existingAssignment) {
        return NextResponse.json(
          { success: false, message: `This manager is already assigned to branch "${existingAssignment.name}"` },
          { status: 400 }
        );
      }
    }

    // ✅ FIX: Build data object conditionally - DON'T include managerId if null
    const createData = {
      name: name.trim(),
      location: location.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
    };

    // Only add managerId if it's a valid value
    if (validManagerId) {
      createData.managerId = validManagerId;
    }

    console.log('💾 Creating branch with data:', createData);

    const branch = await prisma.branch.create({
      data: createData,
      include: { 
        manager: { 
          select: { id: true, name: true, email: true } 
        },
        _count: {
          select: { staff: true, customers: true, jobs: true, invoices: true }
        }
      },
    });

    // If manager assigned, update their branchId
    if (validManagerId) {
      await prisma.user.update({
        where: { id: validManagerId },
        data: { branchId: branch.id }
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_BRANCH',
        entity: 'Branch',
        entityId: branch.id,
        description: `Created branch: ${branch.name}`,
      }
    });

    console.log('✅ Branch created:', branch.id, branch.name);

    return NextResponse.json(
      { success: true, message: 'Branch created successfully', data: branch },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create branch error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('managerId')) {
        return NextResponse.json(
          { success: false, message: 'This manager is already assigned to another branch' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'A branch with this information already exists' },
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

// PUT - Update branch
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

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only Super Admin can update branches' },
        { status: 403 }
      );
    }

    const { id, name, location, phone, email, managerId } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Branch ID is required' },
        { status: 400 }
      );
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!existingBranch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }

    // ✅ FIX: Properly clean managerId
    const validManagerId = cleanManagerId(managerId);

    // Validate new manager if changed
    if (validManagerId && validManagerId !== existingBranch.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: validManagerId }
      });

      if (!manager) {
        return NextResponse.json(
          { success: false, message: 'Selected manager not found' },
          { status: 404 }
        );
      }

      if (manager.role !== 'MANAGER') {
        return NextResponse.json(
          { success: false, message: 'Selected user must have MANAGER role' },
          { status: 400 }
        );
      }

      const existingAssignment = await prisma.branch.findFirst({
        where: { 
          managerId: validManagerId,
          NOT: { id }
        }
      });

      if (existingAssignment) {
        return NextResponse.json(
          { success: false, message: `This manager is already assigned to branch "${existingAssignment.name}"` },
          { status: 400 }
        );
      }
    }

    // ✅ FIX: Build update data conditionally
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (location) updateData.location = location.trim();
    if (phone) updateData.phone = phone.trim();
    if (email) updateData.email = email.trim().toLowerCase();

    // Handle managerId update
    if (managerId !== undefined) {
      if (validManagerId) {
        updateData.managerId = validManagerId;
      } else {
        // Explicitly set to null to remove manager
        updateData.managerId = null;
      }
    }

    console.log('💾 Updating branch with data:', updateData);

    const branch = await prisma.branch.update({
      where: { id },
      data: updateData,
      include: { 
        manager: { 
          select: { id: true, name: true, email: true } 
        },
        _count: {
          select: { staff: true, customers: true, jobs: true, invoices: true }
        }
      },
    });

    // Update manager assignments
    if (managerId !== undefined) {
      // Remove old manager's branch assignment
      if (existingBranch.managerId && existingBranch.managerId !== validManagerId) {
        await prisma.user.update({
          where: { id: existingBranch.managerId },
          data: { branchId: null }
        });
      }
      
      // Set new manager's branch assignment
      if (validManagerId) {
        await prisma.user.update({
          where: { id: validManagerId },
          data: { branchId: branch.id }
        });
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_BRANCH',
        entity: 'Branch',
        entityId: branch.id,
        description: `Updated branch: ${branch.name}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Branch updated successfully', data: branch },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update branch error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'This manager is already assigned to another branch' },
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

// DELETE - Delete branch
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

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only Super Admin can delete branches' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Branch ID is required' },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { staff: true, customers: true, jobs: true, invoices: true }
        }
      }
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }

    // Check if branch has associated data
    const hasData = branch._count.staff > 0 || 
                    branch._count.customers > 0 || 
                    branch._count.jobs > 0 || 
                    branch._count.invoices > 0;

    if (hasData) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Cannot delete branch with existing data (${branch._count.staff} staff, ${branch._count.customers} customers, ${branch._count.jobs} jobs, ${branch._count.invoices} invoices). Please reassign data first.` 
        },
        { status: 400 }
      );
    }

    // Remove manager assignment if exists
    if (branch.managerId) {
      await prisma.user.update({
        where: { id: branch.managerId },
        data: { branchId: null }
      });
    }

    // Delete branch
    await prisma.branch.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'DELETE_BRANCH',
        entity: 'Branch',
        entityId: id,
        description: `Deleted branch: ${branch.name}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Branch deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete branch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}