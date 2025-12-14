import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { loginSchema } from '@/lib/validations/auth'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || user.isActive === false) {
      return NextResponse.json(
        { error: 'Invalid credentials or inactive account' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.passwordHash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isOnboarded = !!(user.fullName && user.displayName && user.age !== null)
    await createSession(user.id, user.globalRole, isOnboarded)

    return NextResponse.json({ success: true, role: user.globalRole })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
