import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour les headers de sécurité
  async headers() {
    return [
      {
        // Application des headers à toutes les routes
        source: "/(.*)",
        headers: [
          // Content Security Policy - CORRIGÉE pour Firebase Auth complet
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://s.ytimg.com http://www.youtube.com https://apis.google.com https://accounts.google.com https://gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://firestore.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://region1.google-analytics.com https://accounts.google.com https://oauth2.googleapis.com",
              "media-src 'self' https://www.youtube.com https://youtube.com",
              "frame-src 'self' https://www.youtube.com https://youtube.com https://accounts.google.com https://blindtest-c1cdc.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          // HTTP Strict Transport Security (seulement en production)
          {
            key: "Strict-Transport-Security",
            value:
              process.env.NODE_ENV === "production"
                ? "max-age=31536000; includeSubDomains; preload"
                : "max-age=0",
          },
          // Cross-Origin-Opener-Policy pour permettre OAuth
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          // Cross-Origin-Embedder-Policy
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          // Prevent clickjacking (assouplir pour OAuth)
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // XSS Protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer Policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions Policy
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "interest-cohort=()",
              "payment=()",
              "usb=()",
              "bluetooth=()",
              "magnetometer=()",
              "gyroscope=()",
              "accelerometer=()",
            ].join(", "),
          },
          // Remove server information
          {
            key: "Server",
            value: "BlindTest",
          },
          // Prevent caching of sensitive pages
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, private",
          },
        ],
      },
      // Headers spécifiques pour les API routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-API-Version",
            value: "1.0",
          },
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "production"
                ? "https://blindtest.vercel.app"
                : "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "X-Rate-Limit-Limit",
            value: "100",
          },
          {
            key: "X-Rate-Limit-Remaining",
            value: "99",
          },
          {
            key: "X-Rate-Limit-Reset",
            value: new Date(Date.now() + 3600000).toISOString(),
          },
        ],
      },
    ];
  },

  // Configuration des redirections de sécurité (seulement en production)
  async redirects() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    return [
      // Redirection HTTPS en production
      {
        source: "/:path*",
        has: [
          {
            type: "header",
            key: "x-forwarded-proto",
            value: "http",
          },
        ],
        destination: "https://blindtest.vercel.app/:path*",
        permanent: true,
      },
    ];
  },

  // Configuration générale
  reactStrictMode: true,
  
  // Désactiver le télémetry pour éviter les problèmes de permissions
  telemetry: false,

  // Configuration des domaines d'images autorisés
  images: {
    domains: [
      "lh3.googleusercontent.com", // Google OAuth avatars
      "firebasestorage.googleapis.com", // Firebase Storage
      "i.ytimg.com", // YouTube thumbnails
      "yt3.ggpht.com", // YouTube channel avatars
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Configuration des variables d'environnement
  env: {
    CUSTOM_API_VERSION: "1.0.0",
    SECURITY_LEVEL: "HIGH",
  },
};

export default nextConfig;
