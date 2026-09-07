"use client";

import { useChatStore } from "@/lib/stores";
import { Sparkles, Crown, Send, PackageSearch, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: PackageSearch, title: "جستجوی هوشمند", desc: "«لپ‌تاپ گیمینگ تا ۶۰ میلیون» — دقیقاً همین رو می‌فهمه" },
  { icon: GitCompareArrows, title: "مقایسه محصولات", desc: "مقایسه فنی و ارزش خرید بین چند محصول" },
  { icon: Send, title: "پیگیری سفارش", desc: "وضعیت لحظه‌ای سفارش فقط با شماره سفارش و موبایل" },
];

export function AISection() {
  const consult = useChatStore((s) => s.consultProduct);

  return (
    <section className="relative rounded-3xl overflow-hidden hero-mesh border p-7 md:p-10" aria-label="دستیار هوشمند">
      <div className="absolute -left-16 -top-16 opacity-20 pointer-events-none">
        <Sparkles className="h-56 w-56 text-amber-200" strokeWidth={0.8} />
      </div>
      <div className="relative grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="grid place-items-center h-11 w-11 rounded-2xl gold-surface text-primary-foreground">
              <Crown className="h-5.5 w-5.5 h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white">دستیار خرید هوشمند تاج</h2>
              <p className="text-[11px] text-white/60">متصل به انبار و قیمت‌های واقعی فروشگاه</p>
            </div>
          </div>
          <p className="text-[13px] leading-7 text-white/75">
            هر سؤالی درباره محصولات، مشخصات، قیمت یا سفارشت داری بپرس. دستیار هوشمند ما
            از داده‌های واقعی انبار جواب می‌ده — بدون حدس و گمان، بدون قیمت جعلی.
          </p>
          <Button
            size="lg"
            className="mt-6 gold-surface text-primary-foreground hover:opacity-90 rounded-xl h-12 px-7 font-bold shadow-lg"
            onClick={() => useChatStore.getState().setOpen(true)}
          >
            <Sparkles className="h-5 w-5 me-2" />
            شروع گفتگو با دستیار
          </Button>
        </div>
        <div className="space-y-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="flex items-start gap-3 glass rounded-2xl p-4"
            >
              <span className="grid place-items-center h-9 w-9 rounded-xl bg-amber-400/20 text-amber-300 shrink-0">
                <f.icon className="h-4.5 w-4.5 h-5 w-5" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-white">{f.title}</p>
                <p className="text-[11px] text-white/60 mt-1 leading-5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
