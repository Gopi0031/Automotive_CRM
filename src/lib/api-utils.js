// lib/api-utils.js
import { getCurrentUser } from './auth';
import { ROLE_PERMISSIONS } from './auth';

export async function requireAuth(req) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }
  return user;
}

export function requirePermission(user, permission) {
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  if (!permissions.includes(permission)) {
    return { error: 'Forbidden', status: 403 };
  }
  return null;
}

export function sendResponse(res, status, data) {
  return res.status(status).json(data);
}

export function sendError(res, status, message, error = null) {
  return res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && { error: error.message }),
  });
}

export function sendSuccess(res, data, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
