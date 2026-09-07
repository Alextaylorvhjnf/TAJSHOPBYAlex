/**
 * Idempotent CMS/branding content defaults.
 * - Creates default CmsPages only when a slug is missing (never overwrites edits)
 * - Creates default FooterLinks / Showcases / Stories only when tables are empty
 * - Ensures ThemeSettings default row exists
 * Run standalone: bun scripts/seed-content.ts   (also called by scripts/seed.ts)
 */
import { db } from "../src/lib/db";

type Section = { h: string; p: string };

const CMS_PAGES: {
  slug: string;
  title: string;
  icon: string;
  sortOrder: number;
  sections: Section[];
}[] = [
  {
    slug: "about",
    title: "درباره ما",
    icon: "Crown",
    sortOrder: 1,
    sections: [
      { h: "تاج الکترونیکس کیست؟", p: "تاج الکترونیکس با بیش از ۱۰ سال سابقه در واردات و عرضه کالای دیجیتال، یکی از فروشگاه‌های تخصصی لوازم الکترونیکی ایران است. تمرکز ما بر فروش کالای اورجینال با ضمانت اصالت، قیمت منصفانه و پشتیبانی واقعی است." },
      { h: "مأموریت ما", p: "تجربه خرید آنلاین مطمئن برای همه؛ از انتخاب محصول با مشاوره هوشمند تا پرداخت امن و ارسال سریع به سراسر ایران." },
      { h: "چرا «تاج»؟", p: "تاج، نماد اعتماد مشتریان ماست. هر سفارش موفق یک ستاره بر تاج ما اضافه می‌کند و همین انگیزه ما برای بهتر شدن هر روز است." },
    ],
  },
  {
    slug: "buying-guide",
    title: "راهنمای خرید",
    icon: "Compass",
    sortOrder: 2,
    sections: [
      { h: "انتخاب محصول", p: "برای انتخاب بهترین محصول، از فیلترهای صفحه «همه محصولات» (دسته‌بندی، برند، محدوده قیمت و موجودی) استفاده کنید. دستیار هوشمند تاج نیز بر اساس مشخصات واقعی محصولات، مقایسه و پیشنهاد اختصاصی ارائه می‌دهد." },
      { h: "ثبت سفارش", p: "پس از افزودن کالا به سبد خرید، اطلاعات ارسال را کامل کنید. قبل از پرداخت، خلاصه سفارش شامل قیمت‌ها و هزینه ارسال را دقیق بررسی کنید." },
      { h: "پرداخت", p: "می‌توانید از درگاه امن زرین‌پال (پرداخت آنلاین) یا کارت به کارت استفاده کنید. در کارت به کارت، سفارش پس از تأیید رسید واریز وارد پردازش می‌شود." },
      { h: "گارانتی و اصالت", p: "تمام کالاها اورجینال با فاکتور رسمی و گارانتی معتبر هستند. کد گارانتی روی بسته‌بندی قابل استعلام است." },
    ],
  },
  {
    slug: "shipping",
    title: "روش‌های ارسال",
    icon: "Truck",
    sortOrder: 3,
    sections: [
      { h: "ارسال داخل تهران", p: "سفارش‌های پرداخت آنلاین در ساعات کاری، همان روز با پیک ارسال می‌شوند (تحویل اکسپرس)." },
      { h: "ارسال به شهرستان", p: "سایر شهرها ۲ تا ۴ روز کاری با پست پیشتاز یا تیپاکس ارسال می‌شوند. کد رهگیری پس از ارسال در پنل کاربری و از طریق پیگیری سفارش در دسترس است." },
      { h: "هزینه ارسال", p: "هزینه ارسال در مرحله پردازش نمایش داده می‌شود. برای سفارش‌های بالای مبلغ تعیین‌شده در فروشگاه، ارسال رایگان است." },
      { h: "بسته‌بندی ایمن", p: "کالاهای حساس با فوم ضدضربه و کارتن سه‌لایه ارسال می‌شوند تا سالم به دست شما برسند." },
    ],
  },
  {
    slug: "returns",
    title: "بازگشت کالا",
    icon: "RotateCcw",
    sortOrder: 4,
    sections: [
      { h: "شرایط بازگشت", p: "کالای دیجیتال در صورت عدم استفاده، داشتن کامل لوازم همراه و کارت گارانتی، تا ۷ روز پس از تحویل قابل بازگشت است." },
      { h: "موارد غیرقابل بازگشت", p: "کالای آسیب‌دیده یا فعال‌شده (نظیر ثبت حساب کاربری روی گوشی)، لوازم بهداشتی مثل هدفون داخل گوشی و کالای بدون بسته‌بندی اصلی، مشمول بازگشت نیستند." },
      { h: "فرآیند درخواست", p: "از طریق صفحه «تماس با ما» یا پشتیبانی تلفنی درخواست خود را ثبت کنید. پس از بررسی، آدرس بازگشت و روند استرداد به شما اطلاع داده می‌شود." },
      { h: "مدت بازگشت وجه", p: "پس از تأیید سلامت کالا، مبلغ حداکثر تا ۷۲ ساعت کاری به حساب شما بازگردانده می‌شود." },
    ],
  },
  {
    slug: "faq",
    title: "سوالات متداول",
    icon: "HelpCircle",
    sortOrder: 5,
    sections: [
      { h: "پرداخت کارت به کارت چطور تأیید می‌شود؟", p: "پس از واریز، تصویر رسید را از صفحه پیگیری سفارش ارسال کنید. کارشناسان ما مبلغ و اطلاعات را با بانک تطبیق می‌دهند و نتیجه (تأیید یا رد با ذکر دلیل) از طریق اعلان‌ها ارسال می‌شود؛ معمولاً کمتر از ۲ ساعت کاری." },
      { h: "چطور سفارشم را پیگیری کنم؟", p: "از صفحه «پیگیری سفارش» با شماره سفارش (مثل TAJ-XXXX) و موبایل ثبت‌شده، وضعیت لحظه‌ای سفارش را ببینید. دستیار هوشمند هم همین کار را برایتان انجام می‌دهد." },
      { h: "ارسال چقدر طول می‌کشد؟", p: "تهران: ۲۴ ساعته برای سفارش‌های پرداخت آنلاین. سایر شهرها: ۲ تا ۴ روز کاری با پست پیشتاز یا تیپاکس." },
      { h: "کالاها اورجینال هستند؟", p: "بله؛ تمام کالاها اورجینال با فاکتور رسمی و گارانتی معتبر هستند. اصالت کالا تضمین می‌شود." },
      { h: "می‌توانم مشاوره خرید بگیرم؟", p: "بله! دستیار هوشمند تاج بر اساس مشخصات واقعی محصولات در انبار، مقایسه و پیشنهاد اختصاصی ارائه می‌دهد — ۲۴ ساعته و رایگان." },
    ],
  },
  {
    slug: "terms",
    title: "قوانین و مقررات",
    icon: "FileText",
    sortOrder: 6,
    sections: [
      { h: "پذیرش قوانین", p: "کاربر با ثبت سفارش در تاج الکترونیکس، تمامی شرایط و قوانین این مجموعه را می‌پذیرد. تخلف از قوانین ممکن است به محدودیت حساب کاربری منجر شود." },
      { h: "قیمت‌ها و موجودی", p: "قیمت‌ها و موجودی کالاها به‌صورت لحظه‌ای به‌روزرسانی می‌شوند. در صورت اتمام موجودی پس از ثبت سفارش، مبلغ پرداختی حداکثر تا ۷۲ ساعت کاری به‌صورت کامل بازگردانده می‌شود." },
      { h: "شرایط بازگشت کالا", p: "کالای دیجیتال در صورت عدم استفاده، داشتن کامل لوازم همراه و کارت گارانتی، تا ۷ روز پس از تحویل قابل بازگشت است. کالای آسیب‌دیده یا فعال‌شده (نظیر ثبت حساب کاربری روی گوشی) مشمول بازگشت نیست." },
      { h: "پرداخت کارت به کارت", p: "در پرداخت کارت به کارت، سفارش تنها پس از تأیید رسید واریز توسط کارشناسان وارد مرحله پردازش می‌شود. مسئولیت تطابق مبلغ و اطلاعات واریز بر عهده خریدار است." },
    ],
  },
  {
    slug: "privacy",
    title: "حریم خصوصی",
    icon: "ShieldCheck",
    sortOrder: 7,
    sections: [
      { h: "چه اطلاعاتی جمع می‌کنیم؟", p: "اطلاعات ثبت‌نام (نام، موبایل، ایمیل)، آدرس‌های تحویل و سابقه سفارش‌ها؛ صرفاً برای پردازش سفارش‌ها و بهبود خدمات." },
      { h: "اطلاعات شما نزد ما امن است", p: "رمز عبور به‌صورت هش‌شده ذخیره می‌شود، دسترسی کارکنان به اطلاعات مشتریان مبتنی بر سطوح دسترسی (RBAC) است و تمام عملیات حساس ادمین‌ها ثبت و قابل پیگیری است." },
      { h: "اشتراک‌گذاری با اشخاص ثالث", p: "اطلاعات شما تنها در حد لازم برای انجام سفارش (شرکت حمل‌ونقل و درگاه پرداخت بانکی) به اشتراک گذاشته می‌شود و به هیچ‌وجه به دیگران فروخته نمی‌شود." },
    ],
  },
  {
    slug: "customer-service",
    title: "خدمات مشتریان",
    icon: "Headphones",
    sortOrder: 8,
    sections: [
      { h: "پشتیبانی تلفنی", p: "شنبه تا پنجشنبه، ۹ صبح تا ۱۸ با شماره پشتیبانی فروشگاه تماس بگیرید. در ساعات غیر کاری، پیام بگذارید؛ همان روز کاری بعد پاسخ می‌دهیم." },
      { h: "پشتیبانی آنلاین", p: "دستیار هوشمند تاج ۲۴ ساعته پاسخگوی سوالات شما درباره محصولات و سفارش‌هاست. برای موضوعات تخصصی‌تر از فرم صفحه «تماس با ما» استفاده کنید." },
      { h: "پیگیری سفارش", p: "از صفحه پیگیری سفارش با شماره سفارش و موبایل، وضعیت لحظه‌ای مرسوله را ببینید." },
      { h: "رضایت مشتری", p: "نظرات شما (پس از خرید) در صفحه محصول منتشر می‌شود و به بهبود کیفیت خدمات کمک می‌کند. برای هر نظر ثبت‌شده، تیم پشتیبانی پاسخ شما را می‌خواند." },
    ],
  },
];

