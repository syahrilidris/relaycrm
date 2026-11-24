import { NextResponse, type NextRequest } from "next/server"
import { findEmailConnection, findOrCreateEmailConversation } from "@/lib/email/inbound"
import { createAdminClient } from "@/lib/supabase/admin"
import { clean, corsHeaders, findOrCreateWebContact, normalisePhone } from "@/lib/webchat"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) })
}

/** Website enquiry form → an email conversation in the CRM, so replies go to the parent's inbox. */
export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"))
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (clean(body.website, 10)) return NextResponse.json({ ok: true }, { headers }) // honeypot
    const name = clean(body.name, 80)
    const email = clean(body.email, 160).toLowerCase()
    const phone = normalisePhone(clean(body.phone, 30))
    const message = clean(body.message, 4000)
    const topic = clean(body.topic, 80) || "General enquiry"
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please fill in your name, a valid email and your message." }, { status: 400, headers })

    const connection = await findEmailConnection()
    if (!connection) return NextResponse.json({ error: "Enquiries are offline. Please email support@bintangkids.com." }, { status: 503, headers })
    const admin = createAdminClient()
    const now = new Date().toISOString()
    const contactId = await findOrCreateWebContact(connection.owner_id, { name, email, phone, channel: "email" })
    // Make sure this email address threads into the same conversation as their future emails.
    await admin.from("crm_contact_identities").upsert({ owner_id: connection.owner_id, contact_id: contactId, connection_id: connection.id, external_user_id: email }, { onConflict: "connection_id,external_user_id", ignoreDuplicates: true })
    const conversationId = await findOrCreateEmailConversation(connection, contactId, email, now)
    const text = `${message}${phone ? `\n\nPhone: ${phone}` : ""}`
    const stored = { id: crypto.randomUUID(), external_id: `enquiry-${crypto.randomUUID()}`, sender: "contact", text, subject: `Website enquiry: ${topic}`, timestamp: now, type: "email" }
    const { error } = await admin.rpc("crm_append_message", { p_conversation_id: conversationId, p_message: stored, p_unread_increment: 1, p_activity: now })
    if (error) throw error
    if (phone) await admin.from("crm_contacts").update({ phone }).eq("id", contactId).eq("phone", "")
    return NextResponse.json({ ok: true }, { headers })
  } catch (error) {
    console.error("[enquiry] failed", error)
    return NextResponse.json({ error: "Your enquiry couldn't be sent. Please email support@bintangkids.com." }, { status: 500, headers })
  }
}
