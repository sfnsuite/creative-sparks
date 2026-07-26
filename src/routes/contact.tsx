import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { shopConfig } from "@/config/shop";
import { MessageCircle, Mail, Phone, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `تواصل معنا — ${shopConfig.name}` },
      {
        name: "description",
        content: "تواصل مع خياطة الأصالة - استفسر عن المنتجات أو اطلب خدمات مخصصة",
      },
    ],
  }),
  component: ContactPage,
});

interface ContactFormData {
  full_name: string;
  phone: string;
  email?: string;
  inquiry_type: "general" | "custom" | "wholesale";
  message: string;
}

function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    full_name: "",
    phone: "",
    email: "",
    inquiry_type: "general",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitInquiry = async (data: ContactFormData) => {
    // Store in wholesale_leads table with product_type as inquiry_type
    const { error } = await supabase.from("wholesale_leads").insert([
      {
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        product_type: data.inquiry_type === "custom" ? "Custom Design" : 
                      data.inquiry_type === "wholesale" ? "Wholesale" : "General",
        message: data.message,
        status: "pending",
      },
    ]);

    if (error) throw error;
    return true;
  };

  const mutation = useMutation({
    mutationFn: submitInquiry,
    onSuccess: () => {
      toast.success("شكراً! تم استقبال طلبك. سنتواصل معك قريباً.");
      setFormData({
        full_name: "",
        phone: "",
        email: "",
        inquiry_type: "general",
        message: "",
      });
    },
    onError: (error) => {
      console.error("[Contact] Submit error:", error);
      toast.error("حدث خطأ، يرجى المحاولة لاحقاً");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error("الرجاء إدخال الاسم");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف");
      return;
    }

    if (!formData.message.trim()) {
      toast.error("الرجاء إدخال الرسالة");
      return;
    }

    mutation.mutate(formData);
  };

  const inquiryTypes = [
    { value: "general", label: "استفسار عام" },
    { value: "custom", label: "طلب خياطة مخصصة" },
    { value: "wholesale", label: "طلب جملة" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent px-4 py-12 md:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">
              تواصل معنا
            </h1>
            <p className="mt-4 text-lg text-foreground/70">
              لدينا فريق جاهز للإجابة على جميع استفساراتك
            </p>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">الهاتف</h3>
              <p className="mt-2 text-sm text-foreground/70">
                {shopConfig.whatsappNumber}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">واتساب</h3>
              <a
                href={`https://wa.me/${shopConfig.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                راسل على واتساب
              </a>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">الموقع</h3>
              <p className="mt-2 text-sm text-foreground/70">{shopConfig.city}</p>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-8">
              <h2 className="mb-6 text-2xl font-bold">أرسل لنا رسالة</h2>

              {/* Inquiry Type */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold">نوع الاستفسار</label>
                <div className="grid gap-3 md:grid-cols-3">
                  {inquiryTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          inquiry_type: type.value as ContactFormData["inquiry_type"],
                        })
                      }
                      className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                        formData.inquiry_type === type.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label htmlFor="name" className="mb-2 block text-sm font-semibold">
                  الاسم الكامل
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="أدخل اسمك"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Phone */}
              <div className="mb-6">
                <label htmlFor="phone" className="mb-2 block text-sm font-semibold">
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0612345678"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Message */}
              <div className="mb-6">
                <label htmlFor="message" className="mb-2 block text-sm font-semibold">
                  الرسالة
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="أخبرنا عن استفسارك..."
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    أرسل الآن
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
