import { NextResponse, NextRequest } from 'next/server'
import { deleteSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  await deleteSession()
  return NextResponse.json({ success: true })
}
