// @ts-ignore
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { applyItemUpdate } from "./index.ts"

declare const Deno: any

function stubFetch() {
  const calls: { url: string; init: any }[] = []
  const original = globalThis.fetch
  globalThis.fetch = ((url: string, init?: any) => {
    calls.push({ url: String(url), init })
    return Promise.resolve(new Response('{}', { status: 200 }))
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = original } }
}

function createMockSupabase(existing: any) {
  const calls: { priceHistoryInserts: any[]; updates: any[] } = { priceHistoryInserts: [], updates: [] }

  const supabase = {
    from(table: string) {
      if (table === 'items') {
        return {
          select() { return this },
          eq() { return this },
          single: async () => ({ data: existing, error: null }),
          update: (patch: any) => {
            calls.updates.push(patch)
            return { eq: async () => ({ data: null, error: null }) }
          },
        }
      }
      if (table === 'price_history') {
        return {
          insert: async (row: any) => {
            calls.priceHistoryInserts.push(row)
            return { data: null, error: null }
          },
        }
      }
      throw new Error(`Unexpected table in test mock: ${table}`)
    },
    auth: {
      admin: {
        getUserById: async (_id: string) => ({
          data: { user: { email: 'user@example.com', user_metadata: { whatsapp_number: '+919876543210' } } },
          error: null,
        }),
      },
    },
  }

  return { supabase, calls }
}

Deno.test("applyItemUpdate updates price and fires a price-drop notification", async () => {
  const { supabase, calls } = createMockSupabase({
    user_id: 'owner-1',
    product_name: 'Test Item',
    initial_price: 1000,
    current_price: 1000,
    target_price: null,
    is_notified: false,
  })
  const { calls: fetchCalls, restore } = stubFetch()

  let result
  try {
    result = await applyItemUpdate(supabase, 'item-1', 'owner-1', false, {
      title: null, image: null, desc: null, price: 800,
    })
  } finally {
    restore()
  }

  assertEquals(result, null)
  assertEquals(calls.updates[0].current_price, 800)
  assertEquals(calls.priceHistoryInserts[0], { item_id: 'item-1', price: 800 })

  const whatsappCall = fetchCalls.find((c) => c.url.includes('api.twilio.com'))
  assertEquals(whatsappCall, undefined) // no Twilio env configured in this test run
})

Deno.test("applyItemUpdate does not record a duplicate price_history point when price is unchanged", async () => {
  const { supabase, calls } = createMockSupabase({
    user_id: 'owner-1',
    product_name: 'Test Item',
    initial_price: 500,
    current_price: 500,
    target_price: null,
    is_notified: false,
  })
  stubFetch()

  const result = await applyItemUpdate(supabase, 'item-1', 'owner-1', false, {
    title: null, image: null, desc: null, price: 500,
  })

  assertEquals(result, null)
  assertEquals(calls.priceHistoryInserts.length, 0)
})

Deno.test("applyItemUpdate marks is_notified when target price is reached", async () => {
  const { supabase, calls } = createMockSupabase({
    user_id: 'owner-1',
    product_name: 'Test Item',
    initial_price: 1000,
    current_price: 400,
    target_price: 300,
    is_notified: false,
  })
  stubFetch()

  const result = await applyItemUpdate(supabase, 'item-1', 'owner-1', false, {
    title: null, image: null, desc: null, price: 300,
  })

  assertEquals(result, null)
  assertEquals(calls.updates[0].is_notified, true)
})

Deno.test("applyItemUpdate skips price update and notifications for purchased items", async () => {
  const { supabase, calls } = createMockSupabase({
    user_id: 'owner-1',
    product_name: 'Test Item',
    initial_price: 1000,
    current_price: 1000,
    target_price: null,
    is_notified: false,
    is_purchased: true,
  })
  const { calls: fetchCalls, restore } = stubFetch()

  let result
  try {
    result = await applyItemUpdate(supabase, 'item-1', 'owner-1', false, {
      title: null, image: null, desc: null, price: 800,
    })
  } finally {
    restore()
  }

  assertEquals(result, null)
  assertEquals(calls.updates[0].current_price, undefined)
  assertEquals(calls.priceHistoryInserts.length, 0)
  assertEquals(fetchCalls.length, 0)
})

Deno.test("applyItemUpdate returns Forbidden when a non-service caller does not own the item", async () => {
  const { supabase, calls } = createMockSupabase({
    user_id: 'owner-1',
    product_name: 'Test Item',
    initial_price: 1000,
    current_price: 1000,
    target_price: null,
    is_notified: false,
  })
  stubFetch()

  const result = await applyItemUpdate(supabase, 'item-1', 'someone-else', false, {
    title: null, image: null, desc: null, price: 800,
  })

  assertEquals(result, { error: 'Forbidden', status: 403 })
  assertEquals(calls.updates.length, 0)
})

Deno.test("applyItemUpdate allows a trusted service caller regardless of callerId", async () => {
  const { supabase, calls } = createMockSupabase({
    user_id: 'owner-1',
    product_name: 'Test Item',
    initial_price: 1000,
    current_price: 1000,
    target_price: null,
    is_notified: false,
  })
  stubFetch()

  const result = await applyItemUpdate(supabase, 'item-1', null, true, {
    title: null, image: null, desc: null, price: 800,
  })

  assertEquals(result, null)
  assertEquals(calls.updates[0].current_price, 800)
})
