"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Star, MessageSquare, LogIn, MessageCircleReply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

type Review = { id: string; rating: number; title: string | null; comment: string; date: string; author: string; reply?: string | null; replyAuthor?: string | null };

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="امتیاز شما">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={`${v} ستاره`}
          onClick={() => onChange(v)}
          onMouseEnter={() => setHover(v)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-7 w-7 transition-colors",
              (hover || value) >= v ? "fill-amber-400 text-amber-400" : "text-border"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ slug, initial }: { slug: string; initial: Review[] }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const qc = useQueryClient();

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/products/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title || null, comment }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "خطا در ثبت دیدگاه");
      return json;
    },
    onSuccess: () => {
      toast.success("دیدگاه شما ثبت شد و پس از تأیید نمایش داده می‌شود");
      setOpen(false);
      setTitle("");
      setComment("");
      setRating(5);
      qc.invalidateQueries({ queryKey: ["product", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section aria-labelledby="reviews-title" className="rounded-3xl border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 id="reviews-title" className="text-base font-extrabold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          دیدگاه کاربران ({initial.length.toLocaleString("fa-IR")})
        </h2>
        {me?.user ? (
          <Button onClick={() => setOpen(true)} className="gold-surface text-primary-foreground hover:opacity-90 rounded-lg">
            ثبت دیدگاه
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/login">
              <LogIn className="h-4 w-4 me-1.5" /> ورود برای ثبت دیدگاه
            </Link>
          </Button>
        )}
      </div>

      {initial.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          هنوز دیدگاهی ثبت نشده — اولین نفر باشید!
        </div>
      ) : (
        <div className="space-y-4">
          {initial.map((r) => (
            <article key={r.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid place-items-center h-9 w-9 rounded-full bg-primary/12 text-primary text-xs font-bold">
                    {r.author.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold">{r.author}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(r.date)}</p>
                  </div>
                </div>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-amber-400 text-amber-400" : "text-border")} />
                  ))}
                </span>
              </div>
              {r.title && <p className="text-[13px] font-bold mb-1.5">{r.title}</p>}
              <p className="text-[13px] leading-7 text-muted-foreground">{r.comment}</p>
              {/* v23: official store reply (AI-generated or manual) */}
              {r.reply && (
                <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-primary mb-1">
                    <MessageCircleReply className="h-3.5 w-3.5" />
                    پاسخ {r.replyAuthor ?? "فروشگاه"}
                  </p>
                  <p className="text-[12.5px] leading-6 text-muted-foreground">{r.reply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ثبت دیدگاه</DialogTitle>
            <DialogDescription>تجربه خود از این محصول را با دیگران به اشتراک بگذارید</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div>
              <p className="text-[13px] font-bold mb-2">امتیاز شما</p>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان دیدگاه (اختیاری)" maxLength={120} />
            </div>
            <div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="نظر خود را بنویسید…"
                rows={4}
                maxLength={1000}
                required
                minLength={5}
              />
            </div>
            <Button
              type="submit"
              disabled={submit.isPending || comment.trim().length < 5}
              className="w-full gold-surface text-primary-foreground hover:opacity-90 rounded-lg"
            >
              {submit.isPending ? "در حال ارسال…" : "ارسال دیدگاه"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
