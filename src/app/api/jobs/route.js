// src/app/api/jobs/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Generate unique job number using database transaction
const generateUniqueJobNumber = async () => {
  return await prisma.$transaction(async (tx) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `JOB-${dateStr}-`;
    
    // Find the last job number for today
    const lastJob = await tx.job.findFirst({
      where: {
        jobNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        jobNumber: 'desc'
      },
      select: {
        jobNumber: true
      }
    });
    
    let sequence = 1;
    
    if (lastJob && lastJob.jobNumber) {
      // Extract sequence number: JOB-20240115-0001 -> 0001
      const match = lastJob.jobNumber.match(new RegExp(`${prefix}(\\d+)`));
      if (match && match[1]) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }
    
    // Generate job number with sequence
    const jobNumber = `${prefix}${String(sequence).padStart(4, '0')}`;
    
    // Double-check uniqueness within transaction
    const existing = await tx.job.findUnique({
      where: { jobNumber }
    });
    
    if (existing) {
      // If exists, add milliseconds
      const ms = Date.now().toString().slice(-4);
      return `${prefix}${String(sequence).padStart(4, '0')}-${ms}`;
    }
    
    return jobNumber;
  });
};

// GET - Fetch all jobs
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
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const assignedToId = searchParams.get('assignedToId');
    const vehicleId = searchParams.get('vehicleId');

    // Build where clause based on role
    let whereClause = {};

    if (currentUser.role === 'SUPER_ADMIN') {
      // Super Admin can see all jobs
    } else if (currentUser.role === 'EMPLOYEE') {
      // Technicians only see their assigned jobs
      whereClause.assignedToId = currentUser.id;
    } else if (currentUser.branchId) {
      // Manager and others see branch jobs
      whereClause.branchId = currentUser.branchId;
    } else {
      return NextResponse.json(
        { success: false, message: 'No branch assigned' },
        { status: 403 }
      );
    }

    // Apply filters
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (assignedToId) {
      whereClause.assignedToId = assignedToId;
    }
    if (vehicleId) {
      whereClause.vehicleId = vehicleId;
    }
    if (search) {
      whereClause.OR = [
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
        { vehicle: { customer: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        vehicle: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              }
            }
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        services: {
          include: {
            service: true
          }
        },
        parts: {
          include: {
            part: true
          }
        },
        timeline: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            subtotal: true,
            tax: true,
            discount: true,
            amountPaid: true,
          }
        },
        _count: {
          select: {
            services: true,
            parts: true,
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json(
      { success: true, data: jobs },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch jobs error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new job
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
        { success: false, message: 'You do not have permission to create jobs' },
        { status: 403 }
      );
    }

    const { 
      vehicleId, 
      description, 
      assignedToId, 
      priority, 
      estimatedCost,
      scheduledDate,
      customerNotes,
      branchId
    } = await req.json();

    // Validation
    if (!vehicleId) {
      return NextResponse.json(
        { success: false, message: 'Vehicle is required' },
        { status: 400 }
      );
    }

    // Get vehicle to verify it exists and get customer info
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { customer: true }
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Determine branch ID
    const jobBranchId = currentUser.role === 'SUPER_ADMIN' && branchId 
      ? branchId 
      : currentUser.branchId;

    if (!jobBranchId) {
      return NextResponse.json(
        { success: false, message: 'Branch is required. Please assign a branch.' },
        { status: 400 }
      );
    }

    // Generate unique job number
    let jobNumber;
    let job;
    let retries = 5;
    
    while (retries > 0) {
      try {
        jobNumber = await generateUniqueJobNumber();
        
        job = await prisma.job.create({
          data: {
            jobNumber,
            vehicleId,
            branchId: jobBranchId,
            assignedToId: assignedToId || null,
            description: description || '',
            priority: priority || 'MEDIUM',
            estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
            customerNotes: customerNotes || null,
            status: 'PENDING',
          },
          include: {
            vehicle: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  }
                }
              }
            },
            branch: {
              select: {
                id: true,
                name: true,
              }
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
              }
            },
          }
        });
        
        // Success - break out of retry loop
        break;
        
      } catch (error) {
        if (error.code === 'P2002' && retries > 1) {
          console.log(`Job number collision (${jobNumber}), retrying... ${retries - 1} attempts left`);
          retries--;
          // Small random delay to prevent immediate collision
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
          continue;
        }
        throw error;
      }
    }

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Failed to create job after multiple attempts. Please try again.' },
        { status: 500 }
      );
    }

    // Create initial timeline entry
    await prisma.jobTimeline.create({
      data: {
        jobId: job.id,
        status: 'PENDING',
        description: `Job created for ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'CREATE_JOB',
        entity: 'Job',
        entityId: job.id,
        description: `Created job ${job.jobNumber} for vehicle ${vehicle.licensePlate}`,
      }
    });

    // Create notification for assigned technician
    if (assignedToId) {
      try {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            title: 'New Job Assigned',
            message: `You have been assigned to job ${job.jobNumber} for ${vehicle.make} ${vehicle.model}`,
            type: 'JOB_ASSIGNED',
            entityType: 'Job',
            entityId: job.id,
          }
        });
      } catch (notifError) {
        console.log('Notification creation skipped:', notifError.message);
      }
    }

    return NextResponse.json(
      { success: true, message: 'Job created successfully', data: job },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create job error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Failed to generate unique job number. Please try again.' },
        { status: 409 }
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

// PUT - Update job
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

    const { 
      id,
      status, 
      assignedToId, 
      description, 
      actualCost, 
      priority,
      technicianNotes,
      laborHours,
      estimatedCost,
      scheduledDate,
      customerNotes,
    } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get existing job
    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: {
        vehicle: true,
        assignedTo: true,
      }
    });

    if (!existingJob) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canUpdate = 
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'MANAGER' ||
      (currentUser.role === 'EMPLOYEE' && existingJob.assignedToId === currentUser.id);

    if (!canUpdate) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update this job' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData = {};
    
    if (status !== undefined) updateData.status = status;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (description !== undefined) updateData.description = description;
    if (actualCost !== undefined) updateData.actualCost = actualCost ? parseFloat(actualCost) : null;
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost ? parseFloat(estimatedCost) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (technicianNotes !== undefined) updateData.technicianNotes = technicianNotes;
    if (laborHours !== undefined) updateData.laborHours = laborHours ? parseFloat(laborHours) : null;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (customerNotes !== undefined) updateData.customerNotes = customerNotes;
    
    // Set completed date if status is COMPLETED
    if (status === 'COMPLETED' && existingJob.status !== 'COMPLETED') {
      updateData.completedDate = new Date();
    }
    
    // Clear completed date if moving back from completed
    if (status && status !== 'COMPLETED' && status !== 'DELIVERED' && existingJob.status === 'COMPLETED') {
      updateData.completedDate = null;
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              }
            }
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          }
        },
        services: {
          include: {
            service: true
          }
        },
        parts: {
          include: {
            part: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
          }
        },
      }
    });

    // Create timeline entry if status changed
    if (status && status !== existingJob.status) {
      await prisma.jobTimeline.create({
        data: {
          jobId: job.id,
          status: status,
          description: `Status changed from ${existingJob.status} to ${status} by ${currentUser.name}`,
        }
      });

      // Create notification for status change
      const notifyUserId = job.assignedToId || existingJob.assignedToId;
      if (notifyUserId && notifyUserId !== currentUser.id) {
        try {
          await prisma.notification.create({
            data: {
              userId: notifyUserId,
              title: 'Job Status Updated',
              message: `Job ${job.jobNumber} status changed to ${status}`,
              type: 'JOB_STATUS_CHANGED',
              entityType: 'Job',
              entityId: job.id,
            }
          });
        } catch (notifError) {
          console.log('Notification creation skipped:', notifError.message);
        }
      }
    }

    // Notify new assignee if technician changed
    if (assignedToId && assignedToId !== existingJob.assignedToId) {
      await prisma.jobTimeline.create({
        data: {
          jobId: job.id,
          status: job.status,
          description: `Job assigned to ${job.assignedTo?.name || 'technician'} by ${currentUser.name}`,
        }
      });

      try {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            title: 'New Job Assigned',
            message: `You have been assigned to job ${job.jobNumber}`,
            type: 'JOB_ASSIGNED',
            entityType: 'Job',
            entityId: job.id,
          }
        });
      } catch (notifError) {
        console.log('Notification creation skipped:', notifError.message);
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'UPDATE_JOB',
        entity: 'Job',
        entityId: job.id,
        description: `Updated job ${job.jobNumber}`,
        metadata: { changes: Object.keys(updateData) }
      }
    });

    return NextResponse.json(
      { success: true, message: 'Job updated successfully', data: job },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update job error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete job
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
        { success: false, message: 'You do not have permission to delete jobs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Check if job exists and has invoice
    const job = await prisma.job.findUnique({
      where: { id },
      include: { 
        invoice: true,
        vehicle: true,
      }
    });

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.invoice) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete job with associated invoice. Cancel the invoice first.' },
        { status: 400 }
      );
    }

    // Use transaction to delete all related records
    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.jobTimeline.deleteMany({ where: { jobId: id } });
      await tx.jobService.deleteMany({ where: { jobId: id } });
      await tx.jobPart.deleteMany({ where: { jobId: id } });
      
      // Delete the job
      await tx.job.delete({ where: { id } });
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'DELETE_JOB',
        entity: 'Job',
        entityId: id,
        description: `Deleted job ${job.jobNumber} for vehicle ${job.vehicle?.licensePlate}`,
      }
    });

    return NextResponse.json(
      { success: true, message: 'Job deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}