import { colorForName, initialsForName } from "@/lib/crm-data"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchReceivedEmail, getEmailConfig, htmlToText, parseAddress, stripQuotedReply } from "./resend"

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type EmailConnection = { id: string; owner_id: string; external_account_id: string }

export async function findEmailConnection(address?: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.from("crm_channel_connections").select("id,owner_id,external_account_id").eq("provider", "email").eq("external_account_id", (address ?? getEmailConfig().address).toLowerCase()).neq("status", "disconnected").maybeSingle()
  if (error) throw error
  return data as EmailConnection | null
}

/** Existing identity → contact with that email → new contact. */
export async function findOrCreateEmailContact(connection: EmailConnection, email: string, name: string, timestamp: string) {
  const admin = createAdminClient()
  const { data: identity, error } = await admin.from("crm_contact_identities").select("contact_id").eq("connection_id", connection.id).eq("external_user_id", email).maybeSingle()
  if (error) throw error
  if (identity) return identity.contact_id as string

  const { data: existing } = await admin.from("crm_contacts").select("id").eq("owner_id", connection.owner_id).ilike("email", email).order("created_at").limit(1).maybeSingle()
  let contactId = existing?.id as string | undefined
  if (!contactId) {
    const displayName = (name || email.split("@")[0]).slice(0, 120)
    const { data: contact, error: contactError } = await admin.from("crm_contacts").insert({
      owner_id: connection.owner_id, name: displayName, initials: initialsForName(displayName), color: colorForName(displayName),
      email, phone: "", primary_channel: "email", handle: email, assigned: "", last_seen: timestamp, tags: ["New lead"],
    }).select("id").single()
    if (contactError || !contact) throw contactError ?? new Error("Contact insert failed")
    contactId = contact.id as string
  }
  const { error: identityError } = await admin.from("crm_contact_identities").insert({ owner_id: connection.owner_id, contact_id: contactId, connection_id: connection.id, external_user_id: email })
  if (identityError) {
    const { data: winner } = await admin.from("crm_contact_identities").select("contact_id").eq("connection_id", connection.id).eq("external_user_id", email).single()
    if (!winner) throw identityError
    if (!existing && winner.contact_id !== contactId) await admin.from("crm_contacts").delete().eq("id", contactId)
    return winner.contact_id as string
  }
  return contactId
}

export async function findOrCreateEmailConversation(connection: EmailConnection, contactId: string, email: string, timestamp: string) {
  const admin = createAdminClient()
  const select = () => admin.from("crm_conversations").select("id").eq("connection_id", connection.id).eq("external_user_id", email).maybeSingle()
  const { data: found, error } = await select()
  if (error) throw error
  if (found) return found.id as string
  const { data, error: insertError } = await admin.from("crm_conversations").insert({ owner_id: connection.owner_id, contact_id: contactId, channel: "email", messages: [], unread_count: 0, last_activity: timestamp, connection_id: connection.id, external_user_id: email }).select("id").single()
  if (data) return data.id as string
  const { data: retry } = await select()
  if (!retry) throw insertError ?? new Error("Conversation insert failed")
  return retry.id as string
}

async function storeReceived(emailId: string, meta: Json) {
  const { address } = getEmailConfig()
  const recipients = [...(Array.isArray(meta.to) ? meta.to : [meta.to]), ...(Array.isArray(meta.cc) ? meta.cc : [])].map((item) => parseAddress(item).email).filter(Boolean)
  const target = recipients.find((item) => item === address) ?? address
  const connection = await findEmailConnection(target)
  if (!connection) return { stored: false, reason: `no email connection for ${target}` }

  const full = await fetchReceivedEmail(emailId)
  const sender = parseAddress(full.from ?? meta.from)
  if (!sender.email || sender.email === address) return { stored: false, reason: "no external sender" }
  const timestamp = full.created_at ? new Date(full.created_at).toISOString() : new Date().toISOString()
  const body = full.text?.trim() ? full.text : full.html ? htmlToText(full.html) : ""
  const attachments = (full.attachments ?? meta.attachments ?? []) as { filename?: string }[]
  let text = stripQuotedReply(body).slice(0, 8000)
  if (attachments.length) text = `${text}${text ? "\n\n" : ""}📎 ${attachments.map((item) => item.filename || "attachment").join(", ")}`
  if (!text) text = "(empty email)"

  const contactId = await findOrCreateEmailContact(connection, sender.email, sender.name, timestamp)
  const conversationId = await findOrCreateEmailConversation(connection, contactId, sender.email, timestamp)
  const messageId = full.message_id || meta.message_id || full.headers?.["message-id"] || ""
  const message = { id: crypto.randomUUID(), external_id: emailId, ...(messageId ? { message_id: String(messageId) } : {}), sender: "contact", text, subject: String(full.subject ?? meta.subject ?? "(no subject)").slice(0, 300), timestamp, type: "email" }
  const admin = createAdminClient()
  const { data: appended, error } = await admin.rpc("crm_append_message", { p_conversation_id: conversationId, p_message: message, p_unread_increment: 1, p_activity: timestamp })
  if (error) throw error
  await admin.from("crm_contacts").update({ last_seen: timestamp, updated_at: new Date().toISOString() }).eq("id", contactId)
  await admin.from("crm_channel_connections").update({ last_event_at: new Date().toISOString() }).eq("id", connection.id)
  return { stored: Boolean(appended) }
}

/** Handles one Resend webhook event. */
export async function handleResendEvent(payload: Json) {
  const type = String(payload?.type ?? "")
  const data = (payload?.data ?? {}) as Json
  const emailId = String(data.email_id ?? data.id ?? "")
  if (!emailId) return { type, stored: false, reason: "no email id" }
  if (type === "email.received") return { type, ...(await storeReceived(emailId, data)) }

  const status = type === "email.delivered" ? "delivered" : type === "email.bounced" || type === "email.failed" ? "failed" : null
  if (status) {
    const connection = await findEmailConnection()
    if (connection) {
      const { error } = await createAdminClient().rpc("crm_update_message_status", { p_connection_id: connection.id, p_external_id: emailId, p_status: status })
      if (error) throw error
    }
  }
  return { type, stored: false }
}
