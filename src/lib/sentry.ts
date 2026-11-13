/**
 * Sentry is loaded a moment after the first paint: the app must open fast on
 * a slow connection, and most errors happen after the user starts tapping.
 */

import * as Sentry from "@sentry/react";

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    environment: import.meta.env.MODE,
    // No personal data leaves the device: no name, no email, no phone number.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations: [
      Sentry.replayIntegration({
        maskAllInputs: true,
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
