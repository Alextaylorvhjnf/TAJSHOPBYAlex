import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { saveImageUpload, saveVideoUpload } from "@/lib/upload";

/**
 * POST /api/tickets/upload — media attachments for ticket messages (v16).
 *
 * Any logged-in user (customer OR staff) can attach images / videos here.
 * The uploaded file is NOT bound to a ticket on this endpoint — binding
 * happens only when the message itself is created (POST /api/tickets or
 * POST /api/tickets/[id]/reply), and THOSE routes enforce ticket access
 * (owner-or-staff) plus ticketAttachmentSchema validation (URL must start
 * with /uploads/tickets/). This endpoint is therefore safe to expose to
 * any authenticated session: worst case is an orphaned file, never a
 * leaked thread.
 *
 * Security: session required, 20 uploads / 10 min per user, MIME +
 * magic-number validation and size caps enforced inside lib/upload
 * (images ≤ 5MB via sharp re-encode, videos ≤ 64MB), collision-resistant
 * random filenames.
 */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return fail("ابتدا وارد حساب خود شوید.", 401, "AUTH_REQUIRED");

  // 20 uploads / 10 minutes / user — plenty for a chat thread, abuse-safe
  const rl = rateLimit(`ticket-upload:${user.id}`, 20, 10 * 60_000);
  if (!rl.ok) return fail("آپلودهای بیش از حد مجاز؛ کمی بعد تلاش کنید", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("درخواست نامعتبر است", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("فایلی ارسال نشده است", 400);

  // videos get their own pipeline (no sharp, larger cap) — both land in
  // public/uploads/tickets/ so ticketAttachmentSchema accepts the URL.
  const isVideo = file.type.startsWith("video/");
  const result = isVideo ? await saveVideoUpload(file, "tickets") : await saveImageUpload(file, "tickets");
  if (!result.ok) return fail(result.message, 400);

  return ok({
    url: result.url,
    kind: isVideo ? "video" : "image",
    name: file.name,
    size: file.size,
  });
}
