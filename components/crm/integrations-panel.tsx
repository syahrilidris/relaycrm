"use client"

import { useEffect, useState, type FormEvent } from "react"
import { AlertTriangle, Check, CheckCircle2, Copy, ExternalLink, Loader2, Mail, Plug, Plus, Unplug, X } from "lucide-react"
import type { ChannelConnection, MetaProvider } from "@/lib/crm-data"
import { formatDateTime } from "@/lib/crm-data"
import { ChannelIcon } from "./crm-primitives"

type IntegrationsPanelProps = {
  mode: "live" | "mock"
  metaReady: boolean
  emailReady: boolean
  onConnectEmail: () => Promise<void>
  connections: ChannelConnection[]
  onConnectWhatsApp: (input: { phoneNumberId: string; wabaId?: string; accessToken: string }) => Promise<void>
  onDisconnect: (connection: ChannelConnection) => Promise<void>
}

const providers: { id: MetaProvider; title: string; blurb: string; tint: string }[] = [
  { id: "whatsapp", title: "WhatsApp Business", blurb: "Cloud API phone numbers", tint: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-300" },
  { id: "facebook", title: "Facebook Messenger", blurb: "Messages to your Pages", tint: "from-blue-500/15 to-blue-500/0 text-blue-600 dark:text-blue-300" },
  { id: "instagram", title: "Instagram Direct", blurb: "DMs to professional accounts", tint: "from-fuchsia-500/15 to-orange-400/0 text-fuchsia-600 dark:text-fuchsia-300" },
]

export function IntegrationsPanel({ mode, metaReady, emailReady, onConnectEmail, connections, onConnectWhatsApp, onDisconnect }: IntegrationsPanelProps) {
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)
  const [banner, setBanner] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [waFormOpen, setWaFormOpen] = useState(false)
  const [busyId, setBusyId] = useState("")
  const live = mode === "live"
  const canConnect = live && metaReady

  useEffect(() => {
    setOrigin(window.location.origin)
    const params = new URLSearchParams(window.location.search)
    const status = params.get("meta")
    if (!status) return
    const reason = params.get("reason")
    if (status === "connected") setBanner({ tone: reason ? "error" : "ok", text: `Connected ${params.get("pages") ?? 0} Facebook Page(s) and ${params.get("instagram") ?? 0} Instagram account(s).${reason ? ` Some failed: ${reason}` : ""}` })
    else if (status === "cancelled") setBanner({ tone: "error", text: "Facebook connection was cancelled." })
    else if (status === "not-configured") setBanner({ tone: "error", text: "The Meta app isn't configured on the server yet." })
    else setBanner({ tone: "error", text: reason ?? "Meta connection failed. Please try again." })
    window.history.replaceState(null, "", `${window.location.pathname}#integrations`)
  }, [])

  const webhookUrl = origin ? `${origin}/api/meta/webhook` : "/api/meta/webhook"

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  async function disconnect(connection: ChannelConnection) {
    if (!window.confirm(`Disconnect ${connection.name}? New messages will stop arriving until you reconnect.`)) return
    setBusyId(connection.id)
    try {
      await onDisconnect(connection)
    } catch (error) {
      setBanner({ tone: "error", text: error instanceof Error ? error.message : "Could not disconnect." })
    } finally {
      setBusyId("")
    }
  }

  return <section id="integrations" className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div className="relative border-b border-slate-100 px-5 py-5 dark:border-slate-800">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.10),transparent_60%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">Meta omnichannel</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">Connect WhatsApp, Messenger and Instagram so customer messages land in your inbox and your replies reach them directly.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${metaReady ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"}`}>
          {metaReady ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}{metaReady ? "Meta app ready" : live ? "Server setup needed" : "Live workspace only"}
        </span>
      </div>
    </div>

    <div className="flex flex-col gap-4 p-5">
      {banner && <div role="status" className={`flex items-start justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs ${banner.tone === "ok" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"}`}><span>{banner.text}</span><button aria-label="Dismiss" onClick={() => setBanner(null)}><X className="size-3.5" /></button></div>}

      {!live && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-700">You're viewing the demo workspace. Sign in to connect real Meta channels.</p>}
      {live && !metaReady && <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-200">
        Add <code className="rounded bg-white/70 px-1 dark:bg-black/30">META_APP_ID</code> and <code className="rounded bg-white/70 px-1 dark:bg-black/30">META_APP_SECRET</code> from your Meta app to the Vercel project's environment variables, then redeploy. The verify token and encryption key are already set up.
      </div>}

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Webhook callback URL</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Paste this into your Meta app's Webhooks settings for WhatsApp, Page (Messenger) and Instagram, then subscribe to <span className="font-medium">messages</span>.</p>
        <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{webhookUrl}</code><button onClick={() => void copyWebhook()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}</button></div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {providers.map((provider) => {
          const items = connections.filter((item) => item.provider === provider.id)
          return <div key={provider.id} className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-100 p-3.5 dark:border-slate-800">
              <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${provider.tint}`}><ChannelIcon channel={provider.id} className="size-5" /></span>
              <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{provider.title}</p><p className="text-[11px] text-slate-500">{provider.blurb}</p></div>
            </div>
            <ul className="flex flex-1 flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => <li key={item.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <span className={`size-2 shrink-0 rounded-full ${item.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} title={item.status} />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{item.name || item.externalAccountId}</p><p className="truncate text-[10.5px] text-slate-500">{item.status === "error" ? item.lastError ?? "Needs reconnecting" : item.lastEventAt ? `Last message ${formatDateTime(item.lastEventAt)}` : "Waiting for first message"}</p></div>
                <button onClick={() => void disconnect(item)} disabled={busyId === item.id} aria-label={`Disconnect ${item.name}`} title="Disconnect" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-400/10">{busyId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}</button>
              </li>)}
              {items.length === 0 && <li className="px-3.5 py-4 text-[11px] text-slate-400">Not connected</li>}
            </ul>
            <div className="border-t border-slate-100 p-3 dark:border-slate-800">
              {provider.id === "whatsapp"
                ? <button disabled={!canConnect} onClick={() => setWaFormOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900"><Plus className="size-3.5" /> Add phone number</button>
                : canConnect
                  ? <a href="/api/meta/oauth/start" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-2 text-[11px] font-semibold text-white transition hover:brightness-110"><Plug className="size-3.5" /> {items.length ? "Reconnect / add more" : "Continue with Facebook"}</a>
                  : <span className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-400 dark:bg-slate-900"><Plug className="size-3.5" /> Continue with Facebook</span>}
            </div>
          </div>
        })}
      </div>
      <p className="text-[11px] text-slate-500">Messenger and Instagram connect together: choose your Facebook Pages in the Meta pop-up, and any Instagram professional account linked to those Pages is added too. <a className="font-medium text-indigo-600 hover:underline dark:text-indigo-300" href="/guide#connect">Setup guide</a> · <a className="inline-flex items-center gap-0.5 font-medium text-indigo-600 hover:underline dark:text-indigo-300" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">Meta App Dashboard <ExternalLink className="size-3" /></a></p>
    </div>

    <EmailChannel live={live} ready={emailReady} connection={connections.find((item) => item.provider === "email")} busy={busyId} onConnect={async () => { setBusyId("email"); try { await onConnectEmail(); setBanner({ tone: "ok", text: "Email connected." }) } catch (error) { setBanner({ tone: "error", text: error instanceof Error ? error.message : "Could not connect email." }) } finally { setBusyId("") } }} onDisconnect={disconnect} />

    {waFormOpen && <WhatsAppDialog onClose={() => setWaFormOpen(false)} onSave={async (input) => { await onConnectWhatsApp(input); setWaFormOpen(false); setBanner({ tone: "ok", text: "WhatsApp number connected." }) }} />}
  </section>
}

function WhatsAppDialog({ onClose, onSave }: { onClose: () => void; onSave: (input: { phoneNumberId: string; wabaId?: string; accessToken: string }) => Promise<void> }) {
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [wabaId, setWabaId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await onSave({ phoneNumberId: phoneNumberId.trim(), accessToken: accessToken.trim(), ...(wabaId.trim() ? { wabaId: wabaId.trim() } : {}) })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect this number.")
    } finally {
      setSaving(false)
    }
  }

  const field = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="wa-title" className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between"><div><h2 id="wa-title" className="text-sm font-semibold text-slate-900 dark:text-white">Connect a WhatsApp number</h2><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Find these in your Meta app under <span className="font-medium">WhatsApp → API Setup</span>. Use a permanent System User token with <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code>.</p></div><button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></div>
      <div className="mt-5 flex flex-col gap-3">
        <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Phone number ID</span><input required inputMode="numeric" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="e.g. 106540352242922" className={field} /></label>
        <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">WhatsApp Business Account ID <span className="font-normal text-slate-400">(recommended: subscribes webhooks)</span></span><input inputMode="numeric" value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="e.g. 102290129340398" className={field} /></label>
        <label><span className="mb-1.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Access token</span><input required type="password" autoComplete="off" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAG…" className={field} /></label>
        <p className="text-[10.5px] text-slate-400">The token is encrypted before it's stored and never sent back to the browser.</p>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving && <Loader2 className="size-3.5 animate-spin" />}{saving ? "Verifying with Meta…" : "Connect number"}</button></div>
    </form>
  </div>
}

