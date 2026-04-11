// src/app/api/jobs/[id]/route.js
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../../lib/auth.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// GET - Fetch single job
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

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            customer: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
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
          orderBy: { createdAt: 'desc' }
        },
        invoice: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: job },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch job error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update single job
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

    const { id } = await params;
    const body = await req.json();
    
    const { 
      status, 
      assignedToId, 
      description, 
      actualCost, 
      priority,
      technicianNotes,
      laborHours,
      scheduledDate,
    } = body;

    // Get existing job
    const existingJob = await prisma.job.findUnique({
      where: { id },
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
    if (actualCost !== undefined) updateData.actualCost = parseFloat(actualCost) || null;
    if (priority !== undefined) updateData.priority = priority;
    if (technicianNotes !== undefined) updateData.technicianNotes = technicianNotes;
    if (laborHours !== undefined) updateData.laborHours = parseFloat(laborHours) || null;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    
    // Set completed date if status is COMPLETED
    if (status === 'COMPLETED' && existingJob.status !== 'COMPLETED') {
      updateData.completedDate = new Date();
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
      }
    });

    // Create timeline entry if status changed
    if (status && status !== existingJob.status) {
      await prisma.jobTimeline.create({
        data: {
          jobId: job.id,
          status: status,
          description: `Status changed to ${status} by ${currentUser.name}`,
        }
      });
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

// DELETE - Delete single job
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

    if (!currentUser || !['SUPER_ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to delete jobs' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if job exists and has invoice
    const job = await prisma.job.findUnique({
      where: { id },
      include: { invoice: true }
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

    // Delete related records first (cascade should handle this, but being explicit)
    await prisma.jobTimeline.deleteMany({ where: { jobId: id } });
    await prisma.jobService.deleteMany({ where: { jobId: id } });
    await prisma.jobPart.deleteMany({ where: { jobId: id } });

    // Delete job
    await prisma.job.delete({ where: { id } });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'DELETE_JOB',
        entity: 'Job',
        entityId: id,
        description: `Deleted job ${job.jobNumber}`,
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