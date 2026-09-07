import { ok } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export async function POST() {
  await destroySession();
  return ok({ message: "با موفقیت خارج شدید" });
}
