import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_PRODUCT_HOSTS = ['amazon.in', 'amazon.com', 'flipkart.com']

function isAllowedProductUrl(rawUrl: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  return ALLOWED_PRODUCT_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  )
}

/**
 * Attempt to extract a price from various meta tags and known DOM patterns.
 * Returns 0 if nothing is found.
 */
function extractPrice(doc: any): number {
  // Standard Open Graph
  const ogPrice = doc.querySelector('meta[property="og:price:amount"]')?.getAttribute('content')
  if (ogPrice) {
    const n = parseFloat(ogPrice.replace(/[^0-9.]/g, ''))
    if (n > 0) return n
  }

  // Amazon: #priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen
  const amzSelectors = [
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price .a-offscreen',
    '#price_inside_buybox',
    '#apex_desktop_newAccordionRow .a-price .a-offscreen',
  ]
  for (const sel of amzSelectors) {
    const el = doc.querySelector(sel)
    if (el?.innerText) {
      const n = parseFloat(el.innerText.replace(/[^0-9.]/g, ''))
      if (n > 0) return n
    }
  }

  // Flipkart: ._30jeq3
  const fkEl = doc.querySelector('._30jeq3')
  if (fkEl?.innerText) {
    const n = parseFloat(fkEl.innerText.replace(/[^0-9.]/g, ''))
    if (n > 0) return n
  }

  return 0
}

/**
 * Pick the best available product image.
 * Priority: og:image → amazon landingImage → flipkart q6DClP → first img > 100px
 */
function extractImage(doc: any): string | null {
  const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
  if (og) return og

  // Amazon high-res image JSON
  const amzImg = doc.querySelector('#landingImage')?.getAttribute('data-old-hires')
    || doc.querySelector('#landingImage')?.getAttribute('src')
  if (amzImg) return amzImg

  // Flipkart
  const fkImg = doc.querySelector('img.q6DClP')?.getAttribute('src')
  if (fkImg) return fkImg

  return null
}

/**
 * Send notification (email/whatsapp) when price drops.
 */
