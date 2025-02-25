import { getServerSideSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSideSession();
  return NextResponse.json(session || { user: null });
}
