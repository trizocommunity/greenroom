import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth/session'

// 1. Specify protected and public routes
const protectedRoutes = ['/profile', '/super-admin', '/onboarding']
const publicRoutes = ['/login', '/register', '/forget-password', '/reset-password', '/', '/about', '/features', '/services', '/contact']

export default async function middleware(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isPublicRoute = publicRoutes.includes(path) || publicRoutes.some(route => path.startsWith(route) && route !== '/')

  // 3. Decrypt the session from the cookie
  const cookie = req.cookies.get('session')?.value
  const session = cookie ? await decrypt(cookie).catch(() => null) : null

  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
  
  // 5. Onboarding Check
  const isOnboardingRoute = path === '/onboarding'
  if (session?.userId) {
      if (!session.isOnboarded && !isOnboardingRoute) {
          return NextResponse.redirect(new URL('/onboarding', req.nextUrl))
      }
      if (session.isOnboarded && isOnboardingRoute) {
           return NextResponse.redirect(new URL('/profile', req.nextUrl))
      }
  }

  // 6. Strict Access: Redirect to /profile if the user is authenticated and tries to access ANY public route
  if (session?.userId && isPublicRoute && path !== '/profile' && !isOnboardingRoute) {
     return NextResponse.redirect(new URL('/profile', req.nextUrl))
  }
  
  // 7. Role-Based Access Control
  if (path.startsWith('/super-admin') && session?.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/profile', req.nextUrl))
  }

  return NextResponse.next()
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
