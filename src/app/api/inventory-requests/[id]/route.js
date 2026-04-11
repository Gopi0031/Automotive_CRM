// src/app/api/inventory-requests/[id]/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// GET - Fetch single request
export async function GET(req, { params }) {
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

    const { id } = await params;

    const request = await prisma.inventoryRequest.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            vehicle: {
              include: {
                customer: true
              }
            }
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          }
        },
        branch: true,
        items: {
          include: {
            part: true
          }
        }
      },
    });

    if (!request) {
      return NextResponse.json(
        { success: false, message: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: request },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch request error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update request (Approve/Reject)
export async function PUT(req, { params }) {
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

    // Only managers and super admins can approve/reject
    if (!['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'Only managers can approve or reject requests' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { action, items, rejectionReason } = body;

    // Get the request
    const request = await prisma.inventoryRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            part: true
          }
        },
        job: true,
        requestedBy: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { success: false, message: 'Request not found' },
        { status: 404 }
      );
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'This request has already been processed' },
        { status: 400 }
      );
    }

    // Manager can only approve requests from their branch
    if (currentUser.role === 'MANAGER' && request.branchId !== currentUser.branchId) {
      return NextResponse.json(
        { success: false, message: 'You can only manage requests from your branch' },
        { status: 403 }
      );
    }

    if (action === 'approve') {
      // Validate items are provided
      if (!items || !Array.isArray(items)) {
        return NextResponse.json(
          { success: false, message: 'Items with approved quantities are required' },
          { status: 400 }
        );
      }

      // Check stock availability and update quantities
      const stockUpdates = [];
      const itemUpdates = [];
      let allFullyApproved = true;
      let anyApproved = false;

      for (const item of items) {
        const requestItem = request.items.find(ri => ri.id === item.id);
        if (!requestItem) continue;

        const approvedQty = parseInt(item.quantityApproved) || 0;
        
        if (approvedQty > 0) {
          anyApproved = true;
          
          // Check stock
          if (approvedQty > requestItem.part.quantity) {
            return NextResponse.json(
              { 
                success: false, 
                message: `Insufficient stock for ${requestItem.part.name}. Available: ${requestItem.part.quantity}` 
              },
              { status: 400 }
            );
          }

          // Prepare stock update
          stockUpdates.push({
            partId: requestItem.partId,
            reduceBy: approvedQty,
          });

          if (approvedQty < requestItem.quantityRequested) {
            allFullyApproved = false;
          }
        } else {
          allFullyApproved = false;
        }

        itemUpdates.push({
          id: requestItem.id,
          quantityApproved: approvedQty,
        });
      }

      if (!anyApproved) {
        return NextResponse.json(
          { success: false, message: 'At least one item must be approved' },
          { status: 400 }
        );
      }

      // Determine status
      const newStatus = allFullyApproved ? 'APPROVED' : 'PARTIALLY_APPROVED';

      // Transaction: Update request, items, and reduce stock
      await prisma.$transaction(async (tx) => {
        // Update request status
        await tx.inventoryRequest.update({
          where: { id },
          data: {
            status: newStatus,
            approvedById: currentUser.id,
            approvedAt: new Date(),
          },
        });

        // Update each item's approved quantity
        for (const itemUpdate of itemUpdates) {
          await tx.inventoryRequestItem.update({
            where: { id: itemUpdate.id },
            data: { quantityApproved: itemUpdate.quantityApproved },
          });
        }

        // Reduce stock for approved items
        for (const stockUpdate of stockUpdates) {
          await tx.part.update({
            where: { id: stockUpdate.partId },
            data: {
              quantity: {
                decrement: stockUpdate.reduceBy,
              },
            },
          });
        }

        // Add parts to job (JobPart records)
        for (const stockUpdate of stockUpdates) {
          const requestItem = request.items.find(ri => ri.partId === stockUpdate.partId);
          if (requestItem) {
            // Check if this part already exists in JobPart
            const existingJobPart = await tx.jobPart.findFirst({
              where: {
                jobId: request.jobId,
                partId: stockUpdate.partId,
              }
            });

            if (existingJobPart) {
              // Update existing
              await tx.jobPart.update({
                where: { id: existingJobPart.id },
                data: {
                  quantity: existingJobPart.quantity + stockUpdate.reduceBy,
                },
              });
            } else {
              // Create new
              await tx.jobPart.create({
                data: {
                  jobId: request.jobId,
                  partId: stockUpdate.partId,
                  quantity: stockUpdate.reduceBy,
                  price: requestItem.part.sellingPrice,
                  notes: `Added via inventory request ${request.requestNumber}`,
                },
              });
            }
          }
        }
      });

      // Notify technician
      await prisma.notification.create({
        data: {
          userId: request.requestedById,
          type: 'INVENTORY_APPROVED',
          title: 'Inventory Request Approved',
          message: `Your request ${request.requestNumber} has been ${newStatus === 'APPROVED' ? 'approved' : 'partially approved'} by ${currentUser.name}`,
          entityType: 'InventoryRequest',
          entityId: request.id,
        }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'APPROVE_INVENTORY_REQUEST',
          entity: 'InventoryRequest',
          entityId: request.id,
          description: `${newStatus === 'APPROVED' ? 'Approved' : 'Partially approved'} inventory request ${request.requestNumber}`,
          metadata: { approvedItems: itemUpdates },
        }
      });

      return NextResponse.json(
        { success: true, message: `Request ${newStatus === 'APPROVED' ? 'approved' : 'partially approved'} successfully` },
        { status: 200 }
      );

    } else if (action === 'reject') {
      // Reject the request
      await prisma.inventoryRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: currentUser.id,
          approvedAt: new Date(),
          rejectionReason: rejectionReason || null,
        },
      });

      // Notify technician
      await prisma.notification.create({
        data: {
          userId: request.requestedById,
          type: 'INVENTORY_REJECTED',
          title: 'Inventory Request Rejected',
          message: `Your request ${request.requestNumber} has been rejected by ${currentUser.name}${rejectionReason ? `: ${rejectionReason}` : ''}`,
          entityType: 'InventoryRequest',
          entityId: request.id,
        }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'REJECT_INVENTORY_REQUEST',
          entity: 'InventoryRequest',
          entityId: request.id,
          description: `Rejected inventory request ${request.requestNumber}`,
          metadata: { reason: rejectionReason },
        }
      });

      return NextResponse.json(
        { success: true, message: 'Request rejected successfully' },
        { status: 200 }
      );

    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Update request error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Cancel request (only requester can cancel pending requests)
export async function DELETE(req, { params }) {
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

    const { id } = await params;

    const request = await prisma.inventoryRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json(
        { success: false, message: 'Request not found' },
        { status: 404 }
      );
    }

    // Only requester can cancel their own pending requests
    if (request.requestedById !== currentUser.id && currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'You can only cancel your own requests' },
        { status: 403 }
      );
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Only pending requests can be cancelled' },
        { status: 400 }
      );
    }

    await prisma.inventoryRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json(
      { success: true, message: 'Request cancelled successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cancel request error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}