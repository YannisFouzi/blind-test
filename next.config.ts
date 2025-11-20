import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const appBaseUrl =
  process.env.APP_BASE_URL ??
  (isProd
    ? "https://blindtest.vercel.app"
    : "http://localhost:3000");

const normalizedAppBaseUrl = appBaseUrl.replace(/\/$/, "");

const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://s.ytimg.com https://apis.google.com https://accounts.google.com https://gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://firestore.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://region1.google-analytics.com https://accounts.google.com https://oauth2.googleapis.com;
  media-src 'self' https://www.youtube.com;
  frame-src 'self' https://www.youtube.com https://accounts.google.com https://blindtest-c1cdc.firebaseapp.com;
  frame-ancestors 'self' https://accounts.google.com https://blindtest-c1cdc.firebaseapp.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "Strict-Transport-Security",
    value: isProd ? "max-age=63072000; includeSubDomains; preload" : "max-age=0",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "credentialless",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
];

const apiHeaders = [
  {
    key: "Access-Control-Allow-Origin",
    value: normalizedAppBaseUrl,
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
    key: "Access-Control-Allow-Credentials",
    value: "true",
  },
  {
    key: "Cache-Control",
    value: "no-store",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    if (!isProd) {
      return [];
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: apiHeaders,
      },
    ];
  },

  async redirects() {
    if (!isProd) {
      return [];
    }

    return [
      {
        source: "/:path*",
        has: [
          {
            type: "header",
            key: "x-forwarded-proto",
            value: "http",
          },
        ],
        destination: `${normalizedAppBaseUrl}/:path*`,
        permanent: true,
      },
    ];
  },

  reactStrictMode: true,

  images: {
    domains: [
      "lh3.googleusercontent.com",
      "firebasestorage.googleapis.com",
      "i.ytimg.com",
      "yt3.ggpht.com",
    ],
    contentSecurityPolicy:
      "default-src 'self'; img-src 'self' data: https:; script-src 'none'; style-src 'unsafe-inline'; sandbox;",
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
  },
};

export default nextConfig;
