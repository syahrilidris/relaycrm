import { NextResponse } from "next/server"
import { applyCrmMutation, CrmServerError, getCrmAuthContext, getCrmSnapshot, parseCrmMutation } from "@/lib/crm-server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getCrmAuthContext()
    const mutation = parseCrmMutation(await request.json())
    const updatedUser = await applyCrmMutation(supabase, user, mutation)
    const snapshot = await getCrmSnapshot(supabase, updatedUser ?? user)
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof CrmServerError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "That CRM change could not be saved." }, { status: 500 })
  }
}
