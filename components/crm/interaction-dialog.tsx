"use client"

import { useRef, useState } from "react"
import { CalendarClock, Check, ChevronDown, Phone, StickyNote, Video, X } from "lucide-react"
import type { Contact, InteractionType } from "@/lib/crm-data"

export function InteractionDialog({ open, contacts, defaultContactId, onClose, onSave }: { open: boolean; contacts: Contact[]; defaultContactId?: string; onClose: () => void; onSave: (interaction: { contactId: string; type: InteractionType; summary: string; occurredAt: string; followUp: boolean }) => Promise<void> }) {
  const [type, setType] = useState<InteractionType>("Call")
  const [contactId, setContactId] = useState(defaultContactId ?? contacts[0]?.id ?? "")
  const [summary, setSummary] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [followUp, setFollowUp] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [saveError, setSaveError] = useState("")
  if (!open) return null

  async function save() {
    if (!contactId || !summary.trim() || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSaveError("")
    try {
      await onSave({ contactId, type, summary: summary.trim(), occurredAt: new Date(date).toISOString(), followUp })
      setSummary("")
      setFollowUp(false)
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The interaction could not be saved.")
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save()
  }

  const types: { label: InteractionType; icon: typeof Phone }[] = [{ label: "Call", icon: Phone }, { label: "Meeting", icon: Video }, { label: "Note", icon: StickyNote }]
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="interaction-title" className="w-full max-w-[490px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><div className="mb-1 flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><CalendarClock className="size-4" /></div><h2 id="interaction-title" className="text-sm font-semibold text-slate-900 dark:text-white">Log an interaction</h2><p className="mt-1 text-[10px] text-slate-500">Keep a record of the moments that matter.</p></div><button onClick={onClose} aria-label="Close interaction form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></div>
    <form onSubmit={submit} className="p-5"><fieldset><legend className="mb-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300">Interaction type</legend><div className="grid grid-cols-3 gap-2">{types.map(({ label, icon: Icon }) => <button type="button" key={label} aria-pressed={type === label} onClick={() => setType(label)} className={`flex h-9 items-center justify-center gap-2 rounded-lg border text-[10px] font-medium transition ${type === label ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"}`}><Icon className="size-3.5" />{label}</button>)}</div></fieldset>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Contact</span><span className="relative block"><select required value={contactId} onChange={(event) => setContactId(event.target.value)} className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[10px] text-slate-700 outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.company}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-3 text-slate-400" /></span></label><label><span className="mb-1.5 block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Date &amp; time</span><input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" /></label></div>
      <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Summary / outcome</span><textarea required rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={type === "Call" ? "What did you discuss? Any next steps?" : type === "Meeting" ? "Add a brief meeting summary..." : "Write a note about this contact..."} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[10px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" /></label>
      <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800"><span><span className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Create a follow-up task</span><span className="mt-0.5 block text-[9px] text-slate-500">Add a reminder to circle back with this contact.</span></span><span className={`relative flex h-5 w-9 items-center rounded-full transition ${followUp ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}><input aria-label="Create a follow-up task" type="checkbox" checked={followUp} onChange={(event) => setFollowUp(event.target.checked)} className="peer sr-only" /><span className={`absolute left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${followUp ? "translate-x-4" : "translate-x-0"}`} /></span></label>
      {saveError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[10px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{saveError}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Cancel</button><button type="submit" onClick={(event) => { event.preventDefault(); void save() }} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><Check className="size-3.5" />{saving ? "Saving…" : "Save interaction"}</button></div>
    </form></section></div>
}
