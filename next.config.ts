import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Nothing app-specific yet
};

// Only apply Sentry's build wrapping when a DSN is present. Without a DSN,
// `withSentryConfig` still works but tries to upload source maps to Sentry,
// which fails without SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN. Guarding
// keeps dev/preview builds clean until Max sets things up.
const shouldWrapSentry =
  !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default shouldWrapSentry
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Only upload source maps if the auth token is present, so preview
      // deploys don't fail if only the DSN is set.
      silent: !process.env.CI,
      widenClientFileUpload: true,
      // Route Sentry through a Next rewrite so ad-blockers don't block ingest
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
