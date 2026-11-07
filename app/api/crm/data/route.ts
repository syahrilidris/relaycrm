import { NextResponse } from "next/server"
import { CrmServerError, getCrmAuthContext, getCrmSnapshot } from "@/lib/crm-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { supabase, user } = await getCrmAuthContext()
    const snapshot = await getCrmSnapshot(supabase, user)
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof CrmServerError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "CRM data is temporarily unavailable." }, { status: 500 })
  }
}
