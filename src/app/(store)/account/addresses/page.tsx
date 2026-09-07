"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROVINCES = ["تهران", "البرز", "اصفهان", "خراسان رضوی", "فارس", "آذربایجان شرقی", "آذربایجان غربی", "گیلان", "مازندران", "خوزستان", "کرمان", "یزد", "قم", "کرمانشاه", "هرمزگان", "همدان", "سایر"];

type Address = {
  id: string; title: string; receiverName: string | null; phone: string | null;
  province: string; city: string; address: string; postalCode: string | null; isDefault: boolean;
};

const emptyForm = { title: "آدرس من", receiverName: "", phone: "", province: "تهران", city: "", address: "", postalCode: "", isDefault: false };

export default function AddressesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => fetch("/api/account/addresses").then((r) => r.json()),
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditId(a.id);
    setForm({
      title: a.title, receiverName: a.receiverName ?? "", phone: a.phone ?? "",
      province: a.province, city: a.city, address: a.address, postalCode: a.postalCode ?? "",
      isDefault: a.isDefault,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const url = editId ? `/api/account/addresses/${editId}` : "/api/account/addresses";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, postalCode: form.postalCode || null, receiverName: form.receiverName || null, phone: form.phone || null }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      toast.success("آدرس ذخیره شد");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("آدرس حذف شد");
      qc.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="rounded-2xl border bg-card h-64 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const addresses: Address[] = data?.addresses ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black">آدرس‌های من</h1>
        <Button onClick={openNew} className="gold-surface text-primary-foreground hover:opacity-90 rounded-lg">
          <Plus className="h-4 w-4 me-1.5" /> آدرس جدید
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-14 text-center">
          <MapPin className="mx-auto h-14 w-14 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-bold">هنوز آدرسی ثبت نکرده‌اید</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className={cn("rounded-2xl border bg-card p-4", a.isDefault && "border-primary/50 bg-primary/5")}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold flex items-center gap-2">
                    {a.title}
                    {a.isDefault && <span className="text-[9px] rounded-full bg-primary text-primary-foreground px-2 py-0.5">پیش‌فرض</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 leading-6">
                    {a.province}، {a.city} — {a.address}
                    {a.postalCode && <> — <span dir="ltr">{a.postalCode}</span></>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(a)} aria-label="ویرایش" className="grid place-items-center h-8 w-8 rounded-lg hover:bg-accent">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => remove.mutate(a.id)} aria-label="حذف" className="grid place-items-center h-8 w-8 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "ویرایش آدرس" : "آدرس جدید"}</DialogTitle>
            <DialogDescription>اطلاعات آدرس تحویل را وارد کنید</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5">عنوان</Label>
                <Input required maxLength={60} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs mb-1.5">نام گیرنده</Label>
                <Input value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs mb-1.5">موبایل گیرنده</Label>
                <Input dir="ltr" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 rounded-lg text-left" />
              </div>
              <div>
                <Label className="text-xs mb-1.5">استان</Label>
                <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full h-10 rounded-lg border bg-card px-2 text-sm">
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1.5">شهر</Label>
                <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs mb-1.5">کد پستی</Label>
                <Input dir="ltr" inputMode="numeric" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="h-10 rounded-lg text-left" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5">آدرس کامل</Label>
              <Textarea required minLength={10} rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg resize-none" />
            </div>
            <label className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] cursor-pointer hover:bg-accent">
              آدرس پیش‌فرض
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-[color:var(--primary)] h-4 w-4" />
            </label>
            <Button type="submit" disabled={save.isPending} className="w-full gold-surface text-primary-foreground hover:opacity-90 rounded-lg h-11">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره آدرس"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
