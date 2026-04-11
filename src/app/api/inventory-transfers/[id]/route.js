// src/app/api/inventory-transfers/[id]/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// GET - Fetch single transfer
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

    const transfer = await prisma.inventoryTransfer.findUnique({
      where: { id },
      include: {
        fromBranch: true,
        toBranch: true,
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
        receivedBy: {
          select: {
            id: true,
            name: true,
          }
        },
        items: {
          include: {
            part: true
          }
        }
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { success: false, message: 'Transfer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: transfer },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch transfer error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update transfer (Approve/Reject/Send/Receive)
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

    if (!['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { action, items, rejectionReason } = body;

    const transfer = await prisma.inventoryTransfer.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            part: true
          }
        },
        fromBranch: true,
        toBranch: true,
        requestedBy: true,
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { success: false, message: 'Transfer not found' },
        { status: 404 }
      );
    }

    // ACTION: APPROVE (by source branch)
    if (action === 'approve') {
      if (transfer.status !== 'REQUESTED') {
        return NextResponse.json(
          { success: false, message: 'This transfer cannot be approved' },
          { status: 400 }
        );
      }

      if (currentUser.role === 'MANAGER' && transfer.fromBranchId !== currentUser.branchId) {
        return NextResponse.json(
          { success: false, message: 'You can only approve transfers from your branch' },
          { status: 403 }
        );
      }

      if (!items || !Array.isArray(items)) {
        return NextResponse.json(
          { success: false, message: 'Items with quantities to send are required' },
          { status: 400 }
        );
      }

      // Check stock availability
      for (const item of items) {
        const transferItem = transfer.items.find(ti => ti.id === item.id);
        if (!transferItem) continue;

        const sentQty = parseInt(item.quantitySent) || 0;
        if (sentQty > 0 && sentQty > transferItem.part.quantity) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Insufficient stock for ${transferItem.part.name}. Available: ${transferItem.part.quantity}` 
            },
            { status: 400 }
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.inventoryTransfer.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById: currentUser.id,
            approvedAt: new Date(),
          },
        });

        for (const item of items) {
          const transferItem = transfer.items.find(ti => ti.id === item.id);
          if (transferItem) {
            await tx.inventoryTransferItem.update({
              where: { id: item.id },
              data: { quantitySent: parseInt(item.quantitySent) || 0 },
            });
          }
        }
      });

      // Notify requesting branch
      const destManagers = await prisma.user.findMany({
        where: {
          branchId: transfer.toBranchId,
          role: 'MANAGER',
          isActive: true,
        },
      });

      if (destManagers.length > 0) {
        await prisma.notification.createMany({
          data: destManagers.map(manager => ({
            userId: manager.id,
            type: 'TRANSFER_APPROVED',
            title: 'Transfer Request Approved',
            message: `Your transfer request ${transfer.transferNumber} has been approved by ${transfer.fromBranch.name}`,
            entityType: 'InventoryTransfer',
            entityId: transfer.id,
          }))
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'APPROVE_TRANSFER',
          entity: 'InventoryTransfer',
          entityId: transfer.id,
          description: `Approved transfer ${transfer.transferNumber}`,
        }
      });

      return NextResponse.json(
        { success: true, message: 'Transfer approved successfully' },
        { status: 200 }
      );
    }

    // ACTION: REJECT (by source branch)
    if (action === 'reject') {
      if (transfer.status !== 'REQUESTED') {
        return NextResponse.json(
          { success: false, message: 'This transfer cannot be rejected' },
          { status: 400 }
        );
      }

      if (currentUser.role === 'MANAGER' && transfer.fromBranchId !== currentUser.branchId) {
        return NextResponse.json(
          { success: false, message: 'You can only reject transfers from your branch' },
          { status: 403 }
        );
      }

      await prisma.inventoryTransfer.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: currentUser.id,
          approvedAt: new Date(),
          rejectionReason: rejectionReason || null,
        },
      });

      // Notify requesting branch
      await prisma.notification.create({
        data: {
          userId: transfer.requestedById,
          type: 'TRANSFER_REJECTED',
          title: 'Transfer Request Rejected',
          message: `Your transfer request ${transfer.transferNumber} has been rejected${rejectionReason ? `: ${rejectionReason}` : ''}`,
          entityType: 'InventoryTransfer',
          entityId: transfer.id,
        }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'REJECT_TRANSFER',
          entity: 'InventoryTransfer',
          entityId: transfer.id,
          description: `Rejected transfer ${transfer.transferNumber}`,
          metadata: { reason: rejectionReason },
        }
      });

      return NextResponse.json(
        { success: true, message: 'Transfer rejected' },
        { status: 200 }
      );
    }

    // ACTION: SEND (by source branch - marks as in transit and reduces stock)
    if (action === 'send') {
      if (transfer.status !== 'APPROVED') {
        return NextResponse.json(
          { success: false, message: 'Only approved transfers can be sent' },
          { status: 400 }
        );
      }

      if (currentUser.role === 'MANAGER' && transfer.fromBranchId !== currentUser.branchId) {
        return NextResponse.json(
          { success: false, message: 'You can only send transfers from your branch' },
          { status: 403 }
        );
      }

      // Reduce stock from source branch
      await prisma.$transaction(async (tx) => {
        for (const item of transfer.items) {
          if (item.quantitySent && item.quantitySent > 0) {
            // Verify stock is still available
            const currentPart = await tx.part.findUnique({
              where: { id: item.partId }
            });

            if (!currentPart || currentPart.quantity < item.quantitySent) {
              throw new Error(`Insufficient stock for ${item.part.name}. Available: ${currentPart?.quantity || 0}, Required: ${item.quantitySent}`);
            }

            await tx.part.update({
              where: { id: item.partId },
              data: {
                quantity: {
                  decrement: item.quantitySent,
                },
              },
            });
          }
        }

        await tx.inventoryTransfer.update({
          where: { id },
          data: {
            status: 'IN_TRANSIT',
            sentAt: new Date(),
          },
        });
      });

      // Notify receiving branch
      const destManagers = await prisma.user.findMany({
        where: {
          branchId: transfer.toBranchId,
          role: 'MANAGER',
          isActive: true,
        },
      });

      if (destManagers.length > 0) {
        await prisma.notification.createMany({
          data: destManagers.map(manager => ({
            userId: manager.id,
            type: 'TRANSFER_SENT',
            title: 'Transfer Items Dispatched',
            message: `Items for transfer ${transfer.transferNumber} have been dispatched from ${transfer.fromBranch.name}`,
            entityType: 'InventoryTransfer',
            entityId: transfer.id,
          }))
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'SEND_TRANSFER',
          entity: 'InventoryTransfer',
          entityId: transfer.id,
          description: `Dispatched items for transfer ${transfer.transferNumber}`,
        }
      });

      return NextResponse.json(
        { success: true, message: 'Items dispatched successfully' },
        { status: 200 }
      );
    }

    // ACTION: RECEIVE (by destination branch - confirms receipt and adds to stock)
    if (action === 'receive') {
      if (transfer.status !== 'IN_TRANSIT') {
        return NextResponse.json(
          { success: false, message: 'Only in-transit transfers can be received' },
          { status: 400 }
        );
      }

      if (currentUser.role === 'MANAGER' && transfer.toBranchId !== currentUser.branchId) {
        return NextResponse.json(
          { success: false, message: 'You can only receive transfers to your branch' },
          { status: 403 }
        );
      }

      if (!items || !Array.isArray(items)) {
        return NextResponse.json(
          { success: false, message: 'Received quantities are required' },
          { status: 400 }
        );
      }

      // Add stock to destination branch
      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const transferItem = transfer.items.find(ti => ti.id === item.id);
          if (!transferItem) continue;

          const receivedQty = parseInt(item.quantityReceived) || 0;

          // Update transfer item
          await tx.inventoryTransferItem.update({
            where: { id: item.id },
            data: { quantityReceived: receivedQty },
          });

          if (receivedQty > 0) {
            // Check if part already exists in destination branch by partNumber
            const existingPart = await tx.part.findFirst({
              where: {
                partNumber: transferItem.part.partNumber,
                branchId: transfer.toBranchId,
              }
            });

            if (existingPart) {
              // Add to existing stock
              await tx.part.update({
                where: { id: existingPart.id },
                data: {
                  quantity: {
                    increment: receivedQty,
                  },
                },
              });
            } else {
              // Create new part entry in destination branch
              // Generate a unique partNumber for the new branch
              const newPartNumber = `${transferItem.part.partNumber}-${transfer.toBranchId.slice(-4).toUpperCase()}`;
              
              // Check if this generated partNumber already exists
              const existingByNumber = await tx.part.findUnique({
                where: { partNumber: newPartNumber }
              });

              if (existingByNumber) {
                // If exists, just increment
                await tx.part.update({
                  where: { id: existingByNumber.id },
                  data: {
                    quantity: {
                      increment: receivedQty,
                    },
                  },
                });
              } else {
                await tx.part.create({
                  data: {
                    partNumber: newPartNumber,
                    name: transferItem.part.name,
                    description: transferItem.part.description,
                    category: transferItem.part.category,
                    brand: transferItem.part.brand,
                    costPrice: transferItem.part.costPrice,
                    sellingPrice: transferItem.part.sellingPrice,
                    quantity: receivedQty,
                    minStockLevel: transferItem.part.minStockLevel,
                    location: null,
                    supplier: transferItem.part.supplier,
                    branchId: transfer.toBranchId,
                    isActive: true,
                  },
                });
              }
            }
          }
        }

        await tx.inventoryTransfer.update({
          where: { id },
          data: {
            status: 'RECEIVED',
            receivedAt: new Date(),
            receivedById: currentUser.id,
          },
        });
      });

      // Notify source branch
      const sourceManagers = await prisma.user.findMany({
        where: {
          branchId: transfer.fromBranchId,
          role: 'MANAGER',
          isActive: true,
        },
      });

      if (sourceManagers.length > 0) {
        await prisma.notification.createMany({
          data: sourceManagers.map(manager => ({
            userId: manager.id,
            type: 'TRANSFER_RECEIVED',
            title: 'Transfer Completed',
            message: `Transfer ${transfer.transferNumber} has been received by ${transfer.toBranch.name}`,
            entityType: 'InventoryTransfer',
            entityId: transfer.id,
          }))
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: 'RECEIVE_TRANSFER',
          entity: 'InventoryTransfer',
          entityId: transfer.id,
          description: `Received transfer ${transfer.transferNumber} at ${transfer.toBranch.name}`,
        }
      });

      return NextResponse.json(
        { success: true, message: 'Transfer received successfully' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action. Use: approve, reject, send, or receive' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update transfer error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}