const FOOTER_LINKS: { section: string; label: string; url: string; sortOrder: number }[] = [
  { section: "CUSTOMER", label: "پیگیری سفارش", url: "/track-order", sortOrder: 1 },
  { section: "CUSTOMER", label: "راهنمای خرید", url: "/info/buying-guide", sortOrder: 2 },
  { section: "CUSTOMER", label: "روش‌های ارسال", url: "/info/shipping", sortOrder: 3 },
  { section: "CUSTOMER", label: "بازگشت کالا", url: "/info/returns", sortOrder: 4 },
  { section: "CUSTOMER", label: "سوالات متداول", url: "/info/faq", sortOrder: 5 },
  { section: "CUSTOMER", label: "قوانین و مقررات", url: "/info/terms", sortOrder: 6 },
  { section: "CUSTOMER", label: "حریم خصوصی", url: "/info/privacy", sortOrder: 7 },
  { section: "STORE", label: "درباره ما", url: "/info/about", sortOrder: 1 },
  { section: "STORE", label: "تماس با ما", url: "/contact", sortOrder: 2 },
  { section: "STORE", label: "فروشگاه", url: "/products", sortOrder: 3 },
  { section: "STORE", label: "محصولات", url: "/products?sort=newest", sortOrder: 4 },
  { section: "STORE", label: "خدمات", url: "/info/customer-service", sortOrder: 5 },
];

