"use client"

import { Bell, ChevronDown, HelpCircle, Search, Sun, Moon } from "lucide-react"
import { useState } from "react"

type CrmHeaderProps = {
  search: string
  onSearch: (value: string) => void
  darkMode: boolean
  onToggleTheme: () => void
}

export function CrmHeader({ search, onSearch, darkMode, onToggleTheme }: CrmHeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  return (
    <header className="flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-2 text-[12px] text-slate-500">
        <span className="hidden truncate sm:inline">Northstar Studio</span>
        <ChevronDown className="hidden size-3.5 sm:block" />
        <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">/</span>
        <span className="truncate font-medium text-slate-900 dark:text-slate-100">Customer workspace</span>
      </div>
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
        <label className="flex h-9 w-[min(35vw,270px)] min-w-[140px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-400 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-900">
          <Search className="size-4 shrink-0" />
          <input aria-label="Search workspace" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search anything..." className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100" />
          <kbd className="hidden shrink-0 rounded border border-slate-200 bg-white px-1 py-0.5 font-sans text-[9px] text-slate-400 dark:border-slate-700 dark:bg-slate-800 sm:inline">⌘ K</kbd>
        </label>
        <button aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme} className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white sm:flex">
          {darkMode ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
        </button>
        <button aria-label="Help center" className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white md:flex"><HelpCircle className="size-[17px]" /></button>
        <div className="relative">
          <button aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
            <Bell className="size-[17px]" />
            <span className="absolute right-[7px] top-[7px] size-1.5 rounded-full border border-white bg-rose-500 dark:border-slate-950" />
          </button>
          {notificationsOpen && <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-900 dark:text-white">Notifications</p><p className="mt-2 text-xs leading-relaxed text-slate-500">You’re all caught up. New updates will appear here.</p><button onClick={() => setNotificationsOpen(false)} className="mt-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Got it</button></div>}
        </div>
        <button aria-label="Open Maya Chen profile" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-500 text-[10px] font-bold text-slate-950 ring-2 ring-white dark:ring-slate-950">MC</button>
      </div>
    </header>
  )
}
