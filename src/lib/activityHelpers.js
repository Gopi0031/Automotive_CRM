// src/lib/activityHelpers.js

import { createActivity } from './activityService';

// Job Activities
export async function logJobCreated(userId, job) {
  return createActivity({
    userId,
    action: 'JOB_CREATED',
    entity: 'Job',
    entityId: job.id,
    description: `created job #${job.jobNumber} for ${job.vehicle?.customer?.name}`,
    metadata: { jobNumber: job.jobNumber, vehicleId: job.vehicleId }
  });
}

export async function logJobAssigned(userId, job, assignedTo) {
  return createActivity({
    userId,
    action: 'JOB_ASSIGNED',
    entity: 'Job',
    entityId: job.id,
    description: `assigned job #${job.jobNumber} to ${assignedTo.name}`,
    metadata: { jobNumber: job.jobNumber, assignedToId: assignedTo.id }
  });
}

export async function logJobStatusChanged(userId, job, oldStatus, newStatus) {
  return createActivity({
    userId,
    action: 'JOB_STATUS_CHANGED',
    entity: 'Job',
    entityId: job.id,
    description: `changed job #${job.jobNumber} status from ${oldStatus} to ${newStatus}`,
    metadata: { jobNumber: job.jobNumber, oldStatus, newStatus }
  });
}

export async function logJobCompleted(userId, job) {
  return createActivity({
    userId,
    action: 'JOB_COMPLETED',
    entity: 'Job',
    entityId: job.id,
    description: `completed job #${job.jobNumber}`,
    metadata: { jobNumber: job.jobNumber }
  });
}

// Payment Activities
export async function logPaymentReceived(userId, payment, invoice) {
  return createActivity({
    userId,
    action: 'PAYMENT_RECEIVED',
    entity: 'Payment',
    entityId: payment.id,
    description: `received payment of ₹${payment.amount.toLocaleString()} for invoice #${invoice.invoiceNumber}`,
    metadata: { 
      amount: payment.amount, 
      invoiceId: invoice.id, 
      method: payment.method 
    }
  });
}

// Invoice Activities
export async function logInvoiceCreated(userId, invoice) {
  return createActivity({
    userId,
    action: 'INVOICE_CREATED',
    entity: 'Invoice',
    entityId: invoice.id,
    description: `created invoice #${invoice.invoiceNumber} for ₹${invoice.total.toLocaleString()}`,
    metadata: { 
      invoiceNumber: invoice.invoiceNumber, 
      total: invoice.total 
    }
  });
}

export async function logInvoicePaid(userId, invoice) {
  return createActivity({
    userId,
    action: 'INVOICE_PAID',
    entity: 'Invoice',
    entityId: invoice.id,
    description: `marked invoice #${invoice.invoiceNumber} as paid`,
    metadata: { invoiceNumber: invoice.invoiceNumber }
  });
}

// Customer Activities
export async function logCustomerCreated(userId, customer) {
  return createActivity({
    userId,
    action: 'CUSTOMER_CREATED',
    entity: 'Customer',
    entityId: customer.id,
    description: `added new customer ${customer.name}`,
    metadata: { customerName: customer.name, phone: customer.phone }
  });
}

// Vehicle Activities
export async function logVehicleAdded(userId, vehicle, customer) {
  return createActivity({
    userId,
    action: 'VEHICLE_ADDED',
    entity: 'Vehicle',
    entityId: vehicle.id,
    description: `added vehicle ${vehicle.licensePlate} (${vehicle.make} ${vehicle.model}) for ${customer.name}`,
    metadata: { 
      licensePlate: vehicle.licensePlate, 
      make: vehicle.make, 
      model: vehicle.model 
    }
  });
}

// Part Activities
export async function logPartLowStock(userId, part) {
  return createActivity({
    userId,
    action: 'PART_LOW_STOCK',
    entity: 'Part',
    entityId: part.id,
    description: `Low stock alert: ${part.name} (${part.quantity} remaining)`,
    metadata: { partName: part.name, quantity: part.quantity }
  });
}