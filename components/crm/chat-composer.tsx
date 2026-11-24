"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react"
import { Download, FileText, Loader2, Paperclip, Pencil, Plus, Search, Send, Smile, Trash2, X, Zap } from "lucide-react"
import { attachmentKind, formatBytes, type Attachment, type QuickReply } from "@/lib/crm-data"

const MAX_FILES = 10
const MAX_BYTES = 25 * 1024 * 1024

const emojiGroups: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "🤗", "🤔", "🤭", "😮", "😯", "😴", "😌", "😔", "😢", "😭", "😤", "😡", "🥺", "😬", "🙄", "😷", "🤒"] },
  { label: "Gestures", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤝", "👏", "🙌", "👋", "🙏", "💪", "👉", "👈", "👆", "👇", "☝️", "✋", "🤙"] },
  { label: "Hearts & stars", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💖", "💕", "⭐", "🌟", "✨", "💫", "🔥", "🎉", "🎊", "✅", "❌", "❗", "❓", "💯"] },
  { label: "School & kids", emojis: ["📚", "📖", "✏️", "🖍️", "🎨", "🧸", "🎈", "🎒", "🏫", "👶", "🧒", "👧", "👦", "👪", "🍎", "🥪", "🧃", "⚽", "🎵", "🏆", "🎓", "📝", "📅", "⏰", "📍", "📞", "💬", "📷"] },
]

export type ComposerFile = { key: string; file: File; status: "uploading" | "ready" | "failed"; attachment?: Attachment; error?: string; preview?: string }

type ChatComposerProps = {
  placeholder: string
  hint: string
  busy: boolean
  quickReplies: QuickReply[]
  onSaveQuickReplies: (replies: QuickReply[]) => Promise<void>
  onSend: (text: string, attachments: Attachment[]) => void
  uploadFile: (file: File) => Promise<Attachment>
}

export function ChatComposer({ placeholder, hint, busy, quickReplies, onSaveQuickReplies, onSend, uploadFile }: ChatComposerProps) {
  const [draft, setDraft] = useState("")
  const [files, setFiles] = useState<ComposerFile[]>([])
  const [panel, setPanel] = useState<"emoji" | "replies" | null>(null)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const uploading = files.some((item) => item.status === "uploading")
  const ready = files.filter((item) => item.status === "ready" && item.attachment).map((item) => item.attachment!)
  const canSend = !busy && !uploading && (draft.trim().length > 0 || ready.length > 0)
  const slashQuery = draft.startsWith("/") && !draft.includes("\n") ? draft.slice(1) : null

  // Grow with the text up to ~8 lines.
  useLayoutEffect(() => {
    const area = textareaRef.current
    if (!area) return
    area.style.height = "auto"
    area.style.height = `${Math.min(area.scrollHeight, 180)}px`
  }, [draft])

  useEffect(() => () => files.forEach((item) => item.preview && URL.revokeObjectURL(item.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!panel) return
    const close = (event: MouseEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) setPanel(null) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [panel])

  function addFiles(list: FileList | File[]) {
    setNotice("")
    const incoming = Array.from(list)
    const room = MAX_FILES - files.length
    if (incoming.length > room) setNotice(`You can attach up to ${MAX_FILES} files per message.`)
    for (const file of incoming.slice(0, Math.max(room, 0))) {
      const key = crypto.randomUUID()
      if (file.size > MAX_BYTES) {
        setFiles((current) => [...current, { key, file, status: "failed", error: "Over 25 MB" }])
        continue
      }
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      setFiles((current) => [...current, { key, file, status: "uploading", preview }])
      uploadFile(file)
        .then((attachment) => setFiles((current) => current.map((item) => item.key === key ? { ...item, status: "ready", attachment } : item)))
        .catch((error: unknown) => setFiles((current) => current.map((item) => item.key === key ? { ...item, status: "failed", error: error instanceof Error ? error.message : "Upload failed" } : item)))
    }
  }

  function removeFile(key: string) {
    setFiles((current) => {
      const item = current.find((entry) => entry.key === key)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return current.filter((entry) => entry.key !== key)
    })
  }

  function insertText(value: string, replaceAll = false) {
    const area = textareaRef.current
    if (replaceAll || !area) { setDraft(value); requestAnimationFrame(() => textareaRef.current?.focus()); return }
    const start = area.selectionStart ?? draft.length
    const end = area.selectionEnd ?? draft.length
    const next = draft.slice(0, start) + value + draft.slice(end)
    setDraft(next)
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + value.length, start + value.length) })
  }

  function submit() {
    if (!canSend) return
    onSend(draft.trim(), ready)
    setDraft("")
    files.forEach((item) => item.preview && URL.revokeObjectURL(item.preview))
    setFiles([])
    setPanel(null)
    setNotice("")
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && panel) { setPanel(null); return }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      if (slashQuery !== null) {
        const match = filterReplies(quickReplies, slashQuery)[0]
        if (match) { insertText(match.text, true); return }
      }
      submit()
    }
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(event.clipboardData.files)
    if (pasted.length) { event.preventDefault(); addFiles(pasted) }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  return <div ref={wrapperRef} className="relative mx-auto max-w-[690px]" onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true) } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }} onDrop={onDrop}>
    {panel === "emoji" && <EmojiPanel onPick={(emoji) => insertText(emoji)} onClose={() => setPanel(null)} />}
    {(panel === "replies" || slashQuery !== null) && <QuickRepliesPanel replies={quickReplies} initialQuery={slashQuery ?? ""} slashMode={slashQuery !== null} onPick={(reply) => { insertText(reply.text, slashQuery !== null || !draft.trim()); setPanel(null) }} onSave={onSaveQuickReplies} onClose={() => { setPanel(null); if (slashQuery !== null) setDraft("") }} />}
    <div className={`rounded-xl border bg-white shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:bg-slate-900 ${dragging ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-slate-200 dark:border-slate-700"}`}>
      {dragging && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-indigo-50/90 text-[12px] font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-200">Drop files to attach</div>}
      {files.length > 0 && <div className="flex flex-wrap gap-2 px-3 pt-3">{files.map((item) => <PendingFile key={item.key} item={item} onRemove={() => removeFile(item.key)} />)}</div>}
      <textarea ref={textareaRef} aria-label={placeholder} placeholder={placeholder} rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} onPaste={onPaste} className="block max-h-[180px] min-h-[44px] w-full resize-none bg-transparent px-3.5 pt-3 text-[12.5px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200" />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <div className="flex min-w-0 items-center gap-0.5">
          <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = "" }} />
          <ToolButton label="Attach files" active={false} onClick={() => fileInputRef.current?.click()}><Paperclip className="size-4" /></ToolButton>
          <ToolButton label="Emoji" active={panel === "emoji"} onClick={() => setPanel(panel === "emoji" ? null : "emoji")}><Smile className="size-4" /></ToolButton>
          <ToolButton label="Quick replies (type /)" active={panel === "replies"} onClick={() => setPanel(panel === "replies" ? null : "replies")}><Zap className="size-4" /></ToolButton>
          <span className="ml-1 hidden truncate text-[10.5px] text-slate-400 md:inline">{hint} · Shift+Enter for a new line</span>
        </div>
        <button onClick={submit} disabled={!canSend} aria-busy={busy || uploading} className="flex min-w-[84px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <><Loader2 className="size-3 animate-spin" /> Sending…</> : uploading ? <><Loader2 className="size-3 animate-spin" /> Uploading…</> : <><Send className="size-3" /> Send</>}</button>
      </div>
    </div>
    {notice && <p role="alert" className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">{notice}</p>}
  </div>
}

function ToolButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={`rounded-md p-1.5 transition ${active ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"}`}>{children}</button>
}

function PendingFile({ item, onRemove }: { item: ComposerFile; onRemove: () => void }) {
  const failed = item.status === "failed"
  return <div title={item.error ?? item.file.name} className={`group relative flex h-14 items-center gap-2 overflow-hidden rounded-lg border ${failed ? "border-rose-200 bg-rose-50 dark:border-rose-400/30 dark:bg-rose-400/10" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"} ${item.preview ? "w-14" : "max-w-[200px] pr-7 pl-2"}`}>
    {item.preview
      ? <img src={item.preview} alt={item.file.name} className="size-full object-cover" />
      : <><FileText className={`size-5 shrink-0 ${failed ? "text-rose-500" : "text-slate-400"}`} /><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{item.file.name}</p><p className={`text-[10px] ${failed ? "text-rose-600 dark:text-rose-300" : "text-slate-400"}`}>{failed ? item.error : formatBytes(item.file.size)}</p></div></>}
    {item.status === "uploading" && <span className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60"><Loader2 className="size-4 animate-spin text-indigo-600" /></span>}
    {failed && item.preview && <span className="absolute inset-x-0 bottom-0 bg-rose-600 py-0.5 text-center text-[9px] font-semibold text-white">Failed</span>}
    <button type="button" onClick={onRemove} aria-label={`Remove ${item.file.name}`} className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-0.5 text-white opacity-90 hover:bg-slate-900"><X className="size-3" /></button>
  </div>
}

function EmojiPanel({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  return <div role="dialog" aria-label="Emoji" className="absolute bottom-full left-0 z-20 mb-2 w-[300px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center justify-between px-1 pb-1"><span className="text-[11px] font-semibold text-slate-500">Emoji</span><button onClick={onClose} aria-label="Close emoji" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-3.5" /></button></div>
    <div className="max-h-[240px] overflow-y-auto pr-1">
      {emojiGroups.map((group) => <div key={group.label} className="mb-1.5">
        <p className="px-1 py-1 text-[10px] font-medium text-slate-400">{group.label}</p>
        <div className="grid grid-cols-9 gap-0.5">{group.emojis.map((emoji) => <button key={emoji} type="button" onClick={() => onPick(emoji)} className="flex size-[30px] items-center justify-center rounded-md text-[18px] hover:bg-slate-100 dark:hover:bg-slate-800">{emoji}</button>)}</div>
      </div>)}
    </div>
  </div>
}

function filterReplies(replies: QuickReply[], query: string) {
  const q = query.trim().toLowerCase()
  return q ? replies.filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(q)) : replies
}

function QuickRepliesPanel({ replies, initialQuery, slashMode, onPick, onSave, onClose }: { replies: QuickReply[]; initialQuery: string; slashMode: boolean; onPick: (reply: QuickReply) => void; onSave: (replies: QuickReply[]) => Promise<void>; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<QuickReply | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const visible = useMemo(() => filterReplies(replies, slashMode ? initialQuery : query), [replies, query, initialQuery, slashMode])

  async function persist(next: QuickReply[]) {
    setSaving(true)
    setError("")
    try {
      await onSave(next)
      setEditing(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save quick replies.")
    } finally {
      setSaving(false)
    }
  }

  const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11.5px] text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
  return <div role="dialog" aria-label="Quick replies" className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-[420px] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700 dark:text-slate-200"><Zap className="size-3.5 text-amber-500" />Quick replies</span>
      <div className="flex items-center gap-1">{!editing && <button onClick={() => setEditing({ id: "", title: "", text: "" })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-400/10"><Plus className="size-3" />New</button>}<button onClick={onClose} aria-label="Close quick replies" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-3.5" /></button></div>
    </div>
    {editing ? <form className="flex flex-col gap-2 p-3" onSubmit={(event) => { event.preventDefault(); if (!editing.title.trim() || !editing.text.trim()) { setError("Add a title and a message."); return } const item = { ...editing, id: editing.id || crypto.randomUUID(), title: editing.title.trim(), text: editing.text.trim() }; void persist(editing.id ? replies.map((r) => r.id === editing.id ? item : r) : [...replies, item]) }}>
      <input autoFocus maxLength={60} placeholder="Title, e.g. Fees enquiry" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className={field} />
      <textarea rows={4} maxLength={2000} placeholder="Message" value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} className={`${field} resize-y`} />
      {error && <p role="alert" className="text-[11px] text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditing(null); setError("") }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="size-3 animate-spin" />}Save reply</button></div>
    </form> : <>
      {!slashMode && <div className="relative border-b border-slate-100 px-3 py-2 dark:border-slate-800"><Search className="absolute top-1/2 left-5 size-3.5 -translate-y-1/2 text-slate-400" /><input autoFocus placeholder="Search replies" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg bg-slate-50 py-1.5 pr-2 pl-7 text-[11.5px] text-slate-700 outline-none dark:bg-slate-800 dark:text-slate-200" /></div>}
      <ul className="max-h-[260px] overflow-y-auto p-1">
        {visible.map((reply, index) => <li key={reply.id} className="group flex items-start gap-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <button type="button" onClick={() => onPick(reply)} className="min-w-0 flex-1 px-2.5 py-2 text-left"><p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 dark:text-slate-100">{reply.title}{slashMode && index === 0 && <span className="rounded bg-slate-100 px-1 text-[9.5px] font-medium text-slate-500 dark:bg-slate-800">Enter</span>}</p><p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{reply.text}</p></button>
          {!slashMode && <div className="flex shrink-0 gap-0.5 p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"><button type="button" aria-label={`Edit ${reply.title}`} onClick={() => setEditing(reply)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700"><Pencil className="size-3" /></button><button type="button" aria-label={`Delete ${reply.title}`} disabled={saving} onClick={() => void persist(replies.filter((r) => r.id !== reply.id))} className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-slate-700"><Trash2 className="size-3" /></button></div>}
        </li>)}
        {visible.length === 0 && <li className="px-3 py-4 text-center text-[11px] text-slate-400">{replies.length ? "No replies match." : "No quick replies yet. Add your common answers."}</li>}
      </ul>
      {slashMode && <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400 dark:border-slate-800">Type to filter · Enter inserts the first match · Esc to close</p>}
      {error && <p role="alert" className="px-3 pb-2 text-[11px] text-rose-600">{error}</p>}
    </>}
  </div>
}

/** Renders a message's attachments: image grid with a viewer, inline video/audio, and file chips. */
export function MessageAttachments({ attachments, fromAgent }: { attachments: Attachment[]; fromAgent: boolean }) {
  const [viewing, setViewing] = useState<Attachment | null>(null)
  const images = attachments.filter((item) => (item.kind ?? attachmentKind(item.mime)) === "image")
  const others = attachments.filter((item) => (item.kind ?? attachmentKind(item.mime)) !== "image")
  useEffect(() => {
    if (!viewing) return
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setViewing(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewing])
  return <div className={`flex flex-col gap-1.5 ${fromAgent ? "items-end" : "items-start"}`}>
    {images.length > 0 && <div className={`grid gap-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{images.map((item) => <button key={item.url} type="button" onClick={() => setViewing(item)} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"><img src={item.url} alt={item.name} loading="lazy" className={`${images.length === 1 ? "max-h-[260px] max-w-[260px]" : "size-[128px]"} object-cover`} /></button>)}</div>}
    {others.map((item) => item.kind === "video"
      ? <video key={item.url} src={item.url} controls preload="metadata" className="max-h-[260px] max-w-[280px] rounded-xl border border-slate-200 bg-black dark:border-slate-700" />
      : item.kind === "audio"
        ? <audio key={item.url} src={item.url} controls preload="metadata" className="w-[260px] max-w-full" />
        : <a key={item.url} href={item.url} target="_blank" rel="noreferrer" download={item.name} className={`flex max-w-[280px] items-center gap-2.5 rounded-xl border px-3 py-2 transition ${fromAgent ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-400/10" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><FileText className="size-4" /></span><span className="min-w-0"><span className="block truncate text-[11.5px] font-medium text-slate-700 dark:text-slate-200">{item.name}</span><span className="block text-[10.5px] text-slate-400">{formatBytes(item.size) || "File"}</span></span><Download className="ml-auto size-3.5 shrink-0 text-slate-400" /></a>)}
    {viewing && <div role="dialog" aria-modal="true" aria-label={viewing.name} className="fixed inset-0 z-[60] flex flex-col bg-slate-950/90 p-4" onClick={() => setViewing(null)}>
      <div className="flex items-center justify-between text-white" onClick={(event) => event.stopPropagation()}><p className="truncate text-xs">{viewing.name}</p><div className="flex gap-1"><a href={viewing.url} target="_blank" rel="noreferrer" download={viewing.name} aria-label="Download" className="rounded-lg p-2 hover:bg-white/10"><Download className="size-4" /></a><button onClick={() => setViewing(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-white/10"><X className="size-4" /></button></div></div>
      <div className="flex min-h-0 flex-1 items-center justify-center"><img src={viewing.url} alt={viewing.name} className="max-h-full max-w-full rounded-lg object-contain" onClick={(event) => event.stopPropagation()} /></div>
    </div>}
  </div>
}
