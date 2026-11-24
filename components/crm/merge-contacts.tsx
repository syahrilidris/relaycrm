"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, Combine, Search, Users, X } from "lucide-react"
import type { Channel, Contact, Conversation, DuplicatePair, SupportCase } from "@/lib/crm-data"
import { channelLabels, findDuplicatePairs } from "@/lib/crm-data"
import { ChannelPill, ContactAvatar } from "./crm-primitives"

const DISMISSED_KEY = "bintang:not-duplicates"

/** Channels a contact has actually talked to you on, from their conversations (plus their primary channel). */
export function contactChannels(contact: Contact, conversations: Conversation[]): Channel[] {
  const channels = new Set<Channel>(conversations.filter((item) => item.contactId === contact.id).map((item) => item.channel))
  if (!channels.size) channels.add(contact.channel)
  return [...channels]
}

/** Possible duplicates, minus pairs the user said are different people (remembered in this browser). */
export function useDuplicatePairs(contacts: Contact[]) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  useEffect(() => {
    try { setDismissed(new Set(JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[])) } catch { /* ignore */ }
  }, [])
  const pairs = useMemo(() => findDuplicatePairs(contacts, dismissed), [contacts, dismissed])
  const dismiss = useCallback((key: string) => {
    setDismissed((current) => {
      const next = new Set(current).add(key)
      try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [])
  return { pairs, dismiss }
}

function Overlay({ children, onClose, busy }: { children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, onClose])
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>{children}</div>
}

function Summary({ contact, conversations, cases, selected, onSelect }: { contact: Contact; conversations: Conversation[]; cases: SupportCase[]; selected: boolean; onSelect: () => void }) {
  const chats = conversations.filter((item) => item.contactId === contact.id).length
  const caseCount = cases.filter((item) => item.contactId === contact.id).length
  return <button onClick={onSelect} aria-pressed={selected} className={`relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition ${selected ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500/15 dark:border-indigo-400/50 dark:bg-indigo-400/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}>
    <span className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border ${selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>{selected && <Check className="size-3" />}</span>
    <div className="flex items-center gap-2.5 pr-6"><ContactAvatar contact={contact} size="sm" /><div className="min-w-0"><p className="truncate text-[12.5px] font-semibold text-slate-900 dark:text-white">{contact.name}</p><p className="truncate text-[10.5px] text-slate-500">{contact.company || contact.handle || "—"}</p></div></div>
    <div className="flex flex-wrap gap-1"><ChannelPill channel={contact.channel} /></div>
    <dl className="grid grid-cols-[52px_1fr] gap-x-2 gap-y-0.5 text-[11px]"><dt className="text-slate-400">Phone</dt><dd className="truncate text-slate-700 dark:text-slate-300">{contact.phone || "—"}</dd><dt className="text-slate-400">Email</dt><dd className="truncate text-slate-700 dark:text-slate-300">{contact.email || "—"}</dd><dt className="text-slate-400">History</dt><dd className="text-slate-700 dark:text-slate-300">{chats} {chats === 1 ? "chat" : "chats"} · {caseCount} {caseCount === 1 ? "case" : "cases"}</dd></dl>
    {selected && <span className="text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300">Keep this contact</span>}
  </button>
}

/** Pick the duplicate (if not given), choose which record to keep, then merge. */
export function MergeContactsDialog({ contacts, conversations, cases, firstId, secondId, onClose, onMerge }: {
  contacts: Contact[]
  conversations: Conversation[]
  cases: SupportCase[]
  firstId: string
  secondId?: string
  onClose: () => void
  onMerge: (primaryId: string, duplicateId: string) => Promise<void>
}) {
  const first = contacts.find((item) => item.id === firstId)
  const [otherId, setOtherId] = useState(secondId ?? "")
  const [keepId, setKeepId] = useState(firstId)
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const other = contacts.find((item) => item.id === otherId)
  const candidates = contacts.filter((item) => item.id !== firstId && `${item.name} ${item.phone} ${item.email} ${item.handle} ${channelLabels[item.channel]}`.toLowerCase().includes(query.toLowerCase()))
  if (!first) return null
  const keep = keepId === first.id ? first : other
  const drop = keepId === first.id ? other : first

  async function merge() {
    if (!keep || !drop) return
    setBusy(true)
    setError("")
    try { await onMerge(keep.id, drop.id); onClose() } catch (caught) { setError(caught instanceof Error ? caught.message : "The contacts could not be merged.") } finally { setBusy(false) }
  }

  return <Overlay onClose={onClose} busy={busy}><section role="dialog" aria-modal="true" aria-labelledby="merge-title" className="flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"><Combine className="size-4" /></span><div><h2 id="merge-title" className="text-[14px] font-semibold text-slate-900 dark:text-white">Merge contacts</h2><p className="mt-0.5 text-[11.5px] text-slate-500">Same person on different channels? Combine them into one contact.</p></div></div><button onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></div>

    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      {!other ? <>
        <p className="mb-2 text-[12px] font-semibold text-slate-800 dark:text-slate-200">Which contact is also {first.name}?</p>
        <label className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-slate-400 focus-within:border-indigo-300 dark:border-slate-700"><Search className="size-3.5" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, phone, email or handle" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" /></label>
        <div className="flex max-h-[320px] flex-col overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">{candidates.length ? candidates.map((item) => <button key={item.id} onClick={() => setOtherId(item.id)} className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><ContactAvatar contact={item} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">{item.name}</p><p className="truncate text-[10.5px] text-slate-500">{[item.phone, item.email, item.handle].filter(Boolean).join(" · ") || "No details"}</p></div><ChannelPill channel={item.channel} label={false} /></button>) : <p className="px-3 py-6 text-center text-[12px] text-slate-500">No other contacts match.</p>}</div>
      </> : <>
        <p className="mb-2 text-[12px] font-semibold text-slate-800 dark:text-slate-200">Which record should we keep?</p>
        <div className="grid gap-3 sm:grid-cols-2"><Summary contact={first} conversations={conversations} cases={cases} selected={keepId === first.id} onSelect={() => setKeepId(first.id)} /><Summary contact={other} conversations={conversations} cases={cases} selected={keepId === other.id} onSelect={() => setKeepId(other.id)} /></div>
        {keep && drop && <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-[11.5px] leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">{drop.name} <ArrowRight className="size-3" /> {keep.name}</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4"><li>All chats, cases and logged interactions move to <span className="font-semibold">{keep.name}</span>. Replies still go out on the channel each chat came from.</li><li>Future messages from either channel land on this one contact.</li><li>Empty phone, email or company fields are filled in from the other record, and tags are combined.</li><li>The other record is removed. This can’t be undone.</li></ul>
        </div>}
        {!secondId && <button onClick={() => { setOtherId(""); setKeepId(first.id) }} className="mt-3 text-[11.5px] font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Choose a different contact</button>}
      </>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
    </div>

    <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800"><button onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button><button onClick={() => void merge()} disabled={!other || busy} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Combine className="size-3.5" />{busy ? "Merging…" : "Merge into one contact"}</button></div>
  </section></Overlay>
}

/** List of suggested duplicates with Merge / Not the same. */
export function DuplicatesDialog({ pairs, conversations, onReview, onDismiss, onClose }: { pairs: DuplicatePair[]; conversations: Conversation[]; onReview: (pair: DuplicatePair) => void; onDismiss: (key: string) => void; onClose: () => void }) {
  return <Overlay onClose={onClose}><section role="dialog" aria-modal="true" aria-labelledby="dupes-title" className="flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"><Users className="size-4" /></span><div><h2 id="dupes-title" className="text-[14px] font-semibold text-slate-900 dark:text-white">Possible duplicates</h2><p className="mt-0.5 text-[11.5px] text-slate-500">These look like the same person. Nothing is merged until you confirm.</p></div></div><button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">{pairs.length ? pairs.map((pair) => <div key={pair.key} className="mb-2 rounded-xl border border-slate-200 p-3 last:mb-0 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2"><span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">{pair.reason}</span></div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">{[pair.a, pair.b].map((person, index) => <div key={person.id} className={`flex min-w-0 items-center gap-2 ${index === 1 ? "col-start-3" : ""}`}><ContactAvatar contact={person} size="sm" /><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-200">{person.name}</p><div className="mt-0.5 flex flex-wrap gap-1">{contactChannels(person, conversations).map((channel) => <ChannelPill key={channel} channel={channel} label={false} />)}</div></div></div>).reduce<React.ReactNode[]>((all, node, index) => index === 0 ? [node, <Combine key="icon" className="size-4 text-slate-300" />] : [...all, node], [])}</div>
      <div className="mt-3 flex justify-end gap-2"><button onClick={() => onDismiss(pair.key)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Not the same person</button><button onClick={() => onReview(pair)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-indigo-700"><Combine className="size-3.5" />Review &amp; merge</button></div>
    </div>) : <p className="px-4 py-10 text-center text-[12.5px] text-slate-500">No possible duplicates. Every contact looks unique.</p>}</div>
  </section></Overlay>
}
