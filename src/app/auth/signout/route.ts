import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Keep in sync with the constant in proxy.ts
const ROLE_COOKIE = 'x-user-role'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')

  // Build the correct origin based on the actual request headers
  // This prevents redirecting to localhost when using port forwarding
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http')
  const origin = `${protocol}://${host}`

  const response = NextResponse.redirect(new URL('/login', origin), { status: 302 })

  // Clear the cached role cookie so the next login isn't routed by a stale role.
  response.cookies.set(ROLE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  })

  return response
}
