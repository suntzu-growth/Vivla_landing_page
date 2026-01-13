import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const authSession = request.cookies.get('auth_session')
    const isLoginPage = request.nextUrl.pathname === '/login'

    // If user is not authenticated and not on login page, redirect to login
    if (!authSession && !isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is authenticated and on login page, redirect to home
    if (authSession && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images etc if any, though usually handled by _next exclusion or specific patterns)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
