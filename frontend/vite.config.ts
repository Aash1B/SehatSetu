import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'logo.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'maskable-icon-192x192.png',
        'maskable-icon-512x512.png',
        'offline.html',
      ],
      manifest: {
        name: 'SehatSetu - Healthcare Portal',
        short_name: 'SehatSetu',
        description: 'Connect with verified doctors, book online consultations, manage prescriptions, and access medical records on SehatSetu.',
        theme_color: '#863bff',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['medical', 'health', 'productivity', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Security constraint: Exclude all sensitive API routes, auth routes, Supabase, LiveKit, Razorpay, WebRTC
            urlPattern: ({ url }) => {
              const pathname = url.pathname;
              const href = url.href;
              return (
                pathname.startsWith('/api') ||
                pathname.startsWith('/auth') ||
                href.includes('supabase.co') ||
                href.includes('livekit') ||
                href.includes('razorpay') ||
                href.includes('agora') ||
                href.includes('socket.io')
              );
            },
            handler: 'NetworkOnly',
          },
          {
            // Cache static Google Fonts safely
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
