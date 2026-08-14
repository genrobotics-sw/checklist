import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Cookie name used to cache the user's role, avoiding a DB query on every request.
const ROLE_COOKIE = 'x-user-role'
// How long the role cookie is valid (5 minutes). After expiry the middleware
// will re-fetch the role from the DB and refresh the cookie.
const ROLE_CACHE_TTL_SECONDS = 300

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() is a lightweight JWT verification — no network call when the
  // session token is fresh and valid (Supabase SSR checks the expiry locally).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Auth routes (login / forgot-password) ──────────────────────────────────
  if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password')) {
    if (user) {
      const role = await getUserRole(supabase, user.id, request, supabaseResponse)
      if (!role) {
        await supabase.auth.signOut()
        return supabaseResponse
      }
      // REVIEWER lands on submissions; ADMIN/MASTER_ADMIN on dashboard;
      // OPERATOR on their dashboard
      const dest =
        role === 'ADMIN' || role === 'MASTER_ADMIN' ? '/admin/dashboard' :
        role === 'REVIEWER' ? '/admin/submissions' :
        '/employee/dashboard'
      const redirectResponse = NextResponse.redirect(new URL(dest, request.url))
      // Forward the role cookie to the redirect response
      copyRoleCookie(supabaseResponse, redirectResponse, role)
      return redirectResponse
    }
    return supabaseResponse
  }

  // ── Protected routes ───────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/employee')) {
    if (!user) {
      // No valid session — clear stale role cookie and redirect to login.
      const loginRedirect = NextResponse.redirect(new URL('/login', request.url))
      loginRedirect.cookies.set(ROLE_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
      return loginRedirect
    }

    const role = await getUserRole(supabase, user.id, request, supabaseResponse)

    if (!role) {
      return NextResponse.redirect(new URL('/login?error=profile_missing', request.url))
    }

    // ── REVIEWER: can only access /admin/submissions and /admin/profile ───────
    if (role === 'REVIEWER') {
      if (
        pathname.startsWith('/admin/submissions') ||
        pathname.startsWith('/admin/profile')
      ) {
        return supabaseResponse // ✅ allowed
      }
      // Redirect any other /admin/* or /employee/* path to submissions
      return NextResponse.redirect(new URL('/admin/submissions', request.url))
    }

    // ── ADMIN / MASTER_ADMIN: full /admin access, no /employee access ─────────
    // MASTER_ADMIN has everything ADMIN has, plus the ability to manage
    // ADMIN accounts (which ADMIN itself can't do) — see /api/employees.
    if (pathname.startsWith('/admin') && role !== 'ADMIN' && role !== 'MASTER_ADMIN') {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url))
    }

    if (pathname.startsWith('/employee') && (role === 'ADMIN' || role === 'MASTER_ADMIN')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return supabaseResponse
}

// ---------------------------------------------------------------------------
// Role helper — reads from the cached cookie first; only queries the DB when
// the cookie is absent or stale, then writes a fresh cookie.
// ---------------------------------------------------------------------------
async function getUserRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  request: NextRequest,
  supabaseResponse: NextResponse
): Promise<string | null> {
  // 1. Try the cached cookie first (fast path — no DB query).
  const cached = request.cookies.get(ROLE_COOKIE)?.value
  if (cached) return cached

  // 2. Cache miss — query the DB once and cache the result.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !profile) return null

  const role: string = profile.role

  // 3. Write the role into a short-lived, HttpOnly cookie.
  supabaseResponse.cookies.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ROLE_CACHE_TTL_SECONDS,
  })

  return role
}

// Copy the role cookie from one response to another (used during redirects).
function copyRoleCookie(
  source: NextResponse,
  dest: NextResponse,
  role: string
) {
  dest.cookies.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ROLE_CACHE_TTL_SECONDS,
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
