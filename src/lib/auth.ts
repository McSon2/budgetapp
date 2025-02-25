import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { getSession as getNextAuthSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

// Client-side session getter
export async function getSession(): Promise<Session | null> {
  return await getNextAuthSession();
}

// Server-side session getter
export async function getServerSideSession() {
  return await getServerSession(authOptions);
}

// Get current user (works on both client and server)
export async function getCurrentUser() {
  try {
    // Try server-side first
    if (typeof window === 'undefined') {
      const session = await getServerSideSession();
      return session?.user;
    }

    // Fall back to client-side
    const session = await getSession();
    return session?.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Require authentication (server-side only)
export async function requireAuth() {
  const session = await getServerSideSession();

  if (!session) {
    redirect('/login');
  }

  return session.user;
}
