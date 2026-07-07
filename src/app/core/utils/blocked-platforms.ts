// Platforms confirmed to block or degrade scrape-product's server-side
// fetch from Supabase's actual production IP range (not just a local test
// environment — Flipkart/Myntra looked fine locally but return a fake
// maintenance page / HTTP 529 specifically to Supabase's IP in production).
// Mirrors extension/background.js's own list — duplicated rather than
// shared, since the extension and the Angular app are separate deployable
// units with no shared build step.
const BLOCKED_PLATFORM_HOSTS = ['nykaa.com', 'meesho.com', 'swiggy.com', 'flipkart.com', 'myntra.com'];

export function isBlockedPlatformUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return BLOCKED_PLATFORM_HOSTS.some((h) => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}
