"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CalendarClock, Check, ChevronRight, Filter, Flag, KanbanSquare, Pencil, Plus, Search, StickyNote, Trash2, X } from "lucide-react"
import type { CaseStatus, Contact, EscalationLevel, Interaction, Priority, SupportCase } from "@/lib/crm-data"
import { channelLabels, escalationLabels, formatDateTime } from "@/lib/crm-data"
import { ChannelPill, ContactAvatar, PageToolbar, PriorityPill, SelectMenu, Switch, toolbarButton, toolbarPrimary, type SelectMenuOption } from "./crm-primitives"

const statuses: CaseStatus[] = ["Open", "In Progress", "Waiting on Customer", "Resolved"]
const statusDot: Record<CaseStatus, string> = { Open: "bg-rose-400", "In Progress": "bg-sky-400", "Waiting on Customer": "bg-amber-400", Resolved: "bg-emerald-400" }
const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }
type StatusFilter = "all" | CaseStatus

function escalationOf(item: SupportCase): EscalationLevel {
  return item.escalation ?? 0
}

/** Escalated first (highest level on top), then by priority. */
function boardOrder(a: SupportCase, b: SupportCase) {
  return escalationOf(b) - escalationOf(a) || priorityRank[a.priority] - priorityRank[b.priority]
}

function sinceLabel(iso?: string | null) {
  if (!iso) return ""
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (Number.isNaN(minutes)) return ""
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}

