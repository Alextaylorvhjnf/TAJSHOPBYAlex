import { z } from "zod";
import { passwordSchema, phoneSchema } from "@/lib/validators";

/** Installer-only schemas — kept isolated from the app's validators. */

const name = z.string().trim().min(2, "حداقل ۲ کاراکتر").max(60, "حداکثر ۶۰ کاراکتر");

export const adminAccountSchema = z
  .object({
    firstName: name,
    lastName: name,
    /** username = mobile number (existing auth identifier) */
    phone: phoneSchema,
    email: z.string().trim().email("ایمیل معتبر نیست"),
    password: passwordSchema
      .regex(/[A-Za-z]/, "رمز عبور باید شامل حرف باشد")
      .regex(/\d/, "رمز عبور باید شامل عدد باشد"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "تکرار رمز عبور مطابقت ندارد",
    path: ["passwordConfirm"],
  });

export type AdminAccountInput = z.infer<typeof adminAccountSchema>;

export const completeSchema = z.object({
  adminUserId: z.string().min(1).optional(),
});
