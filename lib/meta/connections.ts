import { createAdminClient } from "@/lib/supabase/admin"
import { decryptToken, encryptToken } from "./crypto"
import { graph, MetaGraphError } from "./graph"
import { getMetaConfig } from "./config"

export type MetaProvider = "whatsapp" | "facebook" | "instagram"

export type ConnectionRow = {
  id: string
  owner_id: string
  provider: MetaProvider
  external_account_id: string
  display_name: string
  details: Record<string, unknown>
  status: "active" | "error" | "disconnected"
}

export class ConnectionError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Creates or refreshes a connection for this owner and stores its encrypted token. */
export async function upsertConnection(input: { ownerId: string; provider: MetaProvider; externalAccountId: string; displayName: string; details?: Record<string, unknown>; accessToken: string }) {
  const admin = createAdminClient()
  const { data: existing, error: readError } = await admin
    .from("crm_channel_connections")
    .select("id,owner_id")
    .eq("provider", input.provider)
    .eq("external_account_id", input.externalAccountId)
    .maybeSingle()
  if (readError) throw readError
  if (existing && existing.owner_id !== input.ownerId) throw new ConnectionError(409, `${input.displayName || input.externalAccountId} is already connected to another Bintang CRM workspace.`)

  const now = new Date().toISOString()
  const row = { owner_id: input.ownerId, provider: input.provider, external_account_id: input.externalAccountId, display_name: input.displayName, details: input.details ?? {}, status: "active", last_error: null, updated_at: now }
  const { data, error } = existing
    ? await admin.from("crm_channel_connections").update(row).eq("id", existing.id).select("id").single()
    : await admin.from("crm_channel_connections").insert(row).select("id").single()
  if (error || !data) throw error ?? new Error("Connection could not be saved.")

  const { error: secretError } = await admin
    .from("crm_channel_secrets")
    .upsert({ connection_id: data.id, access_token_encrypted: encryptToken(input.accessToken), updated_at: now })
  if (secretError) throw secretError
  return data.id as string
}

export async function loadConnection(connectionId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.from("crm_channel_connections").select("id,owner_id,provider,external_account_id,display_name,details,status").eq("id", connectionId).maybeSingle()
  if (error) throw error
  return data as ConnectionRow | null
}

export async function connectionToken(connectionId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.from("crm_channel_secrets").select("access_token_encrypted").eq("connection_id", connectionId).maybeSingle()
  if (error) throw error
  if (!data) throw new ConnectionError(409, "This channel has no access token. Reconnect it in Settings → Integrations.")
  return decryptToken(data.access_token_encrypted)
}

export async function markConnectionError(connectionId: string, message: string) {
  await createAdminClient().from("crm_channel_connections").update({ status: "error", last_error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", connectionId)
}

export async function disconnectConnection(ownerId: string, connectionId: string) {
  const admin = createAdminClient()
  const connection = await loadConnection(connectionId)
  if (!connection || connection.owner_id !== ownerId) throw new ConnectionError(404, "That channel connection could not be found.")
  await admin.from("crm_channel_secrets").delete().eq("connection_id", connectionId)
  const { error } = await admin.from("crm_channel_connections").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("id", connectionId)
  if (error) throw error
}

/** WhatsApp Cloud API: verify the phone number with the supplied token, subscribe the WABA to webhooks, save. */
export async function connectWhatsApp(ownerId: string, input: { phoneNumberId: string; wabaId?: string; accessToken: string }) {
  let phone: { display_phone_number?: string; verified_name?: string; id: string }
  try {
    phone = await graph(`${encodeURIComponent(input.phoneNumberId)}`, { token: input.accessToken, query: { fields: "display_phone_number,verified_name" } })
  } catch (error) {
    throw new ConnectionError(400, `Meta rejected these WhatsApp details: ${error instanceof Error ? error.message : "unknown error"}`)
  }
  let subscribed = false
  if (input.wabaId) {
    try {
      await graph(`${encodeURIComponent(input.wabaId)}/subscribed_apps`, { method: "POST", token: input.accessToken })
      subscribed = true
    } catch (error) {
      throw new ConnectionError(400, `Phone number verified, but subscribing the WhatsApp Business Account to webhooks failed: ${error instanceof Error ? error.message : "unknown error"}`)
    }
  }
  const name = [phone.verified_name, phone.display_phone_number].filter(Boolean).join(" · ") || input.phoneNumberId
  return upsertConnection({ ownerId, provider: "whatsapp", externalAccountId: phone.id ?? input.phoneNumberId, displayName: name, details: { waba_id: input.wabaId ?? null, phone: phone.display_phone_number ?? null, webhook_subscribed: subscribed }, accessToken: input.accessToken })
}

type PageAccount = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string; name?: string } }

