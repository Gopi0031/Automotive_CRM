import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateInvoiceNumber(branchId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${branchId.slice(-4)}-${year}${month}-${random}`;
}

export function generateJobNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `JOB-${year}${month}${day}-${random}`;
}

export function calculateInvoiceTotal(services = [], parts = [], tax = 0, discount = 0) {
  const servicesTotal = services.reduce((sum, item) => {
    return sum + (item.price * item.quantity - item.discount);
  }, 0);

  const partsTotal = parts.reduce((sum, item) => {
    return sum + (item.price * item.quantity - item.discount);
  }, 0);

  const subtotal = servicesTotal + partsTotal;
  const taxAmount = (subtotal * tax) / 100;
  const total = subtotal + taxAmount - discount;

  return {
    subtotal,
    tax: taxAmount,
    discount,
    total,
  };
}