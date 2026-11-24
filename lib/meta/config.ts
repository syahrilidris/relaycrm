export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v26.0"

export function getMetaConfig() {
  return {
    appId: process.env.META_APP_ID ?? "",
    appSecret: (process.env.META_APP_SECRET ?? "").trim(),
    verifyToken: process.env.META_VERIFY_TOKEN ?? "",
    loginConfigId: process.env.META_LOGIN_CONFIG_ID ?? "",
    graphVersion: META_GRAPH_VERSION,
  }
}

export function metaAppConfigured() {
  const config = getMetaConfig()
  return Boolean(config.appId && config.appSecret && config.verifyToken && process.env.META_TOKEN_ENCRYPTION_KEY)
}

/** Permissions requested when connecting Facebook Pages and their linked Instagram accounts. */
export const META_LOGIN_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "business_management",
]
