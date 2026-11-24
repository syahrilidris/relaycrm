import { NextResponse, type NextRequest } from "next/server"
import { getMetaConfig } from "@/lib/meta/config"
import { verifyMetaSignature } from "@/lib/meta/crypto"
import { ingestEvents, parseWebhook } from "@/lib/meta/webhook"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Meta calls this once when you save the Callback URL in the App Dashboard. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const { verifyToken } = getMetaConfig()
  if (params.get("hub.mode") === "subscribe" && verifyToken && params.get("hub.verify_token") === verifyToken) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } })
  }
  return new NextResponse("Forbidden", { status: 403 })
}

/** Inbound messages and delivery statuses for WhatsApp, Messenger and Instagram. */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const { appSecret } = getMetaConfig()
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
    console.warn("[meta-webhook] rejected: invalid signature", { hasHeader: Boolean(request.headers.get("x-hub-signature-256")), secretLength: appSecret.length, rawSecretLength: (process.env.META_APP_SECRET ?? "").length, secretIsHex: /^[0-9a-f]+$/i.test(appSecret), bytes: raw.length })
    return new NextResponse("Invalid signature", { status: 401 })
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new NextResponse("Bad request", { status: 400 })
  }
  try {
    const events = parseWebhook(payload as Record<string, unknown>)
    const result = events.length ? await ingestEvents(events) : { stored: 0, unmatched: [] as string[] }
    console.info("[meta-webhook] processed", { object: (payload as { object?: unknown })?.object, events: events.length, stored: result.stored, unmatchedAccounts: result.unmatched })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[meta-webhook] processing failed", error)
    // Non-2xx makes Meta retry; message ids are de-duplicated so retries are safe.
    return NextResponse.json({ received: false }, { status: 500 })
  }
}
