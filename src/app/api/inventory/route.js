// src/app/api/inventory/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// GET - Fetch all parts/inventory
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
    const lowStock = searchParams.get('lowStock');

    let whereClause = { isActive: true };

    // Role-based filtering
    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin sees all parts
    } else if (currentUser.branchId) {
      whereClause.branchId = currentUser.branchId;
    } else {
      return NextResponse.json(
        { success: false, message: 'No branch assigned' },
        { status: 403 }
      );
    }

    // Apply search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Apply category filter
    if (category) {
      whereClause.category = category;
    }

    // ✅ FIX: Use prisma.part instead of prisma.inventoryItem
    let parts = await prisma.part.findMany({
      where: whereClause,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            jobs: true
          }
        }
      },
      orderBy: [
        { quantity: 'asc' },
        { name: 'asc' }
      ],
    });

    // Filter low stock if requested
    if (lowStock === 'true') {
      parts = parts.filter(p => p.quantity <= p.minStockLevel);
    }

    return NextResponse.json(
      { success: true, data: parts },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new part
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

    // Check permissions
    if (!['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to manage inventory' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      partNumber, 
      name, 
      description, 
      category, 
      brand,
      costPrice, 
      sellingPrice, 
      quantity, 
      minStockLevel, 
      location,
      supplier,
      branchId
    } = body;

    // Validation
    if (!partNumber || !name || !category) {
      return NextResponse.json(
        { success: false, message: 'Part number, name, and category are required' },
        { status: 400 }
      );
    }

    if (costPrice === undefined || sellingPrice === undefined || quantity === undefined) {
      return NextResponse.json(
        { success: false, message: 'Cost price, selling price, and quantity are required' },
        { status: 400 }
      );
    }

    // Check if part number already exists
    const existingPart = await prisma.part.findUnique({
      where: { partNumber }
    });

    if (existingPart) {
      return NextResponse.json(
        { success: false, message: 'Part number already exists' },
        { status: 400 }
      );
    }

    // Determine branch ID
    const partBranchId = currentUser.role === 'SUPER_ADMIN' && branchId 
      ? branchId 
      : currentUser.branchId;

    if (!partBranchId) {
      return NextResponse.json(
        { success: false, message: 'Branch is required' },
        { status: 400 }
      );
    }

    // ✅ FIX: Use prisma.part.create
    const part = await prisma.part.create({
      data: {
        partNumber: partNumber.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        category: category.trim(),
        brand: brand?.trim() || null,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        quantity: Number(quantity),
        minStockLevel: Number(minStockLevel) || 5,
        location: location?.trim() || null,
        supplier: supplier?.trim() || null,
        branchId: partBranchId,
        isActive: true,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_PART',
        entity: 'Part',
        entityId: part.id,
        description: `Added part: ${part.name} (${part.partNumber})`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Part added successfully', data: part },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create part error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Part number already exists' },
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

// PUT - Update part
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
        { success: false, message: 'You do not have permission to update inventory' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      id,
      partNumber, 
      name, 
      description, 
      category, 
      brand,
      costPrice, 
      sellingPrice, 
      quantity, 
      minStockLevel, 
      location,
      supplier,
      isActive,
      adjustmentType, // 'add' or 'subtract' for stock adjustment
      adjustmentQty
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Part ID is required' },
        { status: 400 }
      );
    }

    const existingPart = await prisma.part.findUnique({
      where: { id }
    });

    if (!existingPart) {
      return NextResponse.json(
        { success: false, message: 'Part not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData = {};
    
    if (partNumber !== undefined) updateData.partNumber = partNumber.trim().toUpperCase();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category.trim();
    if (brand !== undefined) updateData.brand = brand?.trim() || null;
    if (costPrice !== undefined) updateData.costPrice = Number(costPrice);
    if (sellingPrice !== undefined) updateData.sellingPrice = Number(sellingPrice);
    if (minStockLevel !== undefined) updateData.minStockLevel = Number(minStockLevel);
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (supplier !== undefined) updateData.supplier = supplier?.trim() || null;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Handle quantity adjustment or direct update
    if (adjustmentType && adjustmentQty) {
      const qty = Number(adjustmentQty);
      if (adjustmentType === 'add') {
        updateData.quantity = existingPart.quantity + qty;
      } else if (adjustmentType === 'subtract') {
        const newQty = existingPart.quantity - qty;
        if (newQty < 0) {
          return NextResponse.json(
            { success: false, message: 'Insufficient stock. Cannot reduce below 0.' },
            { status: 400 }
          );
        }
        updateData.quantity = newQty;
      }
    } else if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    }

    const part = await prisma.part.update({
      where: { id },
      data: updateData,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_PART',
        entity: 'Part',
        entityId: part.id,
        description: adjustmentType 
          ? `Stock ${adjustmentType === 'add' ? 'added' : 'reduced'} for ${part.name}: ${adjustmentQty} units`
          : `Updated part: ${part.name}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Part updated successfully', data: part },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update part error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Part number already exists' },
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

// DELETE - Delete/deactivate part
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
        { success: false, message: 'You do not have permission to delete inventory items' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Part ID is required' },
        { status: 400 }
      );
    }

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });

    if (!part) {
      return NextResponse.json(
        { success: false, message: 'Part not found' },
        { status: 404 }
      );
    }

    // If part has been used in jobs, soft delete
    if (part._count.jobs > 0) {
      await prisma.part.update({
        where: { id },
        data: { isActive: false }
      });

      return NextResponse.json(
        { success: true, message: 'Part deactivated successfully (has job history)' },
        { status: 200 }
      );
    }

    // Otherwise, hard delete
    await prisma.part.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'DELETE_PART',
        entity: 'Part',
        entityId: id,
        description: `Deleted part: ${part.name}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Part deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete part error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}