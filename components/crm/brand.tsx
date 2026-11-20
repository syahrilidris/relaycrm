import { cn } from "@/lib/utils"

/** Eight-point star: the Bintang CRM mark. */
export function BintangStar({ className }: { className?: string }) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 === 0 ? 11 : 4.6
    const a = (Math.PI / 8) * i - Math.PI / 2
    return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`
  }).join(" ")
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><polygon points={points} fill="currentColor" /></svg>
}

export function BintangLogo({ collapsed = false, tone = "dark" }: { collapsed?: boolean; tone?: "dark" | "light" }) {
  return <span className="flex items-center gap-2.5">
    <span className={cn("flex shrink-0 items-center justify-center rounded-[10px] bg-[#0E1430] ring-1 ring-white/10", collapsed ? "size-9" : "size-9")}>
      <BintangStar className="size-[22px] text-[#F5B301] drop-shadow-[0_0_6px_rgba(245,179,1,0.45)]" />
    </span>
    {!collapsed && <span className={cn("text-[19px] font-bold tracking-[-0.035em]", tone === "dark" ? "text-white" : "text-[#0E1430] dark:text-white")}>Bintang<span className={cn("ml-1 font-medium", tone === "dark" ? "text-white/55" : "text-slate-400")}>CRM</span></span>}
  </span>
}
