// src/app/api/auth/logout/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../../lib/auth.js';
import { createActivity } from '../../../../lib/activityService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;

    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded && decoded.id) {
        // Log logout activity
        try {
          await createActivity({
            userId: decoded.id,
            action: 'USER_LOGOUT',
            entity: 'User',
            entityId: decoded.id,
            description: `logged out`,
            metadata: { 
              logoutTime: new Date().toISOString()
            }
          });
        } catch (activityError) {
          console.error('Failed to log logout activity:', activityError);
        }
      }
    }

    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear the auth cookie
    response.cookies.set('authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}