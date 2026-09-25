// Tests the browser-extension content-script extraction logic using Deno +
// deno_dom to simulate a `document`. The functions in content-extract.js are
// plain DOM code with no chrome.* or Deno-specific APIs, so this is a
// faithful stand-in for how they behave inside a real tab.
// @ts-ignore
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
// @ts-ignore
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"
import { extractPrice, extractImage, extractTitle, extractProductData } from "./content-extract.js"

function parse(html: string) {
  return new DOMParser().parseFromString(html, "text/html")
}

// ── Amazon ────────────────────────────────────────────────────────────
// Pattern confirmed against a real amazon.in product page this session.

Deno.test("Amazon: extracts title, price, and image", () => {
  const doc = parse(`<html><head>
      <title>Apple iPhone 15 (128 GB)</title>
    </head><body>
      <span class="a-price"><span class="a-offscreen">₹25,999.00</span></span>
      <img id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/71v2jVh6nIL._SL1500_.jpg" src="thumb.jpg" />
    </body></html>`)
  assertEquals(extractTitle(doc), "Apple iPhone 15 (128 GB)")
  assertEquals(extractPrice(doc), 25999)
  assertEquals(extractImage(doc), "https://m.media-amazon.com/images/I/71v2jVh6nIL._SL1500_.jpg")
})

// ── Flipkart ──────────────────────────────────────────────────────────
// Pattern confirmed against a real flipkart.com product page this session.

Deno.test("Flipkart: extracts title, price, and image", () => {
  const doc = parse(`<html><head>
      <title>Sparx SM 323 Sneakers For Men - Flipkart.com</title>
    </head><body>
      <div class="_30jeq3">₹728</div>
      <img class="q6DClP" src="https://rukminim2.flixcart.com/image/300/300/shoe.jpeg" />
    </body></html>`)
  assertEquals(extractTitle(doc), "Sparx SM 323 Sneakers For Men - Flipkart.com")
  assertEquals(extractPrice(doc), 728)
  assertEquals(extractImage(doc), "https://rukminim2.flixcart.com/image/300/300/shoe.jpeg")
})

// ── Myntra ────────────────────────────────────────────────────────────
// Pattern confirmed against a real myntra.com product page this session
// (og:image present; price/title via JSON-LD Product schema).

Deno.test("Myntra: extracts title, price, and image via og:image + JSON-LD", () => {
  const doc = parse(`<html><head>
      <meta property="og:image" content="https://assets.myntassets.com/prod.jpg" />
      <script type="application/ld+json">
        {"@type":"Product","name":"WRODSS Men Colourblocked T Shirt","offers":{"price":"294"}}
      </script>
    </head></html>`)
  assertEquals(extractTitle(doc), "WRODSS Men Colourblocked T Shirt")
  assertEquals(extractPrice(doc), 294)
  assertEquals(extractImage(doc), "https://assets.myntassets.com/prod.jpg")
})

// ── Nykaa ─────────────────────────────────────────────────────────────
// BEST-EFFORT: Nykaa blocks plain server-side fetches (confirmed Akamai
// edge block), so this fixture is modeled on the JSON-LD Product schema
// most e-commerce sites emit for SEO, not verified against Nykaa's actual
// real-page HTML. Needs live confirmation once the extension runs in a
// real logged-in tab.

Deno.test("Nykaa: extracts via JSON-LD Product schema (unverified against real page)", () => {
  const doc = parse(`<html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Estee Lauder Advanced Night Repair","image":"https://images-static.nykaa.com/prod.jpg","offers":{"price":"3450"}}
      </script>
    </head></html>`)
  assertEquals(extractTitle(doc), "Estee Lauder Advanced Night Repair")
  assertEquals(extractPrice(doc), 3450)
  assertEquals(extractImage(doc), "https://images-static.nykaa.com/prod.jpg")
})

// ── Meesho ────────────────────────────────────────────────────────────
// BEST-EFFORT: same caveat as Nykaa — Meesho also hard-blocks server-side
// fetches (confirmed, same Akamai block), fixture modeled on JSON-LD.

Deno.test("Meesho: extracts via JSON-LD Product schema (unverified against real page)", () => {
  const doc = parse(`<html><head>
      <script type="application/ld+json">
        {"@type":"Product","name":"Men Colourblocked T-Shirt","image":"https://images.meesho.com/prod.webp","offers":{"price":"249"}}
      </script>
    </head></html>`)
  assertEquals(extractTitle(doc), "Men Colourblocked T-Shirt")
  assertEquals(extractPrice(doc), 249)
  assertEquals(extractImage(doc), "https://images.meesho.com/prod.webp")
})

// ── Instamart ─────────────────────────────────────────────────────────
// LEAST CERTAIN of the six: quick-commerce apps are pincode/session-gated
// and typically not SEO-optimized the way catalog sites are, so JSON-LD
// may not even be present on a real page. This fixture is a placeholder
// for the generic fallback path — treat as unverified until tested live.

Deno.test("Instamart: falls back to og:image/twitter:image when present (unverified against real page)", () => {
  const doc = parse(`<html><head>
      <meta property="og:title" content="Amul Butter 500g" />
      <meta property="og:image" content="https://instamart-media.swiggy.com/butter.jpg" />
      <meta property="og:price:amount" content="265" />
    </head></html>`)
  assertEquals(extractTitle(doc), "Amul Butter 500g")
  assertEquals(extractPrice(doc), 265)
  assertEquals(extractImage(doc), "https://instamart-media.swiggy.com/butter.jpg")
})

Deno.test("Instamart: extraction yields nothing usable when no recognizable data is present", () => {
  // Documents the realistic worst case: a client-rendered shell with no
  // meta tags and no JSON-LD at all — the extension would need to wait
  // for the page's JS to render before re-running extraction, which is a
  // known limitation to validate once this runs against the real app.
  const doc = parse(`<html><head><title>Instamart</title></head><body></body></html>`)
  assertEquals(extractPrice(doc), 0)
  assertEquals(extractImage(doc), null)
})

// ── extractProductData ───────────────────────────────────────────────

Deno.test("extractProductData resolves a relative image URL against the page origin", () => {
  const doc = parse(`<html><head>
      <meta property="og:image" content="/img/prod.jpg" />
    </head></html>`)
  const result = extractProductData(doc, "https://www.example.com/product/123")
  assertEquals(result.image, "https://www.example.com/img/prod.jpg")
})

Deno.test("extractProductData returns nulls/zero when nothing matches", () => {
  const doc = parse(`<html><head><title>Access Denied</title></head></html>`)
  const result = extractProductData(doc, "https://www.example.com/product/123")
  assertEquals(result.price, 0)
  assertEquals(result.image, null)
})
