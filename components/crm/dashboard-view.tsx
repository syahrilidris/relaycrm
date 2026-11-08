import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, Inbox, MessageCircle, TrendingUp, UsersRound } from "lucide-react"
import type { Channel, Contact, Conversation, SupportCase } from "@/lib/crm-data"
import { channelLabels } from "@/lib/crm-data"
import { ChannelPill, ContactAvatar, PriorityPill } from "./crm-primitives"

const channelColors: Record<Channel, string> = {
  whatsapp: "bg-emerald-500",
  email: "bg-sky-500",
  instagram: "bg-pink-500",
  facebook: "bg-blue-500",
  webchat: "bg-amber-500",
}

const sampleVolume = [
  { day: "Mon", current: 44, previous: 24 },
  { day: "Tue", current: 64, previous: 37 },
  { day: "Wed", current: 52, previous: 30 },
  { day: "Thu", current: 78, previous: 41 },
  { day: "Fri", current: 60, previous: 35 },
  { day: "Sat", current: 33, previous: 19 },
  { day: "Sun", current: 46, previous: 25 },
]

function liveVolume(conversations: Conversation[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 6)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { date, count: 0 }
  })

  conversations.forEach((conversation) => {
    if (!conversation.lastActivity) return
    const activity = new Date(conversation.lastActivity)
    if (Number.isNaN(activity.valueOf()) || activity < start || activity > new Date()) return
    const index = Math.floor((activity.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    if (days[index]) days[index].count += 1
  })

  return days.map(({ date, count }) => ({ day: date.toLocaleDateString([], { weekday: "short" }), count }))
}

export function DashboardView({ contacts, conversations, cases, viewerName, mode, onOpenInbox, onOpenCases, onAddContact }: { contacts: Contact[]; conversations: Conversation[]; cases: SupportCase[]; viewerName: string; mode: "live" | "mock"; onOpenInbox: () => void; onOpenCases: () => void; onAddContact: () => void }) {
  const firstName = viewerName.trim().split(/\s+/)[0] || "there"
  const liveDays = mode === "live" ? liveVolume(conversations) : []
  const maximumLiveVolume = Math.max(1, ...liveDays.map((item) => item.count))
  const openCases = cases.filter((item) => item.status !== "Resolved")
  const channelStats = (Object.keys(channelLabels) as Channel[]).map((channel) => {
    const count = conversations.filter((conversation) => conversation.channel === channel).length
    return { channel, count, percent: conversations.length ? Math.round((count / conversations.length) * 100) : 0 }
  })
  const stats = [
    { label: "Total contacts", value: contacts.length.toLocaleString(), detail: mode === "mock" ? "+12.8% from last month" : "Live record count", icon: UsersRound, tone: "bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300" },
    { label: "Conversations", value: conversations.length.toString().padStart(2, "0"), detail: mode === "mock" ? "8 need a reply" : `${conversations.filter((item) => item.unread > 0).length} unread`, icon: Inbox, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300" },
    { label: "Avg. first response", value: mode === "mock" ? "4m 32s" : "—", detail: mode === "mock" ? "−18% from last week" : "Not tracked yet", icon: Clock3, tone: "bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300" },
    { label: "Customer satisfaction", value: mode === "mock" ? "96.8%" : "—", detail: mode === "mock" ? "+2.4% from last month" : "No survey data", icon: TrendingUp, tone: "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300" },
  ]

  return <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
    {contacts.length === 0 && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 dark:border-emerald-400/20 dark:bg-emerald-400/10"><div><h2 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Your workspace is empty</h2><p className="mt-0.5 text-[10px] text-emerald-800/80 dark:text-emerald-300/80">Add your first contact, then open cases, log interactions and start conversations for them.</p></div><button onClick={onAddContact} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-emerald-700">Add first contact</button></section>}
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><h1 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-[28px]">Good morning, {firstName} <span aria-hidden="true">✦</span></h1><p className="mt-1 text-[12px] text-slate-500">Here&apos;s what&apos;s happening with your customers today.</p></div><button onClick={onOpenInbox} className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-[11px] font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><MessageCircle className="size-3.5" /> Go to inbox <ArrowRight className="size-3.5" /></button></div>

    <section aria-label="Performance overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">{stats.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.025)] dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between"><p className="text-[11px] font-medium text-slate-500">{label}</p><span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}><Icon className="size-4" /></span></div><div className="mt-3 flex items-end justify-between gap-2"><span className="text-[25px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{value}</span><span className="flex items-center gap-0.5 pb-1 text-right text-[9px] font-medium text-emerald-700 dark:text-emerald-400">{mode === "mock" && <ArrowUpRight className="size-3" />}{detail}</span></div></article>)}</section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
      <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Conversation volume</h2><p className="mt-1 text-[10px] text-slate-500">{mode === "live" ? "Live conversations by last activity · past 7 days" : "Sample conversations across the past week"}</p></div>{mode === "mock" && <button className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[9px] font-medium text-slate-500 dark:border-slate-800">This week <ArrowDownRight className="size-3" /></button>}</div>
        <div className="mt-5 flex h-[168px] items-end gap-2 border-b border-slate-100 pb-1 dark:border-slate-800 sm:gap-4">{mode === "mock" ? sampleVolume.map(({ day, current, previous }) => <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[130px] w-full max-w-[42px] items-end gap-1"><div style={{ height: `${current}%` }} className="w-1/2 rounded-t-[4px] bg-emerald-500" /><div style={{ height: `${previous}%` }} className="w-1/2 rounded-t-[4px] bg-emerald-200 dark:bg-emerald-900" /></div><span className="text-[9px] text-slate-400">{day}</span></div>) : liveDays.map(({ day, count }) => <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[130px] w-full max-w-[42px] items-end"><div style={{ height: `${count ? Math.max(6, count / maximumLiveVolume * 100) : 0}%` }} className="w-full rounded-t-[4px] bg-emerald-500" /></div><span className="text-[9px] text-slate-400">{day}</span></div>)}</div>
        <div className="mt-3 flex items-center gap-4"><span className="flex items-center gap-1.5 text-[9px] text-slate-500"><span className="size-2 rounded-sm bg-emerald-500" />{mode === "live" ? "Live conversations" : "This week"}</span>{mode === "mock" && <><span className="flex items-center gap-1.5 text-[9px] text-slate-500"><span className="size-2 rounded-sm bg-emerald-200 dark:bg-emerald-900" /> Last week</span><span className="ml-auto text-[9px] font-medium text-emerald-700 dark:text-emerald-400">+18.4% vs last week</span></>}</div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5"><div className="flex items-start justify-between"><div><h2 className="text-xs font-semibold text-slate-900 dark:text-white">By channel</h2><p className="mt-1 text-[10px] text-slate-500">Share of current conversations</p></div><button aria-label="View channel report" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowRight className="size-3.5" /></button></div><div className="mt-5 flex flex-col gap-4">{channelStats.map(({ channel, count, percent }) => <div key={channel}><div className="mb-1.5 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-300"><ChannelPill channel={channel} label={false} />{channelLabels[channel]}</span><span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300">{percent}% <span className="font-normal text-slate-400">({count})</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div style={{ width: `${percent}%` }} className={`h-full rounded-full ${channelColors[channel]}`} /></div></div>)}</div></article>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between px-4 py-4 sm:px-5"><div><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Recent conversations</h2><p className="mt-1 text-[10px] text-slate-500">The latest activity from your inbox</p></div><button onClick={onOpenInbox} className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">View inbox <ArrowRight className="size-3" /></button></div><div className="divide-y divide-slate-100 dark:divide-slate-900">{conversations.slice(0, 4).map((conversation) => { const person = contacts.find((item) => item.id === conversation.contactId); if (!person) return null; return <button onClick={onOpenInbox} key={conversation.id} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900/60 sm:px-5"><ContactAvatar contact={person} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200">{person.name}</span><span className="shrink-0 text-[9px] text-slate-400">{conversation.time} ago</span></div><p className="mt-0.5 truncate text-[10px] text-slate-500">{conversation.preview}</p></div><ChannelPill channel={conversation.channel} label={false} /></button>})}</div></article>
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between px-4 py-4 sm:px-5"><div><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Cases to follow up</h2><p className="mt-1 text-[10px] text-slate-500">Keep customer issues moving</p></div><button onClick={onOpenCases} className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">All cases <ArrowRight className="size-3" /></button></div><div className="divide-y divide-slate-100 dark:divide-slate-900">{openCases.slice(0, 4).map((item) => { const person = contacts.find((contact) => contact.id === item.contactId); return <button onClick={onOpenCases} key={item.id} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900/60 sm:px-5"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><Inbox className="size-3.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-800 dark:text-slate-200">{item.title}</p><p className="mt-0.5 truncate text-[9px] text-slate-500">{item.id} <span className="px-1 text-slate-300">·</span>{person?.name}</p></div><PriorityPill priority={item.priority} /></button>})}</div></article>
    </section>
  </div>
}
