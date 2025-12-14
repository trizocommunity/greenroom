import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { z } from 'zod'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    })

    if (!resetTokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    await prisma.user.update({
      where: { id: resetTokenRecord.userId },
      data: { passwordHash: hashedPassword },
    })

    await prisma.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { usedAt: new Date() },
    })

    return NextResponse.json({ success: true })
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
