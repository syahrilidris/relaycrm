import { Camera, Mail, MessageCircle, MessageSquareText, Share2 } from "lucide-react"
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
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold ${channelStyles[channel]}`}><ChannelIcon channel={channel} className="size-3.5" />{label && labels[channel]}</span>
}

export function ContactAvatar({ contact, size = "md" }: { contact: Pick<Contact, "initials" | "color">; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-9 text-[10px]", md: "size-10 text-xs", lg: "size-12 text-sm" }
  return <div aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${contact.color}`}>{contact.initials}</div>
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = {
    High: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
    Medium: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    Low: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  }
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold ring-1 ring-inset ${colors[priority]}`}>{priority}</span>
}

export function CaseStatusPill({ status }: { status: SupportCase["status"] }) {
  const colors: Record<SupportCase["status"], string> = {
    Open: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    "In Progress": "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
    "Waiting on Customer": "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    Resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  }
  return <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${colors[status]}`}>{status}</span>
}
