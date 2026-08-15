import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

import { supabase } from "@/integrations/supabase/client";

// If this window is an OAuth popup opened by our application, notify the opener and close
if (window.opener && window.opener !== window) {
  const notifyAndClose = (session: any) => {
    const payload = {
      type: "SUPABASE_AUTH_SUCCESS",
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }
    };
    try {
      window.opener.postMessage(payload, window.location.origin);
    } catch (e) {
      window.opener.postMessage(payload, "*");
    }
    window.close();
  };

  // Watch for the active session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      notifyAndClose(session);
    }
  });

  // Also listen for auth state changes (e.g. when token hash is parsed and state becomes SIGNED_IN)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      notifyAndClose(session);
      subscription.unsubscribe();
    }
  });

  // Safety fallback timeout to prevent popup hanging forever if auth fails
  setTimeout(() => {
    window.close();
  }, 15000);
}

const updateSW = registerSW({
  onNeedRefresh() {
    // Optionally alert the user here
  },
  onOfflineReady() {
    console.log("App is ready to work offline");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
