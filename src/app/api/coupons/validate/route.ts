import { ok, fail } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { validateCoupon } from "@/lib/orders";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.number().int().min(0),
});

export async function POST(req: Request) {
  const user = await getAuthUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("اطلاعات نامعتبر است", 400);

  const result = await validateCoupon(parsed.data.code, parsed.data.subtotal, user);
  if (!result.valid) return fail(result.reason ?? "کد تخفیف قابل استفاده نیست", 400);

  return ok({ discount: result.discount, message: `کد تخفیف اعمال شد — ${result.discount.toLocaleString("fa-IR")} تومان تخفیف` });
}
