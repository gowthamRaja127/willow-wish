// Pure DOM-extraction helpers — no chrome.* APIs, so this file works
// unmodified as a content script AND is directly testable under Deno+deno_dom
// (see content-extract.test.ts). Mirrors the equivalent logic in
// supabase/functions/scrape-product/index.ts; kept as a separate copy since
// the two run in entirely different runtimes (Deno edge function vs. MV3
// content script) with no shared build step.

export function extractJsonLdProduct(doc) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    let parsed
    try {
      parsed = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    const candidates = Array.isArray(parsed) ? parsed : parsed?.['@graph'] ? parsed['@graph'] : [parsed]
    for (const node of candidates) {
      const type = node?.['@type']
      const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'))
      if (!isProduct) continue

      const rawImage = node.image
      const image = Array.isArray(rawImage) ? rawImage[0] : (typeof rawImage === 'object' ? rawImage?.url : rawImage)

      const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers
      const rawPrice = offers?.price ?? offers?.priceSpecification?.price
      const price = rawPrice != null ? parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) : undefined

      return { name: node.name, image, price: price && price > 0 ? price : undefined }
    }
  }
  return null
}

export function extractPrice(doc) {
  // Standard Open Graph
  const ogPrice = doc.querySelector('meta[property="og:price:amount"]')?.getAttribute('content')
  if (ogPrice) {
    const n = parseFloat(ogPrice.replace(/[^0-9.]/g, ''))
    if (n > 0) return n
  }

  // Amazon
  const amzSelectors = [
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price .a-offscreen',
    '#price_inside_buybox',
    '#apex_desktop_newAccordionRow .a-price .a-offscreen',
  ]
  for (const sel of amzSelectors) {
    const el = doc.querySelector(sel)
    if (el?.textContent) {
      const n = parseFloat(el.textContent.replace(/[^0-9.]/g, ''))
      if (n > 0) return n
    }
  }

  // Flipkart
  const fkEl = doc.querySelector('._30jeq3')
  if (fkEl?.textContent) {
    const n = parseFloat(fkEl.textContent.replace(/[^0-9.]/g, ''))
    if (n > 0) return n
  }

  // Nykaa/Meesho/Instamart don't have confirmed-stable selectors (their
  // pages block plain server-side fetches, so we can't inspect real HTML
  // ahead of time) — JSON-LD Product schema is the reliable, site-agnostic
  // fallback most storefronts emit for SEO/Google Shopping regardless of
  // client-rendering, and is where these three are expected to resolve.
  const jsonLd = extractJsonLdProduct(doc)
  if (jsonLd?.price) return jsonLd.price

  return 0
}

export function extractImage(doc) {
  const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
  if (og) return og

  // Amazon high-res image
  const amzImg = doc.querySelector('#landingImage')?.getAttribute('data-old-hires')
    || doc.querySelector('#landingImage')?.getAttribute('src')
  if (amzImg) return amzImg

  // Flipkart
  const fkImg = doc.querySelector('img.q6DClP')?.getAttribute('src')
  if (fkImg) return fkImg

  // Nykaa/Meesho/Instamart — see extractPrice's comment; JSON-LD/Twitter
  // Card are the generic fallbacks for sites without a confirmed selector.
  const jsonLd = extractJsonLdProduct(doc)
  if (jsonLd?.image) return jsonLd.image

  const twitterImg = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
  if (twitterImg) return twitterImg

  return null
}

export function extractTitle(doc) {
  return doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    || extractJsonLdProduct(doc)?.name
    || doc.querySelector('title')?.textContent
    || null
}

/**
 * Run all three extractors and resolve any relative image URL against the
 * page's own origin (a live tab's <img>/meta src is normally already
 * absolute, but this matches the edge function's defensive handling).
 */
export function extractProductData(doc, pageUrl) {
  const title = extractTitle(doc)
  const price = extractPrice(doc)
  let image = extractImage(doc)

  if (image && !image.startsWith('http://') && !image.startsWith('https://')) {
    try {
      image = new URL(image, new URL(pageUrl).origin).href
    } catch {
      // leave as-is if the URL can't be resolved
    }
  }

  return { title, price, image }
}