export function EscalationBadge({ item, compact = false }: { item: SupportCase; compact?: boolean }) {
  const level = escalationOf(item)
  if (!level) return null
  return <span title={item.escalationReason ?? undefined} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${level === 2 ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20"}`}><Flag className="size-3" />{compact ? escalationLabels[level].short : `Escalated · ${escalationLabels[level].short}`}</span>
}

export function CasesView({ cases, contacts, query, onSelectCase, onNewCase, onLogInteraction }: { cases: SupportCase[]; contacts: Contact[]; query: string; onSelectCase: (id: string) => void; onNewCase: () => void; onLogInteraction: () => void }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [escalatedOnly, setEscalatedOnly] = useState(false)
  const [localSearch, setLocalSearch] = useState("")
  const searched = useMemo(() => cases.filter((item) => {
    const person = contacts.find((contact) => contact.id === item.contactId)
    const text = `${item.id} ${item.title} ${person?.name} ${channelLabels[item.channel]} ${item.priority} ${item.escalationReason ?? ""}`.toLowerCase()
    return text.includes(query.toLowerCase()) && text.includes(localSearch.toLowerCase()) && (!escalatedOnly || escalationOf(item) > 0)
  }).sort(boardOrder), [cases, contacts, query, localSearch, escalatedOnly])
  const visibleStatuses = statusFilter === "all" ? statuses : [statusFilter]
  const openCount = cases.filter((item) => item.status !== "Resolved").length
  const escalatedCount = cases.filter((item) => escalationOf(item) > 0 && item.status !== "Resolved").length
  const statusOptions: SelectMenuOption<StatusFilter>[] = [
    { value: "all", label: "All statuses", icon: <Filter className="size-3.5" />, count: searched.length },
    ...statuses.map((status) => ({ value: status as StatusFilter, label: status, icon: <span className={`size-2 rounded-full ${statusDot[status]}`} />, count: searched.filter((item) => item.status === status).length })),
  ]
  return <div className="flex min-h-0 flex-1 flex-col">
    <PageToolbar title="Cases" subtitle={<>{openCount} open · {cases.length} total{escalatedCount > 0 && <> · <button onClick={() => setEscalatedOnly(true)} className="font-semibold text-rose-600 hover:underline dark:text-rose-300">{escalatedCount} escalated</button></>}</>}>
      <label className="flex h-9 w-[min(52vw,220px)] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-400 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950"><Search className="size-3.5 shrink-0" /><input aria-label="Search cases" placeholder="Search cases" value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" />{localSearch && <button onClick={() => setLocalSearch("")} aria-label="Clear search" className="rounded p-0.5 hover:text-slate-600"><X className="size-3.5" /></button>}</label>
      <SelectMenu label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} highlight={statusFilter !== "all" || escalatedOnly}
        footer={<button onClick={() => setEscalatedOnly(!escalatedOnly)} role="switch" aria-checked={escalatedOnly} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><span className="flex items-center gap-2"><Flag className="size-3.5 text-rose-500" />Escalated only</span><Switch on={escalatedOnly} /></button>} />
      <button onClick={onLogInteraction} className={`${toolbarButton} hidden md:flex`}><CalendarClock className="size-3.5 text-indigo-600 dark:text-indigo-400" />Log interaction</button>
      <button onClick={onNewCase} className={toolbarPrimary}><Plus className="size-3.5" /><span className="hidden sm:inline">New case</span></button>
    </PageToolbar>
    {escalatedOnly && <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-4 py-2 text-[12px] text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200 sm:px-6"><span className="flex items-center gap-2"><Flag className="size-3.5" />Showing escalated cases only</span><button onClick={() => setEscalatedOnly(false)} className="font-semibold hover:underline">Show all</button></div>}
    <div className="min-h-0 flex-1 overflow-auto bg-[#F5F6FA] dark:bg-slate-900/40">
      <div className={`flex h-full gap-3 p-4 sm:p-5 ${statusFilter === "all" ? "min-w-max" : ""}`}>{visibleStatuses.map((status) => { const items = searched.filter((item) => item.status === status); return <section key={status} aria-label={`${status} cases`} className={`flex min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60 ${statusFilter === "all" ? "w-[290px] 2xl:w-[320px]" : "w-full max-w-[560px]"}`}>
        <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${statusDot[status]}`} /><h2 className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{status}</h2><span className="rounded bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 dark:bg-slate-800">{items.length}</span></div>{status === "Open" && <button onClick={onNewCase} aria-label="New case" title="New case" className="rounded p-1 text-slate-400 hover:bg-white dark:hover:bg-slate-800"><Plus className="size-3.5" /></button>}</div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">{items.map((item) => <CaseCard key={item.id} item={item} person={contacts.find((contact) => contact.id === item.contactId)} onOpen={() => onSelectCase(item.id)} />)}{items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-[11px] text-slate-400 dark:border-slate-700">No cases in this stage.</p>}</div>
      </section>})}</div>
    </div>
  </div>
}

function CaseCard({ item, person, onOpen }: { item: SupportCase; person?: Contact; onOpen: () => void }) {
  const level = escalationOf(item)
  return <button onClick={onOpen} className={`relative overflow-hidden rounded-lg border bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:shadow-sm dark:bg-slate-950 ${level ? "border-rose-200 hover:border-rose-300 dark:border-rose-400/30" : "border-slate-200 hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-400/30"}`}>
    {level > 0 && <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${level === 2 ? "bg-rose-600" : "bg-rose-400"}`} />}
    <div className="flex items-center justify-between gap-2"><span className="text-[10.5px] font-semibold text-slate-400">{item.id}</span><div className="flex items-center gap-1"><EscalationBadge item={item} compact /><PriorityPill priority={item.priority} /></div></div>
    <h3 className="mt-1.5 text-[12.5px] font-semibold leading-snug text-slate-800 dark:text-slate-200">{item.title}</h3>
    {level > 0 && item.escalationReason && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-rose-700/90 dark:text-rose-300/90">{item.escalationReason}</p>}
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800"><div className="flex min-w-0 items-center gap-1.5">{person && <ContactAvatar contact={person} size="sm" />}<div className="min-w-0"><p className="truncate text-[11.5px] font-medium text-slate-700 dark:text-slate-300">{person?.name ?? "Unknown contact"}</p><p className="text-[10.5px] text-slate-400">{item.updated}</p></div></div><ChannelPill channel={item.channel} label={false} /></div>
  </button>
}

export type CaseDrawerActions = {
  onUpdateStatus: (status: CaseStatus) => void
  onUpdatePriority: (priority: Priority) => void
  onAddNote: (note: string) => Promise<void>
  onUpdateTitle: (title: string) => Promise<void>
  onEscalate: (level: EscalationLevel, reason?: string) => Promise<void>
  onDelete: () => Promise<void>
  onOpenContact?: () => void
  /** Shown when the case was opened from another page. */
  onViewBoard?: () => void
}

export function CaseDetailsDrawer({ item, contact, interactions, onClose, actions }: { item: SupportCase; contact?: Contact; interactions: Interaction[]; onClose: () => void; actions: CaseDrawerActions }) {
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(item.title)
  const [escalating, setEscalating] = useState<EscalationLevel | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState("")
  const [actionError, setActionError] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const level = escalationOf(item)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, onClose])

  async function run(label: string, task: () => Promise<void>, fallback: string) {
    setBusy(label)
    setActionError("")
    try { await task(); return true } catch (error) { setActionError(error instanceof Error ? error.message : fallback); return false } finally { setBusy("") }
  }

  async function saveNote() {
    const note = noteDraft.trim()
    if (!note || savingNote) return
    setSavingNote(true)
    setNoteError("")
    try {
      await actions.onAddNote(note)
      setNoteDraft("")
      setAddingNote(false)
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "The note could not be saved.")
    } finally {
      setSavingNote(false)
    }
  }

  async function saveTitle() {
    const title = titleDraft.trim()
    if (!title || title === item.title) { setEditingTitle(false); setTitleDraft(item.title); return }
    if (await run("title", () => actions.onUpdateTitle(title), "The title could not be saved.")) setEditingTitle(false)
  }

  async function confirmEscalation() {
    if (escalating === null) return
    const text = reason.trim()
    if (escalating > 0 && !text) { setActionError("Add a short reason so the next person knows why."); return }
    if (await run("escalate", () => actions.onEscalate(escalating, text || undefined), "The escalation could not be saved.")) { setEscalating(null); setReason("") }
  }

  return <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/25 backdrop-blur-[1px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="case-drawer-title" className="flex h-full w-full max-w-[470px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-400">Support case · {item.id}{actions.onViewBoard && <button onClick={actions.onViewBoard} className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline dark:text-indigo-300"><KanbanSquare className="size-3" />View on board</button>}</p>
        {editingTitle ? <form onSubmit={(event) => { event.preventDefault(); void saveTitle() }} className="mt-1 flex items-center gap-1.5"><input autoFocus aria-label="Case title" maxLength={160} value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setEditingTitle(false); setTitleDraft(item.title) } }} className="h-8 min-w-0 flex-1 rounded-lg border border-indigo-300 px-2 text-[13px] font-semibold text-slate-900 outline-none ring-2 ring-indigo-500/10 dark:bg-slate-900 dark:text-white" /><button type="submit" disabled={busy === "title"} aria-label="Save title" className="rounded-lg bg-indigo-600 p-1.5 text-white disabled:opacity-50"><Check className="size-3.5" /></button></form>
          : <button onClick={() => { setTitleDraft(item.title); setEditingTitle(true) }} className="group mt-1 flex items-start gap-1.5 text-left"><h2 id="case-drawer-title" className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h2><Pencil className="mt-0.5 size-3 shrink-0 text-slate-300 group-hover:text-indigo-500" aria-label="Edit title" /></button>}
      </div>
      <button ref={closeRef} onClick={onClose} aria-label="Close case details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="flex flex-wrap items-center gap-2"><EscalationBadge item={item} /><PriorityPill priority={item.priority} /><ChannelPill channel={item.channel} /><span className="text-[10.5px] text-slate-400">Updated {item.updated}</span></div>

      {/* Escalation */}
      {level > 0 && escalating === null && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-400/20 dark:bg-rose-400/10">
        <div className="flex items-start gap-2.5"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-300" /><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-rose-900 dark:text-rose-100">Escalated to {escalationLabels[level as 1 | 2].long}</p>{item.escalationReason && <p className="mt-0.5 text-[11.5px] leading-relaxed text-rose-800/90 dark:text-rose-200/90">{item.escalationReason}</p>}{item.escalatedAt && <p className="mt-1 text-[10.5px] text-rose-700/70 dark:text-rose-300/70">{sinceLabel(item.escalatedAt)}</p>}</div></div>
        <div className="mt-3 flex flex-wrap gap-2">{level === 1 && <button onClick={() => { setEscalating(2); setReason(""); setActionError("") }} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-rose-700"><ArrowUpCircle className="size-3.5" />Raise to Manager</button>}<button onClick={() => { setEscalating(0); setReason(""); setActionError("") }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:bg-transparent dark:text-rose-200"><ArrowDownCircle className="size-3.5" />De-escalate</button></div>
      </div>}
      {level === 0 && escalating === null && <button onClick={() => { setEscalating(1); setReason(""); setActionError("") }} className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-rose-300 px-3.5 py-3 text-left transition hover:border-rose-400 hover:bg-rose-50/60 dark:border-rose-400/30 dark:hover:bg-rose-400/5"><Flag className="size-4 text-rose-500" /><span className="flex-1"><span className="block text-[12px] font-semibold text-slate-800 dark:text-slate-200">Escalate this case</span><span className="block text-[11px] text-slate-500">Flag it for senior staff or a manager. Priority is set to High.</span></span><ChevronRight className="size-4 text-slate-400" /></button>}
      {escalating !== null && <div className="mt-4 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
        <p className="text-[12px] font-semibold text-slate-900 dark:text-white">{escalating === 0 ? "De-escalate case" : "Escalate case"}</p>
        {escalating > 0 && <div className="mt-2.5 grid grid-cols-2 gap-2">{([1, 2] as const).map((option) => <button key={option} onClick={() => setEscalating(option)} aria-pressed={escalating === option} className={`rounded-lg border px-2.5 py-2 text-left text-[11.5px] transition ${escalating === option ? "border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-400/50 dark:bg-rose-400/10 dark:text-rose-100" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"}`}><span className="block font-semibold">{escalationLabels[option].short}</span><span className="block text-[10.5px] opacity-80">{option === 1 ? "Senior staff" : "Manager"}</span></button>)}</div>}
        <label className="mt-2.5 block"><span className="mb-1 block text-[10.5px] font-semibold text-slate-500">{escalating === 0 ? "Note (optional)" : "Reason"}</span><textarea autoFocus rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={escalating === 0 ? "e.g. Fixed after the senior team stepped in" : "e.g. Customer waiting 3 days, threatening refund"} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" /></label>
        <div className="mt-2.5 flex justify-end gap-2"><button onClick={() => { setEscalating(null); setActionError("") }} disabled={busy === "escalate"} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11.5px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button><button onClick={() => void confirmEscalation()} disabled={busy === "escalate"} className={`rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60 ${escalating === 0 ? "bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900" : "bg-rose-600 hover:bg-rose-700"}`}>{busy === "escalate" ? "Saving…" : escalating === 0 ? "De-escalate" : `Escalate to ${escalationLabels[escalating].short}`}</button></div>
      </div>}
      {actionError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{actionError}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="block"><span className="mb-1.5 block text-[10.5px] font-semibold tracking-wide text-slate-400">Status</span><select value={item.status} onChange={(event) => actions.onUpdateStatus(event.target.value as CaseStatus)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-[10.5px] font-semibold tracking-wide text-slate-400">Priority</span><select value={item.priority} onChange={(event) => actions.onUpdatePriority(event.target.value as Priority)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{(["High", "Medium", "Low"] as Priority[]).map((priority) => <option key={priority}>{priority}</option>)}</select></label>
      </div>

      {contact && <button onClick={actions.onOpenContact} disabled={!actions.onOpenContact} className="mt-5 flex w-full items-center gap-2.5 rounded-xl border border-slate-200 p-3.5 text-left transition enabled:hover:border-indigo-200 enabled:hover:bg-indigo-50/30 dark:border-slate-800"><ContactAvatar contact={contact} size="sm" /><div className="min-w-0 flex-1"><p className="text-[10.5px] font-semibold tracking-wide text-slate-400">Customer</p><p className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-200">{contact.name}</p><p className="truncate text-[10.5px] text-slate-500">{[contact.company, contact.email || contact.phone].filter(Boolean).join(" · ")}</p></div>{actions.onOpenContact && <ChevronRight className="size-4 text-slate-400" />}</button>}

      <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">Notes &amp; activity</h3>{!addingNote && <button onClick={() => setAddingNote(true)} className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400"><Plus className="size-3" /> Add note</button>}</div>
        {addingNote && <div className="mb-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"><textarea autoFocus aria-label="New case note" rows={3} maxLength={2000} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add an update for this case…" className="w-full resize-y bg-transparent text-[12px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-300" />{noteError && <p role="alert" className="mt-1 text-[10.5px] text-rose-600">{noteError}</p>}<div className="mt-2 flex justify-end gap-2"><button onClick={() => { setAddingNote(false); setNoteDraft(""); setNoteError("") }} disabled={savingNote} className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button><button onClick={() => void saveNote()} disabled={savingNote || !noteDraft.trim()} className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50">{savingNote ? "Saving…" : "Save note"}</button></div></div>}
        {item.notes.length ? <div className="flex flex-col gap-2">{[...item.notes].reverse().map((note, index) => { const system = /^(Escalated|De-escalated|Lowered) /.test(note); return <div key={`${item.id}-${index}`} className={`flex gap-2.5 rounded-lg p-3 ${system ? "border border-rose-100 bg-rose-50/60 dark:border-rose-400/15 dark:bg-rose-400/5" : "bg-slate-50 dark:bg-slate-900"}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${system ? "bg-white text-rose-500 dark:bg-slate-900" : "bg-white text-slate-500 dark:bg-slate-800"}`}>{system ? <Flag className="size-3" /> : <StickyNote className="size-3" />}</span><p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{note}</p></div>})}</div> : !addingNote && <p className="text-[12px] text-slate-500">No notes yet.</p>}</div>

      <div className="mt-6"><h3 className="mb-3 text-[12px] font-semibold text-slate-800 dark:text-slate-200">Customer interaction history</h3>{interactions.length ? <div className="flex flex-col gap-2">{interactions.slice(0, 6).map((interaction) => <div key={interaction.id} className="flex gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-800"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[10.5px] font-semibold text-slate-500">{interaction.type}</span><span className="text-[10.5px] text-slate-400">{formatDateTime(interaction.date)}</span>{interaction.followUp && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">Follow-up</span>}</div><p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{interaction.summary}</p></div></div>)}</div> : <p className="text-[12px] text-slate-500">No interactions logged for this customer yet.</p>}</div>
    </div>

    <div className="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
      {confirmingDelete ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-400/20 dark:bg-rose-400/10"><p className="text-[12px] leading-relaxed text-rose-800 dark:text-rose-200">Delete <span className="font-semibold">{item.id}</span> and its notes? This can’t be undone. The customer and their conversation are kept.</p><div className="mt-2 flex justify-end gap-2"><button onClick={() => setConfirmingDelete(false)} disabled={busy === "delete"} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Keep case</button><button onClick={() => void run("delete", actions.onDelete, "The case could not be deleted.")} disabled={busy === "delete"} className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy === "delete" ? "Deleting…" : "Delete case"}</button></div></div>
        : <div className="flex gap-2"><button onClick={() => setConfirmingDelete(true)} className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-[11.5px] font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-400/10"><Trash2 className="size-3.5" /> Delete</button><button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Done</button></div>}
    </div>
  </section></div>
}
