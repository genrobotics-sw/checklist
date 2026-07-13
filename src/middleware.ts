import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Auth routes (login, forgot-password)
  if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password')) {
    if (user) {
      // Check role to redirect
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (error || !profile) {
        // Sign out if profile is missing to break loop
        await supabase.auth.signOut()
        return supabaseResponse
      }

      if (profile.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/employee/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Protected routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/employee')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Middleware profile fetch error:', error.message)
      // If we can't fetch the profile, redirect to login to clear invalid session
      // or at least stop the infinite loop.
      if (!profile) {
        // To prevent infinite loop if they are already on /login, we don't redirect to /login here since we are in protected routes block.
        // Let's just log them out
        return NextResponse.redirect(new URL('/login?error=profile_missing', request.url))
      }
    }

    const role = profile?.role || 'EMPLOYEE' // Default to EMPLOYEE if missing just in case

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url))
    }

    if (pathname.startsWith('/employee') && role !== 'EMPLOYEE' && role !== 'ADMIN') {
      // Actually, if role is ADMIN, they shouldn't be in /employee. But let's follow the strict check
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
