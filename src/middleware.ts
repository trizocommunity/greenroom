import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth/session'

// 1. Specify protected and public routes
const protectedRoutes = ['/profile', '/super-admin', '/onboarding']
const publicRoutes = ['/login', '/register', '/forget-password', '/reset-password', '/', '/about', '/features', '/services', '/contact']
const festivalRoutes = ['/about', '/news', '/gallery', '/sessions', '/results']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const host = req.headers.get('host') || ''
  
  // Extract subdomain for multi-tenant routing
  // In production: mambamehfil.greenrooom.com -> subdomain = "mambamehfil"
  // In local dev: use ?festival=slug query param as fallback
  const hostParts = host.split('.')
  const isSubdomain = hostParts.length > 2 || (hostParts.length === 2 && !hostParts[0].includes('localhost'))
  const subdomain = isSubdomain ? hostParts[0] : null
  
  // Local dev fallback: ?festival=slug
  const festivalSlug = subdomain || req.nextUrl.searchParams.get('festival')
  
  // Check if this is a festival subdomain/request
  const isFestivalRequest = festivalSlug && 
    festivalSlug !== 'www' && 
    festivalSlug !== 'greenrooom' && 
    festivalSlug !== 'localhost' &&
    festivalSlug !== 'api'
  
  // Handle festival subdomain routing
  if (isFestivalRequest && !path.startsWith('/api') && !path.startsWith('/_next') && !path.startsWith('/festival')) {
    // Rewrite to internal festival route
    const url = req.nextUrl.clone()
    url.pathname = `/festival/${festivalSlug}${path === '/' ? '' : path}`
    // Remove festival query param after rewrite (for local dev)
    url.searchParams.delete('festival')
    return NextResponse.rewrite(url)
  }
  
  // 2. Check if the current route is protected or public
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
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)'],
}
