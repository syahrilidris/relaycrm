import { NextResponse, type NextRequest } from "next/server"
import { handleResendEvent } from "@/lib/email/inbound"
import { getEmailConfig, verifyResendSignature } from "@/lib/email/resend"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Resend webhook: received emails (support@…) plus delivery/bounce updates for emails we sent. */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  const { webhookSecret } = getEmailConfig()
  if (!verifyResendSignature(raw, request.headers, webhookSecret)) {
    const raw_secret = process.env.RESEND_WEBHOOK_SECRET ?? ""
    const body = webhookSecret.startsWith("whsec_") ? webhookSecret.slice(6) : webhookSecret
    console.warn("[email-webhook] rejected: invalid signature", {
      hasSecret: Boolean(webhookSecret),
      secretLength: webhookSecret.length,
      rawSecretLength: raw_secret.length,
      startsWithWhsec: webhookSecret.startsWith("whsec_"),
      looksLikeApiKey: webhookSecret.startsWith("re_"),
      base64Chars: /^[A-Za-z0-9+/=]+$/.test(body),
      decodedKeyBytes: Buffer.from(body, "base64").length,
      timestampAgeSeconds: Math.round(Date.now() / 1000 - Number(request.headers.get("svix-timestamp"))),
      signatureVersions: (request.headers.get("svix-signature") ?? "").split(" ").map((part) => part.split(",")[0]),
      bytes: raw.length,
    })
    return new NextResponse("Invalid signature", { status: 401 })
  }
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return new NextResponse("Bad request", { status: 400 })
  }
  try {
    const result = await handleResendEvent(payload)
    console.info("[email-webhook] processed", result)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[email-webhook] processing failed", error)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}
