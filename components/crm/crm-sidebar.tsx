import {
  BarChart3,
  BriefcaseBusiness,
  Inbox,
  Layers3,
  Settings2,
  UsersRound,
} from "lucide-react"
import type { PageKey } from "@/lib/crm-data"

const navigation: { name: PageKey; icon: typeof BarChart3; count?: string }[] = [
  { name: "Dashboard", icon: BarChart3 },
  { name: "Contacts", icon: UsersRound },
  { name: "Cases", icon: BriefcaseBusiness, count: "6" },
  { name: "Omnichannel Inbox", icon: Inbox, count: "12" },
  { name: "Settings", icon: Settings2 },
]

type CrmSidebarProps = {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
}

export function CrmSidebar({ activePage, onNavigate }: CrmSidebarProps) {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-slate-800 bg-[#111827] text-slate-300 lg:flex">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/[0.07] px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/20">
          <Layers3 className="size-[19px]" strokeWidth={2.6} />
        </div>
        <span className="text-[18px] font-semibold tracking-[-0.04em] text-white">relay<span className="text-emerald-400">.</span></span>
        <button aria-label="Switch workspace" className="ml-auto rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-200">
          <Settings2 className="size-4" />
        </button>
      </div>

      <div className="px-3 pt-6">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Workspace</p>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {navigation.map(({ name, icon: Icon, count }) => {
            const active = activePage === name
            return (
              <button
                key={name}
                onClick={() => onNavigate(name)}
                aria-current={active ? "page" : undefined}
                className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition ${active ? "bg-white/[0.09] text-white shadow-sm" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"}`}
              >
                <Icon className={`size-[17px] shrink-0 ${active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`} strokeWidth={1.9} />
                <span className="truncate">{name}</span>
                {count && <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.07] text-slate-400"}`}>{count}</span>}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto px-4 pb-5">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-300">Inbox health</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" /> Live</span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full w-[78%] rounded-full bg-emerald-400" /></div>
          <p className="text-[10px] leading-relaxed text-slate-500">Average response time <span className="font-medium text-slate-300">4m 32s</span></p>
        </div>
        <button className="mt-4 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.05]">
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-500 text-[10px] font-bold text-slate-950">MC</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">Maya Chen</p><p className="truncate text-[10px] text-slate-500">Workspace admin</p></div>
          <span className="size-1.5 rounded-full bg-emerald-400" />
        </button>
      </div>
    </aside>
  )
}

export function MobileNavigation({ activePage, onNavigate }: CrmSidebarProps) {
  return (
    <nav aria-label="Mobile navigation" className="grid grid-cols-5 border-b border-slate-200 bg-white px-1 py-1.5 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
      {navigation.map(({ name, icon: Icon }) => (
        <button key={name} onClick={() => onNavigate(name)} aria-current={activePage === name ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-[9px] font-medium ${activePage === name ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
          <Icon className="size-[17px]" strokeWidth={1.9} /><span className="max-w-full truncate">{name === "Omnichannel Inbox" ? "Inbox" : name}</span>
        </button>
      ))}
    </nav>
  )
}
