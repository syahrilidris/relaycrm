import Link from "next/link"
import { BarChart3, BriefcaseBusiness, Inbox, Layers3, PanelLeftClose, PanelLeftOpen, Settings2, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { initialsForName, pageRoutes, type PageKey } from "@/lib/crm-data"

type CrmSidebarProps = {
  activePage: PageKey
  caseCount: number
  unreadCount: number
  mockRoute: boolean
  collapsed: boolean
  viewerName: string
  viewerRole: string
  onToggleCollapse: () => void
}

function hrefForPage(name: PageKey, mockRoute: boolean) {
  return mockRoute ? `/demo${pageRoutes[name]}` : pageRoutes[name]
}

const navigation: { name: PageKey; icon: typeof BarChart3; count?: "cases" | "unread" }[] = [
  { name: "Dashboard", icon: BarChart3 },
  { name: "Contacts", icon: UsersRound },
  { name: "Cases", icon: BriefcaseBusiness, count: "cases" },
  { name: "Omnichannel Inbox", icon: Inbox, count: "unread" },
  { name: "Settings", icon: Settings2 },
]

export function CrmSidebar({ activePage, caseCount, unreadCount, mockRoute, collapsed, viewerName, viewerRole, onToggleCollapse }: CrmSidebarProps) {
  return (
    <aside className={cn("hidden min-h-screen shrink-0 flex-col border-r border-slate-800 bg-[#111827] text-slate-300 transition-[width] duration-200 lg:flex", collapsed ? "w-[76px]" : "w-[232px]")}>
      <div className={cn("flex h-[72px] shrink-0 border-b border-white/[0.07]", collapsed ? "flex-col items-center justify-center gap-1 px-2" : "items-center gap-3 px-5")}>
        <Link href={mockRoute ? "/demo" : pageRoutes.Dashboard} aria-label="Relay workspace" title="Relay workspace" className="flex items-center gap-3">
          <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/20", collapsed ? "size-8" : "size-9")}><Layers3 className="size-[19px]" strokeWidth={2.6} /></span>
          {!collapsed && <span className="text-[18px] font-semibold tracking-[-0.04em] text-white">relay<span className="text-emerald-400">.</span></span>}
        </Link>
        <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed} onClick={onToggleCollapse} className={cn("rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-200", !collapsed && "ml-auto")}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <div className={cn("pt-6", collapsed ? "px-2" : "px-3")}>
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Workspace</p>}
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {navigation.map(({ name, icon: Icon, count }) => {
            const active = activePage === name
            const countValue = count === "cases" ? caseCount : count === "unread" ? unreadCount : 0
            const accessibleName = `${name}${countValue > 0 ? ` ${countValue}` : ""}`
            return <Link
              key={name}
              href={hrefForPage(name, mockRoute)}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? accessibleName : undefined}
              title={collapsed ? accessibleName : undefined}
              className={cn(
                "group relative flex h-10 items-center rounded-lg text-[13px] font-medium transition",
                collapsed ? "mx-auto w-12 justify-center px-0" : "w-full gap-3 px-3",
                active ? "bg-white/[0.09] text-white shadow-sm" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
              )}
            >
              <Icon className={cn("size-[17px] shrink-0", active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300")} strokeWidth={1.9} />
              <span className={cn("truncate", collapsed && "sr-only")}>{name}</span>
              {count && countValue > 0 && <span
                aria-hidden={collapsed || undefined}
                className={cn(
                  "rounded-md text-[10px] font-semibold",
                  collapsed ? "absolute right-0 top-0 flex size-4 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-emerald-400 px-0 text-[8px] text-slate-950" : "ml-auto px-1.5 py-0.5",
                  !collapsed && (active ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.07] text-slate-400"),
                )}
              >{collapsed ? countValue > 9 ? "·" : countValue : countValue > 99 ? "99+" : countValue}</span>}
            </Link>
          })}
        </nav>
      </div>

      {collapsed ? <div className="mt-auto flex flex-col items-center gap-3 pb-4">
        <span title="Inbox health: live" className="flex size-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035]"><span className="size-1.5 rounded-full bg-emerald-400" /></span>
        <div title={`${viewerName} · ${viewerRole}`} className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-500 text-[10px] font-bold text-slate-950">{initialsForName(viewerName)}</div>
      </div> : <div className="mt-auto px-4 pb-5">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3.5"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-medium text-slate-300">Workload</span><span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" /> {mockRoute ? "Demo" : "Live"}</span></div><p className="text-[10px] leading-relaxed text-slate-500"><span className="font-medium text-slate-300">{unreadCount}</span> unread {unreadCount === 1 ? "conversation" : "conversations"}</p><p className="text-[10px] leading-relaxed text-slate-500"><span className="font-medium text-slate-300">{caseCount}</span> open {caseCount === 1 ? "case" : "cases"}</p></div>
        <div className="mt-4 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left"><div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-500 text-[10px] font-bold text-slate-950">{initialsForName(viewerName)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{viewerName}</p><p className="truncate text-[10px] text-slate-500">{viewerRole}</p></div><span className="size-1.5 rounded-full bg-emerald-400" /></div>
      </div>}
    </aside>
  )
}

export function MobileNavigation({ activePage, mockRoute }: { activePage: PageKey; mockRoute: boolean }) {
  return <nav aria-label="Mobile navigation" className="grid grid-cols-5 border-b border-slate-200 bg-white px-1 py-1.5 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
    {navigation.map(({ name, icon: Icon }) => <Link key={name} href={hrefForPage(name, mockRoute)} aria-current={activePage === name ? "page" : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-[9px] font-medium ${activePage === name ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}><Icon className="size-[17px]" strokeWidth={1.9} /><span className="max-w-full truncate">{name === "Omnichannel Inbox" ? "Inbox" : name}</span></Link>)}
  </nav>
}
