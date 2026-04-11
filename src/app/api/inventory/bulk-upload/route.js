// src/app/api/inventory/bulk-upload/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

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

    if (!currentUser || !['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to manage inventory' },
        { status: 403 }
      );
    }

    const { parts, branchId } = await req.json();

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No parts provided' },
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

    let imported = 0;
    let failed = 0;
    const errors = [];

    // Process each part
    for (const part of parts) {
      try {
        // Check if part number already exists
        const existing = await prisma.part.findUnique({
          where: { partNumber: part.partNumber }
        });

        if (existing) {
          failed++;
          errors.push({
            partNumber: part.partNumber,
            error: 'Part number already exists'
          });
          continue;
        }

        // Create the part
        await prisma.part.create({
          data: {
            partNumber: part.partNumber.trim().toUpperCase(),
            name: part.name.trim(),
            description: part.description?.trim() || null,
            category: part.category.trim(),
            brand: part.brand?.trim() || null,
            costPrice: Number(part.costPrice),
            sellingPrice: Number(part.sellingPrice),
            quantity: Number(part.quantity),
            minStockLevel: Number(part.minStockLevel) || 5,
            location: part.location?.trim() || null,
            supplier: part.supplier?.trim() || null,
            branchId: partBranchId,
            isActive: true,
          }
        });

        imported++;
      } catch (error) {
        failed++;
        errors.push({
          partNumber: part.partNumber,
          error: error.message
        });
      }
    }

    // Log bulk upload activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'BULK_UPLOAD_PARTS',
        entity: 'Part',
        description: `Bulk uploaded ${imported} parts. ${failed} failed.`,
        metadata: { imported, failed, errors }
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully imported ${imported} parts. ${failed} failed.`,
        imported,
        failed,
        errors: errors.length > 0 ? errors : undefined
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}