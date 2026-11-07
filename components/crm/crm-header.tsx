"use client"

import { Bell, ChevronDown, Database, HelpCircle, LogOut, Search, Sun, Moon } from "lucide-react"
import { useState } from "react"

type CrmHeaderProps = {
  search: string
  onSearch: (value: string) => void
  darkMode: boolean
  databaseMode: "live" | "mock"
  onToggleTheme: () => void
  onSignOut: () => void
}

export function CrmHeader({ search, onSearch, darkMode, databaseMode, onToggleTheme, onSignOut }: CrmHeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  return (
    <header className="flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-2 text-[12px] text-slate-500"><span className="hidden truncate sm:inline">Northstar Studio</span><ChevronDown className="hidden size-3.5 sm:block" /><span className="hidden text-slate-300 dark:text-slate-700 sm:inline">/</span><span className="truncate font-medium text-slate-900 dark:text-slate-100">Customer workspace</span></div>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <label className="flex h-9 w-[min(28vw,250px)] min-w-[130px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-400 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-900 sm:min-w-[160px]">
          <Search className="size-4 shrink-0" /><input aria-label="Search workspace" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search anything..." className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100" /><kbd className="hidden shrink-0 rounded border border-slate-200 bg-white px-1 py-0.5 font-sans text-[9px] text-slate-400 dark:border-slate-700 dark:bg-slate-800 sm:inline">⌘ K</kbd>
        </label>
        <span title={databaseMode === "live" ? "Live Database Mode" : "Mock Mode"} className={`hidden h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[9px] font-semibold md:inline-flex ${databaseMode === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"}`}><Database className="size-3.5" />{databaseMode === "live" ? "Live Database Mode" : "Mock Mode"}</span>
        <button aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme} className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white sm:flex">{darkMode ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}</button>
        <button aria-label="Help center" className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white md:flex"><HelpCircle className="size-[17px]" /></button>
        <div className="relative"><button aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"><Bell className="size-[17px]" /><span className="absolute right-[7px] top-[7px] size-1.5 rounded-full border border-white bg-rose-500 dark:border-slate-950" /></button>{notificationsOpen && <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-900 dark:text-white">Notifications</p><p className="mt-2 text-xs leading-relaxed text-slate-500">You’re all caught up. New updates will appear here.</p><button onClick={() => setNotificationsOpen(false)} className="mt-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Got it</button></div>}</div>
        <div className="relative"><button aria-label="Open Maya Chen profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-500 text-[10px] font-bold text-slate-950 ring-2 ring-white dark:ring-slate-950">MC</button>{profileOpen && <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-100 px-2 py-2 dark:border-slate-800"><p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Maya Chen</p><p className="mt-0.5 text-[9px] text-slate-500">Workspace admin</p></div><button onClick={() => { setProfileOpen(false); onSignOut() }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[10px] font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><LogOut className="size-3.5" /> Sign out</button></div>}</div>
      </div>
    </header>
  )
}
