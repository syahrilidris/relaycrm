"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Bell, Check, ChevronRight, CircleHelp, Globe2, LockKeyhole, Moon, Plug, Sun, UserRound, X } from "lucide-react"
import type { Channel, ChannelConnection, CrmPreferences } from "@/lib/crm-data"
import { channelLabels, initialsForName } from "@/lib/crm-data"
import { ChannelIcon, PageToolbar, toolbarButton } from "./crm-primitives"
import { IntegrationsPanel } from "./integrations-panel"

type SettingsViewProps = {
  viewerName: string
  viewerEmail: string
  preferences: CrmPreferences
  mode: "live" | "mock"
  darkMode: boolean
  onToggleTheme: () => void
  onSaveProfile: (name: string) => Promise<void>
  onUpdatePreferences: (preferences: CrmPreferences) => Promise<void>
  onSignOut: () => void
  connections: ChannelConnection[]
  metaReady: boolean
  emailReady: boolean
  onConnectEmail: () => Promise<void>
  onConnectWhatsApp: (input: { phoneNumberId: string; wabaId?: string; accessToken: string }) => Promise<void>
  onDisconnectChannel: (connection: ChannelConnection) => Promise<void>
}

const channelOrder: Channel[] = ["whatsapp", "email", "instagram", "facebook", "webchat"]

