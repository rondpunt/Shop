import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./best-of-v2.css";
import { registerSW } from "virtual:pwa-register";

import { supabase } from "@/integrations/supabase/client";

if (window.opener && window.opener !== window) {
  const notifyAndClose = (session: any) => {
    const payload = {
      type: "SUPABASE_AUTH_SUCCESS",
      session: { access_token: session.access_token, refresh_token: session.refresh_token },
    };
    try { window.opener.postMessage(payload, window.location.origin); }
    catch { window.opener.postMessage(payload, "*"); }
    window.close();
  };

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) notifyAndClose(session);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      notifyAndClose(session);
      subscription.unsubscribe();
    }
  });

  setTimeout(() => window.close(), 15000);
}

registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("shopgo:pwa-update"));
  },
  onOfflineReady() {
    console.log("Shop&Go is offline klaar");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
