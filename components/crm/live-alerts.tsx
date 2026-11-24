"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, BellOff, BellRing, Check, MonitorSmartphone, Volume2, VolumeX, X } from "lucide-react"
import type { Contact, Conversation } from "@/lib/crm-data"
import { channelLabels } from "@/lib/crm-data"
import { ChannelIcon, ContactAvatar } from "./crm-primitives"

export type LiveAlert = {
  key: string
  conversationId: string
  contact: Pick<Contact, "name" | "initials" | "color">
  channel: Conversation["channel"]
  text: string
}

const SOUND_KEY = "bintang:alert-sound"
const ALERT_LIFETIME_MS = 7000

function readSoundPreference() {
  try { return window.localStorage.getItem(SOUND_KEY) !== "off" } catch { return true }
}

function latestCustomerMessage(conversation: Conversation) {
  for (let index = conversation.messages.length - 1; index >= 0; index--) {
    const message = conversation.messages[index]
    if (message.from === "contact") return message
  }
  return undefined
}

/**
 * Watches the polled conversation list and raises an alert for every new customer message:
 * an in-app toast, a short chime, and a desktop notification while the tab is in the background.
 */
export function useLiveAlerts({ conversations, contacts, ready, enabled, isViewing, onOpen }: {
  conversations: Conversation[]
  contacts: Contact[]
  ready: boolean
  enabled: boolean
  /** True when this conversation is already open on screen, so no alert is needed. */
  isViewing: (conversationId: string) => boolean
  onOpen: (conversationId: string) => void
}) {
  const [alerts, setAlerts] = useState<LiveAlert[]>([])
  const [soundOn, setSoundOnState] = useState(true)
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | "unsupported">("default")
  const seen = useRef<Map<string, string> | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const onOpenRef = useRef(onOpen)
  const isViewingRef = useRef(isViewing)
  onOpenRef.current = onOpen
  isViewingRef.current = isViewing

  useEffect(() => {
    setSoundOnState(readSoundPreference())
    setDesktopPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission)
    // Browsers only allow sound after the person has interacted with the page once.
    const unlock = () => {
      if (!audio.current && typeof AudioContext !== "undefined") audio.current = new AudioContext()
      void audio.current?.resume()
    }
    window.addEventListener("pointerdown", unlock, { once: true })
    window.addEventListener("keydown", unlock, { once: true })
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock) }
  }, [])

  const chime = useCallback(() => {
    const context = audio.current
    if (!context || context.state !== "running") return
    const start = context.currentTime
    // Two soft rising notes.
    ;[[880, 0], [1320, 0.11]].forEach(([frequency, offset]) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.32)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.34)
    })
  }, [])

  const dismiss = useCallback((key: string) => setAlerts((current) => current.filter((item) => item.key !== key)), [])

  useEffect(() => {
    if (!ready) return
    const next = new Map<string, string>()
    for (const conversation of conversations) {
      const latest = latestCustomerMessage(conversation)
      if (latest) next.set(conversation.id, latest.id)
    }
    // First load: remember what is already there, alert only on what arrives afterwards.
    if (!seen.current) { seen.current = next; return }
    const fresh: LiveAlert[] = []
    for (const conversation of conversations) {
      const latestId = next.get(conversation.id)
      if (!latestId || seen.current.get(conversation.id) === latestId) continue
      if (isViewingRef.current(conversation.id)) continue
      const person = contacts.find((item) => item.id === conversation.contactId)
      const message = latestCustomerMessage(conversation)
      fresh.push({ key: `${conversation.id}:${latestId}`, conversationId: conversation.id, contact: person ?? { name: "New customer", initials: "?", color: "bg-slate-100 text-slate-600" }, channel: conversation.channel, text: message?.text ?? conversation.preview })
    }
    seen.current = next
    if (!fresh.length || !enabled) return

    setAlerts((current) => [...fresh, ...current.filter((item) => !fresh.some((entry) => entry.conversationId === item.conversationId))].slice(0, 4))
    if (readSoundPreference()) chime()
    if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
      for (const alert of fresh) {
        const notification = new Notification(`${alert.contact.name} · ${channelLabels[alert.channel]}`, { body: alert.text.slice(0, 140), icon: "/icon.svg", tag: alert.conversationId })
        notification.onclick = () => { window.focus(); onOpenRef.current(alert.conversationId); notification.close() }
      }
    }
  }, [chime, contacts, conversations, enabled, ready])

  // Each toast fades away on its own after a few seconds.
  useEffect(() => {
    if (!alerts.length) return
    const timer = window.setTimeout(() => setAlerts((current) => current.slice(0, -1)), ALERT_LIFETIME_MS)
    return () => window.clearTimeout(timer)
  }, [alerts])

  function setSoundOn(value: boolean) {
    setSoundOnState(value)
    try { window.localStorage.setItem(SOUND_KEY, value ? "on" : "off") } catch { /* private mode */ }
    if (value) { if (!audio.current && typeof AudioContext !== "undefined") audio.current = new AudioContext(); void audio.current?.resume().then(chime) }
  }

  async function enableDesktop() {
    if (typeof Notification === "undefined") return
    setDesktopPermission(await Notification.requestPermission())
  }

  return { alerts, dismiss, soundOn, setSoundOn, desktopPermission, enableDesktop }
}

