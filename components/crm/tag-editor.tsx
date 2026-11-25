"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Plus, Tag, X } from "lucide-react"
import { SelectMenu, type SelectMenuOption } from "./crm-primitives"

/** Tag chips with a remove confirmation and an inline "add tag" input that suggests existing tags. */
export function TagEditor({ contactName, tags, allTags, onToggle }: { contactName: string; tags: string[]; allTags: string[]; onToggle: (tag: string) => Promise<void> }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const boxRef = useRef<HTMLDivElement>(null)
  const suggestions = allTags.filter((tag) => !tags.includes(tag) && tag.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)

  useEffect(() => {
    if (!confirming && !adding) return
    const close = (event: MouseEvent) => { if (!boxRef.current?.contains(event.target as Node)) { setConfirming(null); setAdding(false); setValue("") } }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [confirming, adding])

  async function run(tag: string) {
    setBusy(tag)
    setError("")
    try {
      await onToggle(tag)
      setConfirming(null)
      setAdding(false)
      setValue("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't update tags.")
    } finally {
      setBusy(null)
    }
  }

  function add(raw: string) {
    const tag = raw.trim().slice(0, 40)
    if (!tag) return
    const existing = tags.find((item) => item.toLowerCase() === tag.toLowerCase())
    if (existing) { setError(`"${existing}" is already added.`); return }
    // Reuse the existing spelling so filters stay tidy ("new lead" → "New lead").
    void run(allTags.find((item) => item.toLowerCase() === tag.toLowerCase()) ?? tag)
  }

  return <div ref={boxRef} className="relative">
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => <span key={tag} className={`inline-flex items-center gap-1 rounded-md py-1 pr-1 pl-2 text-[10.5px] font-medium ${confirming === tag ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
        {tag}
        <button type="button" onClick={() => { setAdding(false); setConfirming(confirming === tag ? null : tag) }} aria-label={`Remove tag ${tag}`} className="rounded p-0.5 opacity-60 hover:bg-rose-100 hover:text-rose-600 hover:opacity-100 dark:hover:bg-rose-400/20"><X className="size-2.5" /></button>
      </span>)}
      {!adding && <button type="button" onClick={() => { setConfirming(null); setAdding(true) }} className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-[10.5px] font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:hover:text-indigo-300"><Plus className="size-2.5" />Add tag</button>}
    </div>

    {confirming && <div role="alertdialog" aria-label="Remove tag" className="mt-2 rounded-lg border border-rose-200 bg-rose-50/60 p-2.5 dark:border-rose-400/30 dark:bg-rose-400/10">
      <p className="text-[11.5px] text-slate-700 dark:text-slate-200">Remove <b>{confirming}</b> from {contactName}?</p>
      <div className="mt-2 flex gap-1.5">
        <button type="button" autoFocus disabled={busy !== null} onClick={() => void run(confirming)} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy && <Loader2 className="size-3 animate-spin" />}Remove tag</button>
        <button type="button" onClick={() => setConfirming(null)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Keep</button>
      </div>
    </div>}

    {adding && <div className="mt-2">
      <div className="flex gap-1.5">
        <input autoFocus value={value} maxLength={40} placeholder="Tag name, e.g. VIP" onChange={(event) => { setValue(event.target.value); setError("") }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(value) } if (event.key === "Escape") { setAdding(false); setValue("") } }} className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11.5px] text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
        <button type="button" disabled={!value.trim() || busy !== null} onClick={() => add(value)} className="inline-flex h-8 items-center gap-1 rounded-md bg-indigo-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="size-3 animate-spin" />}Add</button>
      </div>
      {suggestions.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{suggestions.map((tag) => <button key={tag} type="button" onClick={() => add(tag)} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10.5px] font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-300">+ {tag}</button>)}</div>}
    </div>}
    {error && <p role="alert" className="mt-1.5 text-[11px] text-rose-600">{error}</p>}
  </div>
}

/** Every tag used across contacts, most used first. */
export function tagCounts(contacts: { tags: string[] }[]) {
  const counts = new Map<string, number>()
  contacts.forEach((contact) => contact.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)))
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export function TagFilterMenu({ value, onChange, tags }: { value: string; onChange: (value: string) => void; tags: [string, number][] }) {
  const options: SelectMenuOption<string>[] = [{ value: "all", label: "All tags", icon: <Tag className="size-3.5" /> }, ...tags.map(([tag, count]) => ({ value: tag, label: tag, icon: <Tag className="size-3.5" />, count }))]
  return <SelectMenu label="Filter by tag" value={value} onChange={onChange} options={options} highlight={value !== "all"} />
}