async function sendNotification(
  userEmail: string,
  userWhatsapp: string | null,
  itemName: string,
  oldPrice: number,
  newPrice: number,
  isTargetMet: boolean = false
) {
  const alertType = isTargetMet ? "🎯 Target Price Reached" : "🚨 Price Drop Alert";
  console.log(`[NOTIFICATION] ${alertType} for "${itemName}"! Notifying ${userEmail}. Old: ₹${oldPrice}, New: ₹${newPrice}`);

  // 1. Resend Email Integration
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey && userEmail) {
    try {
      const subject = isTargetMet 
        ? `🎯 Target Met: ${itemName} is now ₹${newPrice}!`
        : `🚨 Price Dropped: ${itemName} is now ₹${newPrice}!`;

      const html = `
        <h3>${alertType}!</h3>
        <p>Your item <strong>${itemName}</strong> price changed:</p>
        <ul>
          <li>Previous Price: ₹${oldPrice}</li>
          <li><strong>New Price: ₹${newPrice}</strong></li>
        </ul>
        <p>Check it out now! <a href="https://willowwish.dev">Go to WillowWish</a></p>
      `;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'WillowWish <alerts@willowwish.dev>',
          to: userEmail,
          subject,
          html,
        }),
      });
      console.log(`Resend response status: ${res.status}`);
    } catch (e) {
      console.error('Failed to send email notification:', e);
    }
  }

  // 2. Twilio WhatsApp Integration
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886';
  
  // Try user's metadata whatsapp first; fallback to TWILIO_WHATSAPP_TO
  const rawTo = userWhatsapp || Deno.env.get('TWILIO_WHATSAPP_TO');

  if (twilioSid && twilioAuth && rawTo) {
    try {
      const basicAuth = btoa(`${twilioSid}:${twilioAuth}`);
      const bodyText = isTargetMet
        ? `🎯 Target Met: "${itemName}" reached your target price! It is now ₹${newPrice} (was ₹${oldPrice}).`
        : `🚨 Price Drop: "${itemName}" dropped from ₹${oldPrice} to ₹${newPrice}!`;

      // Format recipient: ensure it starts with "whatsapp:"
      const formattedTo = rawTo.startsWith('whatsapp:') 
        ? rawTo 
        : `whatsapp:${rawTo.startsWith('+') ? rawTo : '+' + rawTo}`;

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: formattedTo,
          Body: bodyText,
        }),
      });
      console.log(`Twilio WhatsApp response status for ${formattedTo}: ${res.status}`);
    } catch (e) {
      console.error('Failed to send WhatsApp notification:', e);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { url, itemId, userId, mode } = await req.json()

    if (!url) throw new Error('url is required')

    if (!isAllowedProductUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'URL host is not supported' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // ── Fetch product page ─────────────────────────────────────────────
    // redirect: 'manual' so a redirect on an allowed host can't be used to
    // smuggle the request to a disallowed host (SSRF via open redirect).
    let response = await fetch(url, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || !isAllowedProductUrl(new URL(location, url).href)) {
        return new Response(
          JSON.stringify({ error: 'URL host is not supported' }),
          { status: 400, headers: corsHeaders }
        )
      }
      response = await fetch(new URL(location, url).href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
    }

    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) throw new Error('HTML parsing failure')

    const title  = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
      || doc.querySelector('title')?.innerText || null
    const image  = extractImage(doc)
    const desc   = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || null
    const price  = extractPrice(doc)

    const scraped = { title, image, desc, price }

    // ── mode: "preview" — just return scraped data, don't touch DB ─────
    if (mode === 'preview') {
      return new Response(
        JSON.stringify({ success: true, ...scraped }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── mode: "update" or "enrich" — database write & compare ─
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '')
    const { data: authData, error: authError } = await supabase.auth.getUser(bearerToken)
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }
    const callerId = authData.user.id

    if (itemId) {
      // 1. Fetch current stored fields to compare
      const { data: existing } = await supabase
        .from('items')
        .select('user_id, product_name, initial_price, current_price, target_price, is_notified')
        .eq('id', itemId)
        .single()

      if (!existing || existing.user_id !== callerId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: corsHeaders }
        )
      }

      const patch: Record<string, any> = { last_scraped_at: new Date() }
      if (image)  patch.image_url    = image
      if (title && !existing?.product_name)  patch.product_name = title
      if (desc && !existing?.description)   patch.description  = desc

      if (price > 0) {
        const isNewPricePoint = existing?.current_price == null || price !== existing.current_price
        patch.current_price = price

        // If initial price is not set, set it now
        if (!existing?.initial_price) {
          patch.initial_price = price;
        }

        if (isNewPricePoint) {
          await supabase.from('price_history').insert({ item_id: itemId, price })
        }

        // Compare price change
        const oldPrice = existing?.current_price || existing?.initial_price || price;
        const itemName = existing?.product_name || title || 'Wishlist Item';
        
        if (existing?.user_id) {
          // Get user details for notification
          const { data: userData } = await supabase.auth.admin.getUserById(existing.user_id)
          const userEmail = userData?.user?.email || "";
          const userWhatsapp = userData?.user?.user_metadata?.whatsapp_number || null;

          // Alert 1: Price drop
          if (price < oldPrice) {
            await sendNotification(userEmail, userWhatsapp, itemName, oldPrice, price, false);
          }

          // Alert 2: Target price reached
          if (existing.target_price && price <= existing.target_price && !existing.is_notified) {
            patch.is_notified = true;
            await sendNotification(userEmail, userWhatsapp, itemName, oldPrice, price, true);
          }
        }
      }
      
      await supabase.from('items').update(patch).eq('id', itemId)
    } else if (userId) {
      if (userId !== callerId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: corsHeaders }
        )
      }
      // Legacy / Backup
      await supabase.from('items').insert({
        user_id: userId,
        product_url: url,
        product_name: title,
        description: desc,
        image_url: image,
        initial_price: price > 0 ? price : null,
        current_price: price > 0 ? price : null,
      })
    }

    return new Response(
      JSON.stringify({ success: true, ...scraped }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: corsHeaders }
    )
  }
})