const SHOWCASES: {
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
  buttonUrl: string;
  badge: string;
  sortOrder: number;
}[] = [
  {
    title: "دنیای گیمینگ تاج",
    subtitle: "کنسول‌های نسل جدید، مانیتورهای ۲۴۰ هرتز و لوازم حرفه‌ای — با ضمانت اصالت کالا",
    image: "/uploads/showcase/showcase-gaming.png",
    buttonText: "ورود به دنیای گیمینگ",
    buttonUrl: "/products?category=console",
    badge: "گیمینگ",
    sortOrder: 0,
  },
  {
    title: "گجت‌های هوشمند",
    subtitle: "پرچمدارهای موبایل، ساعت‌های هوشمند و هدفون‌ها با مشاوره خرید هوش مصنوعی",
    image: "/uploads/showcase/showcase-smart.png",
    buttonText: "مشاهده گجت‌ها",
    buttonUrl: "/products?category=mobile",
    badge: "هوشمند",
    sortOrder: 1,
  },
];

export async function seedContent() {
  // 1) CMS pages — create-if-missing (never overwrite admin edits)
  let pages = 0;
  for (const p of CMS_PAGES) {
    const exists = await db.cmsPage.findUnique({ where: { slug: p.slug } });
    if (!exists) {
      await db.cmsPage.create({
        data: { slug: p.slug, title: p.title, icon: p.icon, sections: JSON.stringify(p.sections), sortOrder: p.sortOrder, isActive: true },
      });
      pages++;
    }
  }
  console.log(`  ✓ CMS pages (${pages} created, ${CMS_PAGES.length - pages} already present)`);

  // 2) Footer links — only if table is empty
  const footerCount = await db.footerLink.count();
  if (footerCount === 0) {
    await db.footerLink.createMany({ data: FOOTER_LINKS });
    console.log(`  ✓ footer links (${FOOTER_LINKS.length})`);
  } else {
    console.log("  ✓ footer links (already present)");
  }

  // 3) Showcases — only if table is empty
  const showcaseCount = await db.promotionalShowcase.count();
  if (showcaseCount === 0) {
    await db.promotionalShowcase.createMany({ data: SHOWCASES });
    console.log(`  ✓ showcases (${SHOWCASES.length})`);
  } else {
    console.log("  ✓ showcases (already present)");
  }

  // 4) Stories — only if table is empty; link to REAL products/categories
  const storyCount = await db.story.count();
  if (storyCount === 0) {
    const [consoleCat, mobileCat, iphone] = await Promise.all([
      db.category.findUnique({ where: { slug: "console" } }),
      db.category.findUnique({ where: { slug: "mobile" } }),
      db.product.findFirst({ where: { slug: { contains: "iphone" } }, orderBy: { price: "desc" } }),
    ]);
    await db.story.createMany({
      data: [
        {
          title: "جشنواره طلایی", image: "/uploads/sliders/slide-gold-tech.png",
          linkUrl: "/products?discount=1", badge: "تخفیف", sortOrder: 0,
        },
        {
          title: "کنسول‌های بازی", image: "/uploads/sliders/slide-gaming.png",
          categoryId: consoleCat?.id ?? null, badge: "گیمینگ", sortOrder: 1,
        },
        {
          title: "گجت‌های هوشمند", image: "/uploads/sliders/slide-smart.png",
          categoryId: mobileCat?.id ?? null, badge: "جدید", sortOrder: 2,
        },
        ...(iphone
          ? [{
              title: "پرچمدار موبایل", image: iphone.mainImage ?? "/uploads/sliders/slide-smart.png",
              productId: iphone.id, badge: "پرچمدار", sortOrder: 3,
            }]
          : []),
      ],
    });
    console.log(`  ✓ stories (${iphone ? 4 : 3})`);
  } else {
    console.log("  ✓ stories (already present)");
  }

  // 5) Theme default
  const theme = await db.themeSettings.findUnique({ where: { id: "main" } });
  if (!theme) {
    await db.themeSettings.create({ data: { id: "main", themeId: "gold", colorMode: "light" } });
    console.log("  ✓ theme settings (gold / light)");
  } else {
    console.log("  ✓ theme settings (already present)");
  }
}

// standalone execution
if (import.meta.main) {
  seedContent()
    .then(() => {
      console.log("✅ Content defaults complete");
      process.exit(0);
    })
    .catch((e) => {
      console.error("❌ Content seed failed:", e);
      process.exit(1);
    });
}