export function SettingsView({ viewerName, viewerEmail, preferences, mode, darkMode, onToggleTheme, onSaveProfile, onUpdatePreferences, onSignOut, connections, metaReady, emailReady, onConnectEmail, onConnectWhatsApp, onDisconnectChannel }: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState("profile")
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileName, setProfileName] = useState(viewerName)
  const [profileError, setProfileError] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [preferenceError, setPreferenceError] = useState("")
  const inboxHref = mode === "mock" ? "/demo/inbox" : "/inbox"

  function openProfileEditor() {
    setProfileName(viewerName)
    setProfileError("")
    setEditingProfile(true)
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = profileName.trim()
    if (!name || name.length > 80) {
      setProfileError("Enter a name between 1 and 80 characters.")
      return
    }
    setProfileSaving(true)
    setProfileError("")
    try {
      await onSaveProfile(name)
      setEditingProfile(false)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Your profile could not be saved.")
    } finally {
      setProfileSaving(false)
    }
  }

  async function savePreferences(next: CrmPreferences) {
    setPreferenceError("")
    try {
      await onUpdatePreferences(next)
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : "Your preferences could not be saved.")
    }
  }

  const settingsSections = [
    { id: "profile", icon: UserRound, title: "Profile" },
    { id: "integrations", icon: Plug, title: "Integrations" },
    { id: "notifications", icon: Bell, title: "Notifications" },
    { id: "channels", icon: Globe2, title: "Channels" },
    { id: "security", icon: LockKeyhole, title: "Security" },
    { id: "help", icon: CircleHelp, title: "Help & support" },
  ]

  const liveChannels = connections.filter((item) => item.status === "active").length
  return <div className="flex min-h-0 flex-1 flex-col">
    <PageToolbar title="Settings" subtitle={`${viewerEmail || "Demo profile"} · ${liveChannels} ${liveChannels === 1 ? "channel" : "channels"} connected`}>
      <Link href="/guide" className={toolbarButton}><CircleHelp className="size-3.5 text-indigo-600 dark:text-indigo-400" />User guide</Link>
    </PageToolbar>
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
    <nav aria-label="Settings sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950 lg:w-[230px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-3">
      {settingsSections.map(({ id, icon: Icon, title }) => <a key={id} href={`#${id}`} onClick={() => setActiveSection(id)} aria-current={activeSection === id ? "location" : undefined} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12.5px] font-medium transition lg:w-full ${activeSection === id ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"}`}><Icon className="size-4" />{title}{activeSection === id && <ChevronRight className="ml-auto hidden size-3.5 lg:block" />}</a>)}
    </nav>

    <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F6FA] dark:bg-slate-900/40"><div className="flex max-w-[880px] flex-col gap-4 p-4 sm:p-6">
      <section id="profile" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Profile settings</h2><p className="mt-1 text-[11.5px] text-slate-500">Manage the name shown across your workspace.</p></div>
        <div className="flex items-center gap-3 px-5 py-4"><div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-sm font-bold text-slate-950">{initialsForName(viewerName)}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{viewerName}</p><p className="mt-0.5 truncate text-[11.5px] text-slate-500">{viewerEmail || "No email address"} · {mode === "live" ? "Workspace owner" : "Demo profile"}</p></div><button onClick={openProfileEditor} className="ml-auto shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Edit profile</button></div>
      </section>

      <IntegrationsPanel mode={mode} metaReady={metaReady} emailReady={emailReady} onConnectEmail={onConnectEmail} connections={connections} onConnectWhatsApp={onConnectWhatsApp} onDisconnect={onDisconnectChannel} />

      <section id="appearance" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Appearance</h2><p className="mt-1 text-[11.5px] text-slate-500">Choose a look that works for your team.</p></div><div className="flex items-center justify-between gap-4 px-5 py-4"><div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}</span><div><p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">{darkMode ? "Dark mode" : "Light mode"}</p><p className="mt-0.5 text-[10.5px] text-slate-500">Switch the workspace appearance.</p></div></div><button onClick={onToggleTheme} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Switch to {darkMode ? "light" : "dark"}</button></div></section>

      <section id="channels" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Inbox channel visibility</h2><p className="mt-1 text-[11.5px] text-slate-500">Choose which channel filters are available in your inbox.</p></div><div className="divide-y divide-slate-100 dark:divide-slate-900">{channelOrder.map((channel) => { const enabled = preferences.channels[channel]; return <div key={channel} className="flex items-center gap-2.5 px-5 py-3"><span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ChannelIcon channel={channel} className="size-4" /></span><div><p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">{channelLabels[channel]}</p><p className="mt-0.5 text-[10.5px] text-slate-500">{enabled ? "Visible in inbox" : "Hidden from inbox"}</p></div><button onClick={() => void savePreferences({ ...preferences, channels: { ...preferences.channels, [channel]: !enabled } })} aria-pressed={enabled} aria-label={`${enabled ? "Hide" : "Show"} ${channelLabels[channel]} in inbox`} className={`ml-auto flex h-6 w-10 items-center rounded-full p-0.5 transition ${enabled ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`}><span className={`size-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} /></button></div>})}</div></section>

      <section id="notifications" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Notifications</h2><p className="mt-1 text-[11.5px] text-slate-500">{mode === "live" ? "Save your notification preferences to your account." : "Preferences are stored locally in this browser."}</p></div><div className="divide-y divide-slate-100 dark:divide-slate-900">{[{ key: "replies" as const, title: "Customer replies", desc: "When a customer replies to a conversation." }, { key: "assignments" as const, title: "New assignments", desc: "When a conversation or case is assigned to you." }, { key: "dailyDigest" as const, title: "Daily summary", desc: "A daily recap of your inbox activity." }].map(({ key, title, desc }) => { const enabled = preferences.notifications[key]; return <div key={key} className="flex items-center justify-between gap-4 px-5 py-3"><div><p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">{title}</p><p className="mt-0.5 text-[10.5px] text-slate-500">{desc}</p></div><button onClick={() => void savePreferences({ ...preferences, notifications: { ...preferences.notifications, [key]: !enabled } })} aria-pressed={enabled} aria-label={`${enabled ? "Disable" : "Enable"} ${title}`} className={`flex size-5 items-center justify-center rounded border transition ${enabled ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"}`}>{enabled && <Check className="size-3" />}</button></div>})}</div>{preferenceError && <p role="alert" className="px-5 py-3 text-[11.5px] text-rose-600 dark:text-rose-300">{preferenceError}</p>}</section>

      <section id="security" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Security</h2><p className="mt-1 text-[11.5px] text-slate-500">{mode === "live" ? "Your CRM records are isolated to this signed-in account with Supabase row-level security." : "Demo records are stored only in this browser’s local storage."}</p></div><div className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">{mode === "live" ? "Signed in as" : "Demo profile"}</p><p className="mt-1 text-[11.5px] text-slate-500">{viewerEmail || "Local demo account"}</p></div><button onClick={onSignOut} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Sign out</button></div></section>

      <section id="help" className="scroll-mt-4 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Help &amp; support</h2><p className="mt-1 text-[11.5px] text-slate-500">Step-by-step help for connecting WhatsApp, Messenger and Instagram, where customers message you, and replying.</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2"><Link href="/guide" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-indigo-700 hover:underline dark:text-indigo-400">Open the user guide <ChevronRight className="size-3" /></Link><Link href={inboxHref} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-600 hover:underline dark:text-slate-300">Open inbox <ChevronRight className="size-3" /></Link></div></section>
    </div></div>
    </div>

    {editingProfile && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !profileSaving) setEditingProfile(false) }}><section role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-400">Account profile</p><h2 id="profile-editor-title" className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Edit your name</h2><p className="mt-1 text-[11.5px] text-slate-500">{mode === "live" ? "This name appears in your workspace and is saved to your Supabase account." : "This name is saved locally in this browser’s mock workspace."}</p></div><button type="button" aria-label="Close profile editor" disabled={profileSaving} onClick={() => setEditingProfile(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"><X className="size-4" /></button></div><form onSubmit={saveProfile} className="mt-5"><label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">Display name</span><input autoFocus maxLength={80} required value={profileName} onChange={(event) => setProfileName(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" /></label><p className="mt-2 text-[10.5px] text-slate-500">Email is managed by your sign-in provider: {viewerEmail}</p>{profileError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{profileError}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={profileSaving} onClick={() => setEditingProfile(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11.5px] font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">Cancel</button><button type="submit" disabled={profileSaving} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-[11.5px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{profileSaving ? "Saving…" : "Save profile"}</button></div></form></section></div>}
  </div>
}
