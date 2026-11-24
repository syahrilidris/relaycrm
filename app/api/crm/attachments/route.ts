import { NextResponse } from "next/server"
import { ATTACHMENT_BUCKET, MAX_ATTACHMENT_BYTES, attachmentPath, ensureAttachmentBucket, publicAttachmentUrl } from "@/lib/attachments-server"
import { CrmServerError, getCrmAuthContext } from "@/lib/crm-server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Returns a one-time signed upload URL so the browser uploads straight to storage (no 4.5 MB function limit). */
export async function POST(request: Request) {
  try {
    const { user } = await getCrmAuthContext()
    const body = await request.json().catch(() => ({})) as { name?: unknown; size?: unknown; mime?: unknown }
    const name = typeof body.name === "string" ? body.name.slice(0, 200) : ""
    const size = Number(body.size)
    if (!name || !Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "Choose a file to attach." }, { status: 400 })
    if (size > MAX_ATTACHMENT_BYTES) return NextResponse.json({ error: "Files can be up to 25 MB." }, { status: 413 })
    await ensureAttachmentBucket()
    const path = attachmentPath(user.id, name)
    const { data, error } = await createAdminClient().storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(path)
    if (error || !data) throw error ?? new Error("Upload URL failed")
    return NextResponse.json({ uploadUrl: data.signedUrl, publicUrl: publicAttachmentUrl(path) }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof CrmServerError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[attachments] sign failed", error)
    return NextResponse.json({ error: "The file couldn't be prepared for upload." }, { status: 500 })
  }
}
