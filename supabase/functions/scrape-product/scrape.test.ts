// @ts-ignore
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
// @ts-ignore
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"
import {
  isAllowedProductUrl,
  extractJsonLdProduct,
  extractPrice,
  extractImage,
} from "./index.ts"

function parse(html: string) {
  return new DOMParser().parseFromString(html, "text/html")
}

// ── isAllowedProductUrl ──────────────────────────────────────────────

Deno.test("isAllowedProductUrl allows ordinary public https URLs", () => {
  assertEquals(isAllowedProductUrl("https://www.amazon.in/dp/B0CHX3TW6X"), true)
})

Deno.test("isAllowedProductUrl rejects non-http(s) protocols", () => {
  assertEquals(isAllowedProductUrl("ftp://example.com/product"), false)
  assertEquals(isAllowedProductUrl("javascript:alert(1)"), false)
})

Deno.test("isAllowedProductUrl blocks localhost and loopback", () => {
  assertEquals(isAllowedProductUrl("http://localhost:8080/admin"), false)
  assertEquals(isAllowedProductUrl("http://127.0.0.1/admin"), false)
})

Deno.test("isAllowedProductUrl blocks private IPv4 ranges", () => {
  assertEquals(isAllowedProductUrl("http://10.0.0.5/internal"), false)
  assertEquals(isAllowedProductUrl("http://192.168.1.1/router"), false)
  assertEquals(isAllowedProductUrl("http://169.254.169.254/latest/meta-data"), false)
})

Deno.test("isAllowedProductUrl blocks raw IPv6 literals", () => {
  assertEquals(isAllowedProductUrl("http://[::1]/admin"), false)
})

Deno.test("isAllowedProductUrl blocks .local/.internal hostnames", () => {
  assertEquals(isAllowedProductUrl("http://printer.local/"), false)
  assertEquals(isAllowedProductUrl("http://service.internal/"), false)
})

// ── extractJsonLdProduct ──────────────────────────────────────────────

Deno.test("extractJsonLdProduct reads a plain Product node", () => {
  const doc = parse(`<html><head>
    <script type="application/ld+json">
      {"@type":"Product","name":"Test Widget","image":"https://example.com/w.jpg","offers":{"price":"499.00"}}
    </script>
  </head></html>`)
  const result = extractJsonLdProduct(doc)
  assertEquals(result?.name, "Test Widget")
  assertEquals(result?.image, "https://example.com/w.jpg")
  assertEquals(result?.price, 499)
})

Deno.test("extractJsonLdProduct unwraps @graph arrays", () => {
  const doc = parse(`<html><head>
    <script type="application/ld+json">
      {"@graph":[{"@type":"BreadcrumbList"},{"@type":"Product","name":"Graph Widget","offers":[{"price":"120"}]}]}
    </script>
  </head></html>`)
  const result = extractJsonLdProduct(doc)
  assertEquals(result?.name, "Graph Widget")
  assertEquals(result?.price, 120)
})

Deno.test("extractJsonLdProduct handles a top-level array of nodes", () => {
  const doc = parse(`<html><head>
    <script type="application/ld+json">
      [{"@type":"Organization"},{"@type":"Product","name":"Array Widget","offers":{"price":"77"}}]
    </script>
  </head></html>`)
  const result = extractJsonLdProduct(doc)
  assertEquals(result?.name, "Array Widget")
  assertEquals(result?.price, 77)
})

Deno.test("extractJsonLdProduct returns null when no Product node exists", () => {
  const doc = parse(`<html><head>
    <script type="application/ld+json">{"@type":"WebSite","name":"Some Site"}</script>
  </head></html>`)
  assertEquals(extractJsonLdProduct(doc), null)
})

Deno.test("extractJsonLdProduct tolerates malformed JSON without throwing", () => {
  const doc = parse(`<html><head>
    <script type="application/ld+json">{ not valid json </script>
  </head></html>`)
  assertEquals(extractJsonLdProduct(doc), null)
})

// ── extractPrice ──────────────────────────────────────────────────────

Deno.test("extractPrice reads og:price:amount first", () => {
  const doc = parse(`<html><head>
    <meta property="og:price:amount" content="1999.00" />
  </head></html>`)
  assertEquals(extractPrice(doc), 1999)
})

Deno.test("extractPrice reads Amazon's .a-price .a-offscreen selector", () => {
  const doc = parse(`<html><body>
    <span class="a-price"><span class="a-offscreen">₹25,999.00</span></span>
  </body></html>`)
  assertEquals(extractPrice(doc), 25999)
})

Deno.test("extractPrice reads Flipkart's price class", () => {
  const doc = parse(`<html><body><div class="_30jeq3">₹64,999</div></body></html>`)
  assertEquals(extractPrice(doc), 64999)
})

Deno.test("extractPrice falls back to JSON-LD Product offers", () => {
  const doc = parse(`<html><head>
    <script type="application/ld+json">{"@type":"Product","offers":{"price":"899"}}</script>
  </head></html>`)
  assertEquals(extractPrice(doc), 899)
})

Deno.test("extractPrice returns 0 when nothing matches", () => {
  const doc = parse(`<html><head><title>Generic shell page</title></head></html>`)
  assertEquals(extractPrice(doc), 0)
})

// ── extractImage ──────────────────────────────────────────────────────

Deno.test("extractImage prefers og:image", () => {
  const doc = parse(`<html><head>
    <meta property="og:image" content="https://example.com/og.jpg" />
  </head></html>`)
  assertEquals(extractImage(doc), "https://example.com/og.jpg")
})

Deno.test("extractImage reads Amazon's #landingImage data-old-hires", () => {
  const doc = parse(`<html><body>
    <img id="landingImage" data-old-hires="https://example.com/hires.jpg" src="https://example.com/thumb.jpg" />
  </body></html>`)
  assertEquals(extractImage(doc), "https://example.com/hires.jpg")
})

Deno.test("extractImage reads Flipkart's q6DClP image class", () => {
  const doc = parse(`<html><body><img class="q6DClP" src="https://example.com/fk.jpg" /></body></html>`)
  assertEquals(extractImage(doc), "https://example.com/fk.jpg")
})

Deno.test("extractImage falls back to JSON-LD Product image", () => {
  const doc = parse(`<html><head>
    <script type="application/ld+json">{"@type":"Product","image":["https://example.com/ld.jpg"]}</script>
  </head></html>`)
  assertEquals(extractImage(doc), "https://example.com/ld.jpg")
})

Deno.test("extractImage falls back to twitter:image", () => {
  const doc = parse(`<html><head>
    <meta name="twitter:image" content="https://example.com/twitter.jpg" />
  </head></html>`)
  assertEquals(extractImage(doc), "https://example.com/twitter.jpg")
})

Deno.test("extractImage returns null when nothing matches", () => {
  const doc = parse(`<html><head><title>Generic shell page</title></head></html>`)
  assertEquals(extractImage(doc), null)
})
