"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Layers3, LockKeyhole, Mail } from "lucide-react"
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

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6">
    <div className="w-full max-w-[420px]">
      <Link href="/inbox" className="mb-7 inline-flex items-center gap-2.5 text-slate-900 dark:text-white"><span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400 text-slate-950"><Layers3 className="size-5" /></span><span className="text-lg font-semibold tracking-[-0.04em]">relay<span className="text-emerald-500">.</span></span></Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.07)] dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Northstar Studio workspace</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-xs text-slate-500">{isSignUp ? "Use your work email to set up your private CRM workspace." : "Sign in to continue to your customer workspace."}</p>
        {!supabaseReady ? <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Authentication is unavailable in Mock Mode. <Link href="/inbox" className="font-semibold underline underline-offset-2">Open the local demo</Link>.</div> : <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Work email</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10 dark:border-slate-700"><Mail className="size-4" /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" /></span></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-700 dark:text-slate-300">Password</span><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10 dark:border-slate-700"><LockKeyhole className="size-4" /><input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200" /></span></label>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">{message}</p>}
          <button disabled={pending} className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">{pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}{!pending && <ArrowRight className="size-3.5" />}</button>
        </form>}
        {supabaseReady && <p className="mt-5 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-500 dark:border-slate-800">{isSignUp ? "Already have an account?" : "New to Relay?"} <Link href={isSignUp ? "/login" : "/signup"} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">{isSignUp ? "Sign in" : "Create an account"}</Link></p>}
      </section>
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400"><span>Your CRM data is private to your signed-in account.</span><span aria-hidden="true">·</span><Link href="/demo" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Preview with sample data</Link></div>
    </div>
  </main>
}