/** Keeps "(3) Bintang CRM" in the browser tab so new messages are visible from other tabs. */
export function useUnreadTitle(unread: number) {
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "") || "Bintang CRM"
    document.title = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ${base}` : base
  }, [unread])
}

export function AlertStack({ alerts, onOpen, onDismiss }: { alerts: LiveAlert[]; onOpen: (conversationId: string) => void; onDismiss: (key: string) => void }) {
  if (!alerts.length) return null
  return <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
    {alerts.map((alert) => <div key={alert.key} className="pointer-events-auto flex animate-[bintang-toast_220ms_ease-out] items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_-8px_rgba(14,20,48,0.28)] dark:border-slate-700 dark:bg-slate-900">
      <div className="relative"><ContactAvatar contact={alert.contact} size="sm" /><span className="absolute -bottom-0.5 -right-0.5 flex size-[17px] items-center justify-center rounded-full border-2 border-white bg-white dark:border-slate-900 dark:bg-slate-900"><ChannelIcon channel={alert.channel} className="size-2.5 text-slate-600 dark:text-slate-300" /></span></div>
      <button onClick={() => { onOpen(alert.conversationId); onDismiss(alert.key) }} className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-900 dark:text-white"><span className="truncate">{alert.contact.name}</span><span className="shrink-0 text-[10.5px] font-medium text-slate-400">{channelLabels[alert.channel]} · now</span></p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-600 dark:text-slate-300">{alert.text}</p>
        <span className="mt-1.5 inline-block text-[11.5px] font-semibold text-indigo-700 dark:text-indigo-300">Reply</span>
      </button>
      <button onClick={() => onDismiss(alert.key)} aria-label="Dismiss alert" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X className="size-3.5" /></button>
    </div>)}
  </div>
}

/** Small confirmation toast for saves ("Case created", "Settings saved"…). */
export function NoticeToast({ notice, onDismiss }: { notice: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timer)
  }, [notice, onDismiss])
  if (!notice) return null
  return <div role="status" className="fixed bottom-4 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-[bintang-toast_200ms_ease-out] items-center gap-2.5 rounded-xl bg-[#0E1430] px-3.5 py-2.5 text-[12px] font-medium text-white shadow-lg">
    <Check className="size-3.5 shrink-0 text-[#F5B301]" /><span>{notice}</span>
    <button onClick={onDismiss} aria-label="Dismiss" className="ml-1 rounded p-0.5 text-white/60 hover:text-white"><X className="size-3.5" /></button>
  </div>
}

export type UnreadItem = { conversation: Conversation; contact: Contact }

export function NotificationsMenu({ items, soundOn, onToggleSound, desktopPermission, onEnableDesktop, onOpen, onMarkAllRead }: {
  items: UnreadItem[]
  soundOn: boolean
  onToggleSound: (value: boolean) => void
  desktopPermission: NotificationPermission | "unsupported"
  onEnableDesktop: () => void
  onOpen: (conversationId: string) => void
  onMarkAllRead: () => void
}) {
  const [open, setOpen] = useState(false)
  const count = items.reduce((sum, item) => sum + Math.max(item.conversation.unread, 1), 0)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])
  return <div className="relative">
    <button aria-label={count ? `Notifications, ${count} unread` : "Notifications"} aria-expanded={open} onClick={() => setOpen(!open)} className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
      {count ? <BellRing className="size-[17px]" /> : <Bell className="size-[17px]" />}
      {count > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-white dark:ring-slate-950">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <>
      <button aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-11 z-40 w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800"><p className="text-[12.5px] font-semibold text-slate-900 dark:text-white">Notifications</p>{items.length > 0 && <button onClick={() => { onMarkAllRead(); setOpen(false) }} className="text-[11.5px] font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Mark all as read</button>}</div>
        <div className="max-h-[320px] overflow-y-auto">
          {items.length ? items.slice(0, 8).map(({ conversation, contact }) => <button key={conversation.id} onClick={() => { onOpen(conversation.id); setOpen(false) }} className="flex w-full items-start gap-2.5 border-b border-slate-100 px-3.5 py-2.5 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
            <ContactAvatar contact={contact} size="sm" />
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-[12px] font-semibold text-slate-900 dark:text-white">{contact.name}</span><span className="shrink-0 text-[10.5px] text-slate-400">{conversation.time}</span></div><p className="truncate text-[11.5px] text-slate-500">{conversation.preview}</p><span className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-400"><ChannelIcon channel={conversation.channel} className="size-3" />{channelLabels[conversation.channel]}{conversation.unread > 1 && ` · ${conversation.unread} new`}</span></div>
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-500" />
          </button>) : <p className="px-4 py-8 text-center text-[12px] text-slate-500">You’re all caught up.</p>}
        </div>
        <div className="flex flex-col gap-1 border-t border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/40">
          <button onClick={() => onToggleSound(!soundOn)} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"><span className="flex items-center gap-2">{soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}Sound for new messages</span><span className={`relative h-4 w-7 rounded-full transition ${soundOn ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${soundOn ? "left-3.5" : "left-0.5"}`} /></span></button>
          {desktopPermission === "granted" ? <p className="flex items-center gap-2 px-2 py-1.5 text-[11.5px] text-slate-500"><MonitorSmartphone className="size-3.5" />Desktop alerts are on</p>
            : desktopPermission === "denied" ? <p className="flex items-center gap-2 px-2 py-1.5 text-[11.5px] text-slate-500"><BellOff className="size-3.5" />Desktop alerts are blocked in your browser settings</p>
            : desktopPermission === "unsupported" ? null
            : <button onClick={onEnableDesktop} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11.5px] font-semibold text-indigo-700 hover:bg-white dark:text-indigo-300 dark:hover:bg-slate-800"><MonitorSmartphone className="size-3.5" />Turn on desktop alerts</button>}
        </div>
      </div>
    </>}
  </div>
}
