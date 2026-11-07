import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const protectedRoute = /^\/(dashboard|contacts|cases|inbox|settings)(\/|$)/
const authRoutes = new Set(["/login", "/signup"])

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && protectedRoute.test(path)) {
    const destination = request.nextUrl.clone()
    destination.pathname = "/login"
    destination.search = ""
    destination.searchParams.set("next", path)
    const redirect = NextResponse.redirect(destination)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (user && authRoutes.has(path)) {
    const next = request.nextUrl.searchParams.get("next")
    const destination = request.nextUrl.clone()
    destination.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/inbox"
    destination.search = ""
    const redirect = NextResponse.redirect(destination)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
