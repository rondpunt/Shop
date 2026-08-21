import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: { overlay: false },
    allowedHosts: [".replit.dev", ".worf.replit.dev", "localhost", "127.0.0.1"],
  },
  define: {
    "process.env.GOOGLE_MAPS_PLATFORM_KEY": JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || ""),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "app-icon-512.png"],
      manifest: {
        id: "/",
        name: "Shop&Go Kortrijk",
        short_name: "Shop&Go",
        description: "Vind live Shop&Go-plaatsen, start je 30-minutentimer en zie communitysignalen in Kortrijk.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0d1020",
        theme_color: "#0d1020",
        categories: ["navigation", "utilities", "travel"],
        icons: [
          { src: "app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Vind parking", short_name: "Kaart", url: "/", icons: [{ src: "app-icon-512.png", sizes: "512x512" }] },
          { name: "Historiek", short_name: "Historiek", url: "/historiek", icons: [{ src: "app-icon-512.png", sizes: "512x512" }] },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname === "/api/parko-states",
            handler: "NetworkFirst",
            options: { cacheName: "parko-live", networkTimeoutSeconds: 4, expiration: { maxEntries: 4, maxAgeSeconds: 120 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "supabase-api-cache", networkTimeoutSeconds: 5, expiration: { maxEntries: 50, maxAgeSeconds: 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-styles", expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-files", expiration: { maxEntries: 20, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-tooltip", "@radix-ui/react-dialog", "@radix-ui/react-slot", "lucide-react", "sonner", "clsx", "tailwind-merge"],
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
  resolve: {
    // Clerk lives one level above this isolated working copy during development.
    // Pin React imports to one renderer instance so hooks share the same context.
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
