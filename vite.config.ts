import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "worker" } }),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      includeAssets: ["icons/*.png", "mascot/*.webp"],
      manifest: {
        id: "/",
        name: "Spendly",
        short_name: "Spendly",
        description: "Ton compagnon argent au quotidien. Trois taps, une idée claire de ce que tu peux dépenser.",
        lang: "fr",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#FAF7F0",
        background_color: "#FAF7F0",
        categories: ["finance", "productivity", "lifestyle"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Ajouter une dépense", url: "/today?add=1" },
          { name: "Mes statistiques", url: "/stats" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,webp,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/mascot/") || url.pathname.startsWith("/icons/"),
            handler: "CacheFirst",
            options: {
              cacheName: "spendly-static-assets",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "spendly-api",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    sentryAuthToken
      ? sentryVitePlugin({
          authToken: sentryAuthToken,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          sourcemaps: { assets: "./dist/client/**/*.js" },
          release: { name: process.env.SENTRY_RELEASE, inject: true },
          telemetry: false,
          silent: true,
        })
      : undefined,
  ].filter(Boolean),
  environments: {
    worker: {
      build: { sourcemap: true },
    },
  },
  build: {
    target: "es2022",
  },
});
