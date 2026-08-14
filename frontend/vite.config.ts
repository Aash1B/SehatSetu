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
      registerType: 'autoUpdate',
      includeAssets: [
        'logo.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'maskable-icon-192x192.png',
        'maskable-icon-512x512.png',
        'offline.html',
      ],
      manifest: {
        name: 'SehatSetu',
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
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/ehr\//,
          /^\/chatbot\//,
          /^\/payments\//,
          /^\/account\//,
          /^\/hospitals\//,
          /^\/sagas\//,
          /^\/slots\//,
          /\.[a-z0-9]+$/i,
        ],
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
                pathname.startsWith('/ehr') ||
                pathname.startsWith('/chatbot') ||
                pathname.startsWith('/payments') ||
                pathname.startsWith('/account') ||
                pathname.startsWith('/hospitals') ||
                pathname.startsWith('/sagas') ||
                pathname.startsWith('/slots') ||
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
  optimizeDeps: {
    include: ['i18next', 'react-i18next', 'i18next-http-backend', 'i18next-browser-languagedetector'],
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ehr': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/chatbot': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/payments': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/account': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/hospitals': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/sagas': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/slots': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
