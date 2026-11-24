import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { clean, corsHeaders, findOrCreateWebContact, findWebConversation, normalisePhone, siteOwnerId, validVisitor, visitorToken } from "@/lib/webchat"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Stored = { id?: string; sender?: string; text?: string; timestamp?: string; type?: string; attachments?: { url: string; name: string; mime: string; kind?: string }[] }

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) })
}

function visible(messages: unknown[]) {
  return (messages as Stored[])
    .filter((m) => (m.sender === "contact" || m.sender === "agent") && m.type !== "note")
    .map((m) => ({ id: m.id ?? "", from: m.sender === "agent" ? "agent" : "visitor", text: m.text ?? "", time: m.timestamp ?? "", ...(m.attachments?.length ? { attachments: m.attachments.map((a) => ({ url: a.url, name: a.name, kind: a.kind ?? "file" })) } : {}) }))
}

/** Visitor polls for their conversation. */
export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"))
  const params = request.nextUrl.searchParams
  const visitorId = params.get("v")
  if (!validVisitor(visitorId, params.get("t"))) return NextResponse.json({ error: "Session expired" }, { status: 401, headers })
  const ownerId = await siteOwnerId()
  const conversation = ownerId ? await findWebConversation(ownerId, visitorId) : null
  return NextResponse.json({ messages: conversation ? visible(conversation.messages ?? []) : [] }, { headers })
}

/** Starts a chat (name + email/phone) or sends a visitor message. */
export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"))
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (clean(body.website, 10)) return NextResponse.json({ ok: true }, { headers }) // honeypot
    const ownerId = await siteOwnerId()
    if (!ownerId) return NextResponse.json({ error: "Chat is offline right now. Please email support@bintangkids.com." }, { status: 503, headers })
    const admin = createAdminClient()
    const text = clean(body.text, 2000)
    const page = clean(body.page, 300)
    const now = new Date().toISOString()

    let visitorId = typeof body.v === "string" ? body.v : ""
    let conversation = validVisitor(visitorId, body.t) ? await findWebConversation(ownerId, visitorId) : null

    if (!conversation) {
      const name = clean(body.name, 80)
      const email = clean(body.email, 160).toLowerCase()
      const phone = normalisePhone(clean(body.phone, 30))
      if (!name || (!email && !phone)) return NextResponse.json({ error: "Please enter your name and an email or phone number." }, { status: 400, headers })
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400, headers })
      visitorId = crypto.randomUUID()
      const contactId = await findOrCreateWebContact(ownerId, { name, email, phone, channel: "webchat" })
      const intro = { id: crypto.randomUUID(), sender: "system", text: `Website chat started${page ? ` on ${page}` : ""}`, timestamp: now, type: "chat" }
      const { data, error } = await admin.from("crm_conversations").insert({ owner_id: ownerId, contact_id: contactId, channel: "webchat", messages: [intro], unread_count: 0, last_activity: now, external_user_id: visitorId }).select("id,contact_id,messages").single()
      if (error || !data) throw error ?? new Error("Conversation insert failed")
      conversation = data as { id: string; contact_id: string; messages: unknown[] }
    }

    if (text) {
      const message = { id: crypto.randomUUID(), external_id: `web-${crypto.randomUUID()}`, sender: "contact", text, timestamp: now, type: "chat" }
      const { error } = await admin.rpc("crm_append_message", { p_conversation_id: conversation.id, p_message: message, p_unread_increment: 1, p_activity: now })
      if (error) throw error
      await admin.from("crm_contacts").update({ last_seen: now, updated_at: now }).eq("id", conversation.contact_id)
    }
    const fresh = await findWebConversation(ownerId, visitorId)
    return NextResponse.json({ v: visitorId, t: visitorToken(visitorId), messages: visible(fresh?.messages ?? []) }, { headers })
  } catch (error) {
    console.error("[webchat] failed", error)
    return NextResponse.json({ error: "Message not sent. Please try again." }, { status: 500, headers })
  }
}
