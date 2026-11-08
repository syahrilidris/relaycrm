"use client"

import { useRef, useState, type ReactNode } from "react"
import { Briefcase, Check, ChevronDown, MessageSquarePlus, UserPlus, X } from "lucide-react"
import { channelLabels, type Channel, type Contact, type ContactInput, type Priority } from "@/lib/crm-data"

const inputClass = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
const labelClass = "mb-1.5 block text-[10px] font-semibold text-slate-700 dark:text-slate-300"
const channels = Object.keys(channelLabels) as Channel[]
const priorities: Priority[] = ["High", "Medium", "Low"]

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function useSaving() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const savingRef = useRef(false)
  async function run(action: () => Promise<void>, fallback: string) {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError("")
    try {
      await action()
    } catch (caught) {
      setError(errorMessage(caught, fallback))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  return { saving, error, setError, run }
}

function Modal({ titleId, title, description, icon, onClose, children }: { titleId: string; title: string; description: string; icon: ReactNode; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[calc(100vh-32px)] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><div className="mb-1 flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{icon}</div><h2 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-[10px] text-slate-500">{description}</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button></div>
      {children}
    </section>
  </div>
}

function FormFooter({ saving, error, label, onClose }: { saving: boolean; error: string; label: string; onClose: () => void }) {
  return <>
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[10px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><Check className="size-3.5" />{saving ? "Saving…" : label}</button></div>
  </>
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className={labelClass}>{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} appearance-none pr-8`}>{children}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-3 text-slate-400" /></span></label>
}

export function ContactDialog({ contact, onClose, onSave }: { contact?: Contact | null; onClose: () => void; onSave: (input: ContactInput) => Promise<void> }) {
  const [form, setForm] = useState({
    name: contact?.name ?? "",
    company: contact?.company ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    channel: contact?.channel ?? ("email" as Channel),
    handle: contact?.handle ?? "",
    tags: contact?.tags.join(", ") ?? "",
  })
  const { saving, error, setError, run } = useSaving()
  const update = (field: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [field]: value }))

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) { setError("Enter the contact's name."); return }
    void run(async () => {
      await onSave({ ...form, name: form.name.trim(), tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) })
      onClose()
    }, "The contact could not be saved.")
  }

  return <Modal titleId="contact-dialog-title" title={contact ? "Edit contact" : "Add a contact"} description={contact ? "Update this customer's details." : "Create a customer record you can link cases, conversations and interactions to."} icon={<UserPlus className="size-4" />} onClose={onClose}>
    <form onSubmit={submit} className="p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={labelClass}>Full name *</span><input autoFocus required maxLength={120} value={form.name} onChange={(event) => update("name")(event.target.value)} placeholder="e.g. Aisha Rahman" className={inputClass} /></label>
        <label><span className={labelClass}>Company</span><input maxLength={120} value={form.company} onChange={(event) => update("company")(event.target.value)} className={inputClass} /></label>
        <label><span className={labelClass}>Email</span><input type="email" maxLength={160} value={form.email} onChange={(event) => update("email")(event.target.value)} className={inputClass} /></label>
        <label><span className={labelClass}>Phone</span><input type="tel" maxLength={40} value={form.phone} onChange={(event) => update("phone")(event.target.value)} className={inputClass} /></label>
        <SelectField label="Primary channel" value={form.channel} onChange={(value) => update("channel")(value)}>{channels.map((channel) => <option key={channel} value={channel}>{channelLabels[channel]}</option>)}</SelectField>
        <label><span className={labelClass}>Channel handle</span><input maxLength={120} value={form.handle} onChange={(event) => update("handle")(event.target.value)} placeholder="@handle, number or address" className={inputClass} /></label>
        <label><span className={labelClass}>Tags</span><input value={form.tags} onChange={(event) => update("tags")(event.target.value)} placeholder="VIP, Wholesale" className={inputClass} /></label>
      </div>
      <FormFooter saving={saving} error={error} label={contact ? "Save changes" : "Add contact"} onClose={onClose} />
    </form>
  </Modal>
}

export function CaseDialog({ contacts, defaultContactId, onClose, onSave }: { contacts: Contact[]; defaultContactId?: string; onClose: () => void; onSave: (input: { contactId: string; title: string; channel: Channel; priority: Priority; note?: string }) => Promise<void> }) {
  const initialContact = contacts.find((item) => item.id === defaultContactId) ?? contacts[0]
  const [contactId, setContactId] = useState(initialContact?.id ?? "")
  const [channel, setChannel] = useState<Channel>(initialContact?.channel ?? "email")
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Priority>("Medium")
  const [note, setNote] = useState("")
  const { saving, error, setError, run } = useSaving()

  function chooseContact(id: string) {
    setContactId(id)
    const next = contacts.find((item) => item.id === id)
    if (next) setChannel(next.channel)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!contactId) { setError("Add a contact first, then open cases for them."); return }
    if (!title.trim()) { setError("Give the case a short title."); return }
    void run(async () => {
      await onSave({ contactId, title: title.trim(), channel, priority, ...(note.trim() ? { note: note.trim() } : {}) })
      onClose()
    }, "The case could not be created.")
  }

  return <Modal titleId="case-dialog-title" title="New case" description="Track a customer issue from first report to resolution." icon={<Briefcase className="size-4" />} onClose={onClose}>
    <form onSubmit={submit} className="p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={labelClass}>Title *</span><input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Refund for damaged order #1042" className={inputClass} /></label>
        <SelectField label="Contact *" value={contactId} onChange={chooseContact}>{contacts.length === 0 && <option value="">No contacts yet</option>}{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.company ? ` · ${contact.company}` : ""}</option>)}</SelectField>
        <SelectField label="Channel" value={channel} onChange={(value) => setChannel(value as Channel)}>{channels.map((item) => <option key={item} value={item}>{channelLabels[item]}</option>)}</SelectField>
        <SelectField label="Priority" value={priority} onChange={(value) => setPriority(value as Priority)}>{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <label className="sm:col-span-2"><span className={labelClass}>First note</span><textarea rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What's the issue? Any context for whoever picks this up?" className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[10px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" /></label>
      </div>
      <FormFooter saving={saving} error={error} label="Create case" onClose={onClose} />
    </form>
  </Modal>
}

export function ConversationDialog({ contacts, defaultContactId, onClose, onSave }: { contacts: Contact[]; defaultContactId?: string; onClose: () => void; onSave: (input: { contactId: string; channel: Channel; text: string }) => Promise<void> }) {
  const initialContact = contacts.find((item) => item.id === defaultContactId) ?? contacts[0]
  const [contactId, setContactId] = useState(initialContact?.id ?? "")
  const [channel, setChannel] = useState<Channel>(initialContact?.channel ?? "email")
  const [text, setText] = useState("")
  const { saving, error, setError, run } = useSaving()

  function chooseContact(id: string) {
    setContactId(id)
    const next = contacts.find((item) => item.id === id)
    if (next) setChannel(next.channel)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!contactId) { setError("Add a contact first, then start a conversation with them."); return }
    if (!text.trim()) { setError("Write the first message."); return }
    void run(async () => {
      await onSave({ contactId, channel, text: text.trim() })
      onClose()
    }, "The conversation could not be started.")
  }

  return <Modal titleId="conversation-dialog-title" title="New conversation" description="Record an outbound message to a contact. It appears in your inbox thread." icon={<MessageSquarePlus className="size-4" />} onClose={onClose}>
    <form onSubmit={submit} className="p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Contact *" value={contactId} onChange={chooseContact}>{contacts.length === 0 && <option value="">No contacts yet</option>}{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.company ? ` · ${contact.company}` : ""}</option>)}</SelectField>
        <SelectField label="Channel" value={channel} onChange={(value) => setChannel(value as Channel)}>{channels.map((item) => <option key={item} value={item}>{channelLabels[item]}</option>)}</SelectField>
        <label className="sm:col-span-2"><span className={labelClass}>First message *</span><textarea autoFocus rows={4} maxLength={4000} value={text} onChange={(event) => setText(event.target.value)} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[10px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" /></label>
      </div>
      <FormFooter saving={saving} error={error} label="Start conversation" onClose={onClose} />
    </form>
  </Modal>
}