/** Facebook Login: connect every Page the user granted, plus each Page's linked Instagram professional account. */
export async function connectPagesFromUserToken(ownerId: string, userToken: string) {
  const pages: PageAccount[] = []
  let after: string | undefined
  for (let i = 0; i < 10; i++) {
    const result = await graph<{ data: PageAccount[]; paging?: { cursors?: { after?: string }; next?: string } }>("me/accounts", { token: userToken, query: { fields: "id,name,access_token,instagram_business_account{id,username,name}", limit: "100", after } })
    pages.push(...result.data)
    if (!result.paging?.next) break
    after = result.paging.cursors?.after
  }

  const summary = { pages: 0, instagram: 0, errors: [] as string[] }
  for (const page of pages) {
    try {
      const wanted = ["messages", "message_echoes", "messaging_postbacks", "message_deliveries", "message_reads"]
      await graph(`${page.id}/subscribed_apps`, { method: "POST", token: page.access_token, body: { subscribed_fields: wanted } })
      // Meta sometimes accepts the call without recording the fields: read them back so a silent failure is visible.
      const { appId } = getMetaConfig()
      const current = await graph<{ data?: { id?: string; subscribed_fields?: string[] }[] }>(`${page.id}/subscribed_apps`, { token: page.access_token })
      const fields = current.data?.find((app) => String(app.id) === appId)?.subscribed_fields ?? []
      const missing = wanted.filter((field) => !fields.includes(field))
      if (missing.includes("messages")) summary.errors.push(`${page.name}: Meta did not enable message forwarding (missing ${missing.join(", ")}).`)
      await upsertConnection({ ownerId, provider: "facebook", externalAccountId: page.id, displayName: page.name, details: { page_id: page.id, subscribed_fields: fields, webhook_subscribed: !missing.includes("messages") }, accessToken: page.access_token })
      summary.pages++
      if (page.instagram_business_account?.id) {
        const ig = page.instagram_business_account
        await upsertConnection({ ownerId, provider: "instagram", externalAccountId: ig.id, displayName: ig.username ? `@${ig.username}` : ig.name || page.name, details: { page_id: page.id, username: ig.username ?? null }, accessToken: page.access_token })
        summary.instagram++
      }
    } catch (error) {
      summary.errors.push(`${page.name}: ${error instanceof Error ? error.message : "could not connect"}`)
    }
  }
  return { ...summary, found: pages.length }
}

/** Sends a text message on the connection's channel. Returns Meta's message id. */
export async function sendMetaText(connection: ConnectionRow, recipientId: string, text: string) {
  const token = await connectionToken(connection.id)
  try {
    if (connection.provider === "whatsapp") {
      const result = await graph<{ messages?: { id: string }[] }>(`${connection.external_account_id}/messages`, {
        method: "POST",
        token,
        body: { messaging_product: "whatsapp", recipient_type: "individual", to: recipientId, type: "text", text: { preview_url: true, body: text } },
      })
      return result.messages?.[0]?.id ?? null
    }
    // Messenger and Instagram (via the linked Page) share the Send API.
    const pageId = String(connection.details.page_id ?? connection.external_account_id)
    const result = await graph<{ message_id?: string }>(`${pageId}/messages`, {
      method: "POST",
      token,
      body: { recipient: { id: recipientId }, messaging_type: "RESPONSE", message: { text } },
    })
    return result.message_id ?? null
  } catch (error) {
    if (error instanceof MetaGraphError) {
      // 190 = invalid/expired token: flag the connection so Settings shows it needs reconnecting.
      if (error.code === 190) await markConnectionError(connection.id, error.message)
      const hint = error.code === 131047 || /24 hour|outside.*window|re-engage/i.test(error.message)
        ? " The customer last messaged more than 24 hours ago, so Meta only allows an approved template message."
        : ""
      throw new ConnectionError(502, `${error.message}${hint}`)
    }
    throw error
  }
}

/** Best-effort profile lookup for a new Messenger / Instagram sender. */
export async function lookupSenderProfile(connection: ConnectionRow, userId: string) {
  try {
    const token = await connectionToken(connection.id)
    if (connection.provider === "facebook") {
      const profile = await graph<{ first_name?: string; last_name?: string; name?: string }>(userId, { token, query: { fields: "first_name,last_name,name" } })
      return { name: profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null, handle: null }
    }
    if (connection.provider === "instagram") {
      const profile = await graph<{ name?: string; username?: string }>(userId, { token, query: { fields: "name,username" } })
      return { name: profile.name || (profile.username ? `@${profile.username}` : null), handle: profile.username ? `@${profile.username}` : null }
    }
  } catch {
    // Profile access needs extra permissions; fall back to a generic name.
  }
  return { name: null, handle: null }
}
