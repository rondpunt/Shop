import { toast } from "sonner";

export const shareApp = async () => {
  const url = window.location.origin;
  const shareData = {
    title: "Kortrijk Shop&Go",
    text: "Probeer Kortrijk Shop&Go — een handige reminder voor je 30 minuten gratis parkeren in Kortrijk:",
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (e) {
      // User cancelled — silent
      if ((e as Error)?.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${shareData.text} ${url}`);
    toast.success("Link gekopieerd", { description: "Plak hem in WhatsApp, sms of e-mail." });
  } catch {
    toast.error("Kon de link niet kopiëren");
  }
};
