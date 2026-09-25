// Platforms confirmed to block or degrade scrape-product's server-side
// fetch from Supabase's actual production IP range (not just a local test
// environment — Flipkart/Myntra looked fine locally but return a fake
// maintenance page / HTTP 529 specifically to Supabase's IP in production).
// Amazon was added after live verification showed its price now renders
// client-side only — the static HTML has title/image via Open Graph tags
// but an empty price container, so no selector can recover it server-side.
// Mirrors extension/background.js's own list — duplicated rather than
// shared, since the extension and the Angular app are separate deployable
// units with no shared build step.
const BLOCKED_PLATFORM_HOSTS = ['amazon.in', 'nykaa.com', 'meesho.com', 'swiggy.com', 'flipkart.com', 'myntra.com'];

export function isBlockedPlatformUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return BLOCKED_PLATFORM_HOSTS.some((h) => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}
