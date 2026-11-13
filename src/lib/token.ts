/**
 * Holds the Clerk token provider without importing Clerk itself, so the Clerk
 * bundle stays out of the main chunk when it is not needed.
 */
let liveTokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(provider: (() => Promise<string | null>) | null): void {
  liveTokenProvider = provider;
}

export function currentTokenProvider(): (() => Promise<string | null>) | null {
  return liveTokenProvider;
}
