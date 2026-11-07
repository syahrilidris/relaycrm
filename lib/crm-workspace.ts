"use client"

import useSWR from "swr"
import { applyMockCrmMutation, readMockCrmData } from "@/lib/mock-crm-db"
import { emptyCrmSnapshot, type CrmMutation, type CrmSnapshot } from "@/lib/crm-data"

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
)

type CrmMode = "live" | "mock"

async function fetchLiveCrmData(): Promise<CrmSnapshot> {
  const response = await fetch("/api/crm/data", { cache: "no-store" })
  if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Sign in again to continue." : "CRM data is temporarily unavailable. Try again shortly.")
  return response.json() as Promise<CrmSnapshot>
}

export function useCrmWorkspace(forceMock = false) {
  const mode: CrmMode = supabaseConfigured && !forceMock ? "live" : "mock"
  const key = mode === "live" ? "/api/crm/data" : "relay:mock-crm-data:v1"
  const { data, error, isLoading, mutate } = useSWR<CrmSnapshot>(key, mode === "live" ? fetchLiveCrmData : readMockCrmData)

  async function runMutation(mutation: CrmMutation) {
    let next: CrmSnapshot
    if (mode === "live") {
      const response = await fetch("/api/crm/mutations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mutation),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error ?? "That change could not be saved. Please try again.")
      }
      next = await response.json() as CrmSnapshot
    } else {
      next = await applyMockCrmMutation(mutation)
    }
    await mutate(next, { revalidate: false })
    return next
  }

  return {
    data: data ?? emptyCrmSnapshot,
    error: error as Error | undefined,
    isLoading,
    mode,
    runMutation,
    refresh: () => mutate(),
  }
}
