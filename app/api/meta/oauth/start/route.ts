import { randomBytes } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { getMetaConfig, META_LOGIN_SCOPES, metaAppConfigured } from "@/lib/meta/config"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", origin))
  if (!metaAppConfigured()) return NextResponse.redirect(new URL("/settings?meta=not-configured#integrations", origin))

  const { appId, graphVersion, loginConfigId } = getMetaConfig()
  const state = randomBytes(24).toString("base64url")
  const dialog = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`)
  dialog.searchParams.set("client_id", appId)
  dialog.searchParams.set("redirect_uri", `${origin}/api/meta/oauth/callback`)
  dialog.searchParams.set("state", state)
  dialog.searchParams.set("response_type", "code")
  // Facebook Login for Business uses a configuration id instead of a scope list.
  if (loginConfigId) dialog.searchParams.set("config_id", loginConfigId)
  else dialog.searchParams.set("scope", META_LOGIN_SCOPES.join(","))

  const response = NextResponse.redirect(dialog)
  response.cookies.set("bintang_meta_state", `${state}.${user.id}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/api/meta/oauth" })
  return response
}
