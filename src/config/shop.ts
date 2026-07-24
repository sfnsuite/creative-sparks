/**
 * إعدادات المتجر — بدل هاد الملف باش تخصص التومبلات لكلاينت جديد.
 * Shop template config — edit this file to reuse the template for a new client.
 */
export const shopConfig = {
  name: "خياطة الأصالة",
  tagline: "خياطة مغربية أصيلة، بلمسة عصرية",
  description:
    "محل خياطة يصنع ملابس جاهزة، تصاميم على المقاس، وإنتاج بالجملة للتجار.",
  currency: "MAD",
  currencySymbol: "درهم",
  locale: "ar-MA",
  whatsappNumber: "+212600000000", // رقم الواتساب (بدلو برقم المحل)
  city: "الدار البيضاء",
  // فعّل/عطّل الخدمات حسب الكلاينت
  services: {
    readyToBuy: true, // شراء منتجات جاهزة
    customDesign: true, // تصميم موديل خاص
    wholesale: true, // إنتاج بالجملة B2B
  },
  social: {
    instagram: "",
    facebook: "",
  },
} as const;

export type ShopConfig = typeof shopConfig;
