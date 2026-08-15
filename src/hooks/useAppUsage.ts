import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePremium } from "./usePremium";

export const useAppUsage = () => {
  const { premium, loading } = usePremium();
  const navigate = useNavigate();
  const location = useLocation();

  const [usageCount, setUsageCount] = useState(() => 
    parseInt(localStorage.getItem("shopgo_usage_count") || "0", 10)
  );

  useEffect(() => {
    // Only count once per browser session
    if (sessionStorage.getItem("shopgo_session_counted")) return;
    sessionStorage.setItem("shopgo_session_counted", "true");

    const currentCount = parseInt(localStorage.getItem("shopgo_usage_count") || "0", 10);
    const newCount = currentCount + 1;
    localStorage.setItem("shopgo_usage_count", newCount.toString());
    setUsageCount(newCount);

    if (!premium && newCount === 11) {
      toast.warning(
        "Je hebt de app 10 keer gratis gebruikt. Vanaf nu heb je Premium nodig. Je kan de app nog 1x gratis gebruiken.",
        { duration: 8000 }
      );
    }
  }, [premium]);

  useEffect(() => {
    if (loading) return;
    
    const allowedRoutes = ["/premium", "/auth", "/over", "/privacy"];
    const isAllowed = allowedRoutes.includes(location.pathname);

    // 11th time is the last allowed usage. 12th time is blocked.
    if (!premium && usageCount >= 12 && !isAllowed) {
      toast.error("Je gratis beurten zijn op. Neem Premium om verder te gaan.", { id: "paywall-toast" });
      navigate("/premium", { replace: true });
    }
  }, [premium, usageCount, location.pathname, navigate, loading]);

  return { usageCount, isBlocked: !premium && usageCount >= 12 };
};
