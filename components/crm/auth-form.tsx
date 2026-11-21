"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, LockKeyhole, Mail } from "lucide-react"
import { BintangLogo, BintangStar } from "./brand"
import { ChannelIcon } from "./crm-primitives"
import { createClient } from "@/lib/supabase/client"

type AuthMode = "login" | "signup"

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next")
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/inbox"
}

function loginError(error: { code?: string; status?: number }) {
  if (error.code === "email_not_confirmed") return "Please confirm your email address using the link in your inbox."
  if (error.code === "over_request_rate_limit" || error.status === 429) return "Too many attempts. Please wait a moment and try again."
  if (error.code === "invalid_credentials") return "Invalid email or password."
  return "We couldn’t sign you in. Please try again."
}

function signupError(error: { code?: string; status?: number }) {
  if (error.code === "weak_password") return "Choose a stronger password and try again."
  if (error.code === "email_address_invalid") return "Enter a valid email address."
  if (error.code === "email_address_not_authorized") return "This project cannot send a confirmation email to that address."
  if (error.code === "over_email_send_rate_limit" || error.status === 429) return "Too many attempts. Please wait a moment and try again."
  return "We couldn’t create your account. Please try again."
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const isSignUp = mode === "signup"
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")
    setPending(true)
    try {
      const supabase = createClient()
      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          },
        })
        if (authError) throw authError
        if (data.session) {
          router.replace(getSafeNextPath())
          router.refresh()
        } else {
          setMessage("Check your email for a confirmation link. You can sign in after confirming your address.")
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        router.replace(getSafeNextPath())
        router.refresh()
      }
    } catch (caught) {
      const authError = caught as { code?: string; status?: number }
      setError(isSignUp ? signupError(authError) : loginError(authError))
    } finally {
      setPending(false)
    }
  }

  return <main className="grid min-h-screen bg-[#F5F6FA] dark:bg-slate-950 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
    <aside className="relative hidden overflow-hidden bg-[#0E1430] px-12 py-12 text-white lg:flex lg:flex-col">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_70%_at_15%_0%,rgba(67,56,202,0.45),transparent_60%),radial-gradient(60%_50%_at_100%_100%,rgba(245,179,1,0.10),transparent_70%)]" />
      <SkyDots />
      <BintangStar className="absolute -right-24 top-1/2 size-[460px] -translate-y-1/2 text-white/[0.035]" />
      <Link href="/inbox" className="relative"><BintangLogo /></Link>
      <div className="relative mt-auto max-w-[460px]">
        <h2 className="text-[40px] font-bold leading-[1.08] tracking-[-0.035em]">Every customer chat, in one inbox.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/65">Reply to WhatsApp, Messenger and Instagram messages from one place, and keep contacts, cases and follow-ups together.</p>
        <ul className="mt-8 flex flex-wrap gap-2">{(["whatsapp", "facebook", "instagram"] as const).map((channel) => <li key={channel} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-white/80"><ChannelIcon channel={channel} className="size-4 text-[#F5B301]" />{channel === "whatsapp" ? "WhatsApp" : channel === "facebook" ? "Messenger" : "Instagram"}</li>)}</ul>
      </div>
    </aside>
    <div className="flex items-center justify-center px-4 py-10 sm:px-8">
    <div className="w-full max-w-[400px]">
      <Link href="/inbox" className="mb-8 inline-flex lg:hidden"><BintangLogo tone="light" /></Link>
      <section>
        <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-xs text-slate-500">{isSignUp ? "Use your work email to set up your private CRM workspace." : "Sign in to continue to your customer workspace."}</p>
        {!supabaseReady ? <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Authentication is unavailable in Mock Mode. <Link href="/inbox" className="font-semibold underline underline-offset-2">Open the local demo</Link>.</div> : <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">Work email</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-700"><Mail className="size-4" /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" /></span></label>
          <label className="block"><span className="mb-1.5 block text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">Password</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-700"><LockKeyhole className="size-4" /><input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" /></span></label>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-indigo-50 px-3 py-2 text-[12.5px] leading-relaxed text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-300">{message}</p>}
          <button disabled={pending} className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 text-[13px] font-semibold text-white shadow-sm shadow-indigo-900/20 transition hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60">{pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}{!pending && <ArrowRight className="size-3.5" />}</button>
        </form>}
        {supabaseReady && <p className="mt-6 border-t border-slate-200 pt-5 text-[12.5px] text-slate-500 dark:border-slate-800">{isSignUp ? "Already have an account?" : "New to Bintang CRM?"} <Link href={isSignUp ? "/login" : "/signup"} className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400">{isSignUp ? "Sign in" : "Create an account"}</Link></p>}
      </section>
      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-400"><span>Your data is private to your account.</span><Link href="/guide" className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400">User guide</Link><span aria-hidden="true">·</span><Link href="/demo" className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400">Preview with sample data</Link></div>
    </div>
    </div>
  </main>
}

const dots = [[8, 14, 1.5], [22, 32, 1], [37, 9, 1.2], [55, 22, 1], [71, 12, 1.6], [84, 30, 1], [12, 52, 1], [30, 64, 1.3], [62, 47, 1], [90, 58, 1.2], [18, 82, 1], [46, 90, 1.4], [77, 78, 1]] as const

function SkyDots() {
  return <svg aria-hidden className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">{dots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r * 0.18} fill="white" opacity={0.25 + (i % 3) * 0.15} />)}</svg>
}
