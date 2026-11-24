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
    console.warn("[email-webhook] rejected: invalid signature", { hasSecret: Boolean(webhookSecret), hasHeaders: Boolean(request.headers.get("svix-signature")) })
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