function EmailChannel({ live, ready, connection, busy, onConnect, onDisconnect }: { live: boolean; ready: boolean; connection?: ChannelConnection; busy: string; onConnect: () => Promise<void>; onDisconnect: (connection: ChannelConnection) => Promise<void> }) {
  const active = connection && connection.status === "active"
  return <div className="border-t border-slate-100 px-5 py-5 dark:border-slate-800">
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-sky-500/0 text-sky-600 dark:text-sky-300"><Mail className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Email</p>
        <p className="truncate text-[11px] text-slate-500">{connection ? <>{connection.externalAccountId} · {connection.lastEventAt ? `last email ${formatDateTime(connection.lastEventAt)}` : "waiting for first email"}</> : ready ? "Receive and reply to support@bintangkids.com from the inbox" : live ? "Server setup needed: add RESEND_API_KEY and RESEND_WEBHOOK_SECRET in Vercel" : "Live workspace only"}</p>
      </div>
      {connection
        ? <div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"}`}>{active ? "Connected" : "Needs attention"}</span><button onClick={() => void onDisconnect(connection)} disabled={busy === connection.id} title="Disconnect" aria-label="Disconnect email" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-400/10">{busy === connection.id ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}</button></div>
        : <button disabled={!live || !ready || busy === "email"} onClick={() => void onConnect()} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy === "email" ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />} Connect support@bintangkids.com</button>}
    </div>
  </div>
}
