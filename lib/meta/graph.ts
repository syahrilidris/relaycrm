import { getMetaConfig } from "./config"
import { appSecretProof } from "./crypto"

export class MetaGraphError extends Error {
  code?: number
  status: number
  constructor(message: string, status: number, code?: number) {
    super(message)
    this.status = status
    this.code = code
  }
}

type GraphOptions = {
  method?: "GET" | "POST" | "DELETE"
  token?: string
  query?: Record<string, string | undefined>
  body?: unknown
  /** Instagram-Login tokens live on graph.instagram.com; everything else on graph.facebook.com. */
  host?: "facebook" | "instagram"
}

export async function graph<T = Record<string, unknown>>(path: string, options: GraphOptions = {}): Promise<T> {
  const { graphVersion, appSecret } = getMetaConfig()
  const host = options.host === "instagram" ? "https://graph.instagram.com" : "https://graph.facebook.com"
  const url = new URL(`${host}/${graphVersion}/${path.replace(/^\//, "")}`)
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) url.searchParams.set(key, value)
  if (options.token) {
    url.searchParams.set("access_token", options.token)
    if (appSecret && options.host !== "instagram") url.searchParams.set("appsecret_proof", appSecretProof(options.token, appSecret))
  }
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
  const payload = await response.json().catch(() => ({})) as { error?: { message?: string; code?: number; error_user_msg?: string } }
  if (!response.ok || payload.error) {
    const message = payload.error?.error_user_msg || payload.error?.message || `Meta request failed (${response.status}).`
    throw new MetaGraphError(message, response.status, payload.error?.code)
  }
  return payload as T
}
