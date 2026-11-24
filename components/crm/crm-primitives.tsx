"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Camera, ChevronDown, Mail, MessageCircle, MessageSquareText, Share2 } from "lucide-react"
import type { Channel, Contact, Priority, SupportCase } from "@/lib/crm-data"

const channelStyles: Record<Channel, string> = {
  whatsapp: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  email: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
  instagram: "bg-pink-50 text-pink-700 dark:bg-pink-400/10 dark:text-pink-300",
  facebook: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
  webchat: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
}

export function ChannelIcon({ channel, className = "" }: { channel: Channel; className?: string }) {
  const icons = { whatsapp: MessageCircle, email: Mail, instagram: Camera, facebook: Share2, webchat: MessageSquareText }
  const Icon = icons[channel]
  return <Icon className={className} aria-hidden="true" strokeWidth={2} />
}

export function ChannelPill({ channel, label = true }: { channel: Channel; label?: boolean }) {
  const labels: Record<Channel, string> = { whatsapp: "WhatsApp", email: "Email", instagram: "Instagram", facebook: "Facebook", webchat: "Webchat" }
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-semibold ${channelStyles[channel]}`}><ChannelIcon channel={channel} className="size-3.5" />{label && labels[channel]}</span>
}

export function ContactAvatar({ contact, size = "md" }: { contact: Pick<Contact, "initials" | "color">; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-9 text-[11.5px]", md: "size-10 text-xs", lg: "size-12 text-sm" }
  return <div aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${contact.color}`}>{contact.initials}</div>
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = {
    High: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
    Medium: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    Low: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  }
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${colors[priority]}`}>{priority}</span>
}

export function CaseStatusPill({ status }: { status: SupportCase["status"] }) {
  const colors: Record<SupportCase["status"], string> = {
    Open: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    "In Progress": "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
    "Waiting on Customer": "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    Resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  }
  return <span className={`rounded-md px-2 py-1 text-[11.5px] font-semibold ${colors[status]}`}>{status}</span>
}

/** The one header row every module shares: title + live count on the left, that page's actions on the right. */
export function PageToolbar({ title, subtitle, badge, children }: { title: string; subtitle?: ReactNode; badge?: ReactNode; children?: ReactNode }) {
  return <div className="flex min-h-[64px] shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
    <div className="min-w-0"><h1 className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">{title}{badge}</h1>{subtitle && <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{subtitle}</p>}</div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
}

export const toolbarButton = "flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
export const toolbarPrimary = "flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-indigo-700"

export type SelectMenuOption<T extends string> = { value: T; label: string; icon?: ReactNode; count?: number; badge?: number }

/** Compact dropdown used for every filter (channel, status…) so nothing needs side-scrolling. */
export function SelectMenu<T extends string>({ value, onChange, options, label, highlight, footer, align = "right" }: {
  value: T
  onChange: (value: T) => void
  options: SelectMenuOption<T>[]
  label: string
  highlight?: boolean
  footer?: ReactNode
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((option) => option.value === value) ?? options[0]
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])
  return <div className="relative shrink-0">
    <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current?.label}`} className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition ${highlight ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"}`}>
      {current?.icon}<span className="max-w-[120px] truncate">{current?.label}</span><ChevronDown className={`size-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <>
      <button aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
      <div role="listbox" aria-label={label} className={`absolute top-10 z-40 w-[230px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900 ${align === "right" ? "right-0" : "left-0"}`}>
        {options.map((option) => {
          const selected = option.value === value
          return <button key={option.value} role="option" aria-selected={selected} onClick={() => { onChange(option.value); setOpen(false) }} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition ${selected ? "bg-indigo-50 font-semibold text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
            {option.icon && <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{option.icon}</span>}
            <span className="flex-1 truncate">{option.label}</span>
            {!!option.badge && <span className="rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{option.badge}</span>}
            {option.count !== undefined && <span className="w-6 text-right text-[11px] text-slate-400">{option.count}</span>}
          </button>
        })}
        {footer && <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">{footer}</div>}
      </div>
    </>}
  </div>
}

export function Switch({ on }: { on: boolean }) {
  return <span className={`relative h-4 w-7 shrink-0 rounded-full transition ${on ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${on ? "left-3.5" : "left-0.5"}`} /></span>
}
