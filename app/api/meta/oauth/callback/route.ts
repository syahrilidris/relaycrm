import { NextResponse, type NextRequest } from "next/server"
import { getMetaConfig } from "@/lib/meta/config"
import { connectPagesFromUserToken } from "@/lib/meta/connections"
import { graph } from "@/lib/meta/graph"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function back(origin: string, params: Record<string, string>) {
  const url = new URL("/settings", origin)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.hash = "integrations"
  const response = NextResponse.redirect(url)
  response.cookies.set("bintang_meta_state", "", { maxAge: 0, path: "/api/meta/oauth" })
  return response
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const params = request.nextUrl.searchParams
  if (params.get("error")) return back(origin, { meta: "cancelled" })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", origin))

  const [expectedState, stateUser] = (request.cookies.get("bintang_meta_state")?.value ?? "").split(".")
  const code = params.get("code")
  if (!code || !expectedState || params.get("state") !== expectedState || stateUser !== user.id) return back(origin, { meta: "error", reason: "The sign-in session expired. Please try connecting again." })

  const { appId, appSecret } = getMetaConfig()
  try {
    const short = await graph<{ access_token: string }>("oauth/access_token", { query: { client_id: appId, client_secret: appSecret, redirect_uri: `${origin}/api/meta/oauth/callback`, code } })
    // Page tokens derived from a long-lived user token do not expire.
    const long = await graph<{ access_token: string }>("oauth/access_token", { query: { grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: short.access_token } })
    const result = await connectPagesFromUserToken(user.id, long.access_token)
    if (result.found === 0) return back(origin, { meta: "error", reason: "No Facebook Pages were shared. Reconnect and select the Pages you want in Bintang CRM." })
    return back(origin, { meta: "connected", pages: String(result.pages), instagram: String(result.instagram), ...(result.errors.length ? { reason: result.errors.slice(0, 3).join(" | ") } : {}) })
  } catch (error) {
    console.error("[meta-oauth] callback failed", error)
    return back(origin, { meta: "error", reason: error instanceof Error ? error.message.slice(0, 300) : "Connection failed." })
  }
}
