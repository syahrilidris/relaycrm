"use client"

import { useMemo, useState } from "react"
import { CalendarClock, ChevronRight, Filter, Plus, Search, StickyNote, X } from "lucide-react"
import type { CaseStatus, Contact, Interaction, Priority, SupportCase } from "@/lib/crm-data"
import { channelLabels, formatDateTime } from "@/lib/crm-data"
import { ChannelPill, ContactAvatar, PageToolbar, PriorityPill, SelectMenu, toolbarButton, toolbarPrimary, type SelectMenuOption } from "./crm-primitives"

const statuses: CaseStatus[] = ["Open", "In Progress", "Waiting on Customer", "Resolved"]

const statusDot: Record<CaseStatus, string> = { Open: "bg-rose-400", "In Progress": "bg-sky-400", "Waiting on Customer": "bg-amber-400", Resolved: "bg-emerald-400" }
type StatusFilter = "all" | CaseStatus

export function CasesView({ cases, contacts, interactions, query, selectedCaseId, onSelectCase, onUpdateStatus, onUpdatePriority, onAddNote, onNewCase, onLogInteraction }: { cases: SupportCase[]; contacts: Contact[]; interactions: Interaction[]; query: string; selectedCaseId: string | null; onSelectCase: (id: string | null) => void; onUpdateStatus: (id: string, status: CaseStatus) => void; onUpdatePriority: (id: string, priority: Priority) => void; onAddNote: (id: string, note: string) => Promise<void>; onNewCase: () => void; onLogInteraction: () => void }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [localSearch, setLocalSearch] = useState("")
  const searched = useMemo(() => cases.filter((item) => {
    const person = contacts.find((contact) => contact.id === item.contactId)
    const text = `${item.id} ${item.title} ${person?.name} ${channelLabels[item.channel]} ${item.priority}`.toLowerCase()
    return text.includes(query.toLowerCase()) && text.includes(localSearch.toLowerCase())
  }), [cases, contacts, query, localSearch])
  const visibleStatuses = statusFilter === "all" ? statuses : [statusFilter]
  const openCount = cases.filter((item) => item.status !== "Resolved").length
  const statusOptions: SelectMenuOption<StatusFilter>[] = [
    { value: "all", label: "All statuses", icon: <Filter className="size-3.5" />, count: searched.length },
    ...statuses.map((status) => ({ value: status as StatusFilter, label: status, icon: <span className={`size-2 rounded-full ${statusDot[status]}`} />, count: searched.filter((item) => item.status === status).length })),
  ]
  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? null
  return <div className="flex min-h-0 flex-1 flex-col">
    <PageToolbar title="Cases" subtitle={`${openCount} open · ${cases.length} total across ${statuses.length} stages`}>
      <label className="flex h-9 w-[min(52vw,220px)] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-400 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950"><Search className="size-3.5 shrink-0" /><input aria-label="Search cases" placeholder="Search cases" value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" />{localSearch && <button onClick={() => setLocalSearch("")} aria-label="Clear search" className="rounded p-0.5 hover:text-slate-600"><X className="size-3.5" /></button>}</label>
      <SelectMenu label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} highlight={statusFilter !== "all"} />
      <button onClick={onLogInteraction} className={`${toolbarButton} hidden md:flex`}><CalendarClock className="size-3.5 text-indigo-600 dark:text-indigo-400" />Log interaction</button>
      <button onClick={onNewCase} className={toolbarPrimary}><Plus className="size-3.5" /><span className="hidden sm:inline">New case</span></button>
    </PageToolbar>
    <div className="min-h-0 flex-1 overflow-auto bg-[#F5F6FA] dark:bg-slate-900/40">
      <div className={`flex h-full gap-3 p-4 sm:p-5 ${statusFilter === "all" ? "min-w-max" : ""}`}>{visibleStatuses.map((status) => { const items = searched.filter((item) => item.status === status); return <section key={status} aria-label={`${status} cases`} className={`flex min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60 ${statusFilter === "all" ? "w-[290px] 2xl:w-[320px]" : "w-full max-w-[560px]"}`}>
        <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${statusDot[status]}`} /><h2 className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{status}</h2><span className="rounded bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 dark:bg-slate-800">{items.length}</span></div>{status === "Open" && <button onClick={onNewCase} aria-label="New case" title="New case" className="rounded p-1 text-slate-400 hover:bg-white dark:hover:bg-slate-800"><Plus className="size-3.5" /></button>}</div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">{items.map((item) => { const person = contacts.find((contact) => contact.id === item.contactId); return <button key={item.id} onClick={() => onSelectCase(item.id)} className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:border-indigo-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-400/30"><div className="flex items-center justify-between gap-2"><span className="text-[10.5px] font-semibold text-slate-400">{item.id}</span><PriorityPill priority={item.priority} /></div><h3 className="mt-1.5 text-[12.5px] font-semibold leading-snug text-slate-800 dark:text-slate-200">{item.title}</h3><div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800"><div className="flex min-w-0 items-center gap-1.5">{person && <ContactAvatar contact={person} size="sm" />}<div className="min-w-0"><p className="truncate text-[11.5px] font-medium text-slate-700 dark:text-slate-300">{person?.name ?? "Unknown contact"}</p><p className="text-[10.5px] text-slate-400">{item.updated}</p></div></div><ChannelPill channel={item.channel} label={false} /></div></button>})}{items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-[11px] text-slate-400 dark:border-slate-700">No cases in this stage.</p>}</div>
      </section>})}</div>
    </div>
    {selectedCase && <CaseDetailsDrawer key={selectedCase.id} item={selectedCase} contact={contacts.find((contact) => contact.id === selectedCase.contactId)} interactions={interactions.filter((interaction) => interaction.contactId === selectedCase.contactId)} onClose={() => onSelectCase(null)} onUpdateStatus={(status) => onUpdateStatus(selectedCase.id, status)} onUpdatePriority={(priority) => onUpdatePriority(selectedCase.id, priority)} onAddNote={(note) => onAddNote(selectedCase.id, note)} />}
  </div>
}

function CaseDetailsDrawer({ item, contact, interactions, onClose, onUpdateStatus, onUpdatePriority, onAddNote }: { item: SupportCase; contact?: Contact; interactions: Interaction[]; onClose: () => void; onUpdateStatus: (status: CaseStatus) => void; onUpdatePriority: (priority: Priority) => void; onAddNote: (note: string) => Promise<void> }) {
  const [addingNote, setAddingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState("")
  async function saveNote() {
    const note = noteDraft.trim()
    if (!note || savingNote) return
    setSavingNote(true)
    setNoteError("")
    try {
      await onAddNote(note)
      setNoteDraft("")
      setAddingNote(false)
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "The note could not be saved.")
    } finally {
      setSavingNote(false)
    }
  }
  return <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/25 backdrop-blur-[1px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="case-drawer-title" className="flex h-full w-full max-w-[450px] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><p className="text-[10.5px] font-semibold text-slate-400">Support case · {item.id}</p><h2 id="case-drawer-title" className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h2></div><button onClick={onClose} aria-label="Close case details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></div>
    <div className="p-5"><div className="flex flex-wrap items-center gap-2"><PriorityPill priority={item.priority} /><ChannelPill channel={item.channel} /><span className="text-[10.5px] text-slate-400">Updated {item.updated}</span></div><label className="mt-5 block"><span className="mb-1.5 block text-[10.5px] font-semibold tracking-wide text-slate-400">Case status</span><select value={item.status} onChange={(event) => onUpdateStatus(event.target.value as CaseStatus)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11.5px] font-medium text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label className="mt-3 block"><span className="mb-1.5 block text-[10.5px] font-semibold tracking-wide text-slate-400">Priority</span><select value={item.priority} onChange={(event) => onUpdatePriority(event.target.value as Priority)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11.5px] font-medium text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{(["High", "Medium", "Low"] as Priority[]).map((priority) => <option key={priority}>{priority}</option>)}</select></label>
      {contact && <div className="mt-5 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"><p className="mb-3 text-[10.5px] font-semibold tracking-wide text-slate-400">Associated contact</p><div className="flex items-center gap-2.5"><ContactAvatar contact={contact} size="sm" /><div><p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">{contact.name}</p><p className="mt-0.5 text-[10.5px] text-slate-500">{contact.company} · {contact.email}</p></div><ChevronRight className="ml-auto size-4 text-slate-400" /></div></div>}
      <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Case notes</h3>{!addingNote && <button onClick={() => setAddingNote(true)} className="flex items-center gap-1 text-[10.5px] font-medium text-indigo-700 dark:text-indigo-400"><Plus className="size-3" /> Add note</button>}</div>
        {addingNote && <div className="mb-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"><textarea autoFocus aria-label="New case note" rows={3} maxLength={2000} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add an update for this case…" className="w-full resize-y bg-transparent text-[11.5px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-300" />{noteError && <p role="alert" className="mt-1 text-[10.5px] text-rose-600">{noteError}</p>}<div className="mt-2 flex justify-end gap-2"><button onClick={() => { setAddingNote(false); setNoteDraft(""); setNoteError("") }} disabled={savingNote} className="rounded-md border border-slate-200 px-2.5 py-1 text-[10.5px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button><button onClick={() => void saveNote()} disabled={savingNote || !noteDraft.trim()} className="rounded-md bg-indigo-600 px-2.5 py-1 text-[10.5px] font-semibold text-white disabled:opacity-50">{savingNote ? "Saving…" : "Save note"}</button></div></div>}
        {item.notes.length ? <div className="flex flex-col gap-2.5">{item.notes.map((note, index) => <div key={`${item.id}-${index}`} className="flex gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 dark:bg-slate-800"><StickyNote className="size-3" /></span><p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">{note}</p></div>)}</div> : !addingNote && <p className="text-[11.5px] text-slate-500">No notes yet.</p>}</div>
      <div className="mt-6"><h3 className="mb-3 text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">Contact interaction history</h3>{interactions.length ? <div className="flex flex-col gap-2">{interactions.slice(0, 6).map((interaction) => <div key={interaction.id} className="flex gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-800"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[10.5px] font-semibold text-slate-500">{interaction.type}</span><span className="text-[10.5px] text-slate-400">{formatDateTime(interaction.date)}</span>{interaction.followUp && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">Follow-up</span>}</div><p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">{interaction.summary}</p></div></div>)}</div> : <p className="text-[11.5px] text-slate-500">No interactions logged for this contact yet.</p>}</div>
    </div><div className="mt-auto border-t border-slate-100 p-4 dark:border-slate-800"><button onClick={onClose} className="w-full rounded-lg border border-slate-200 py-2 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Close case</button></div></section></div>
}
