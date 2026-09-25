// @ts-ignore
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { runReminderSweep } from "./index.ts"

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

function createMockSupabase(dueItems: any[]) {
  const updates: any[] = []

  const supabase = {
    from(table: string) {
      if (table === 'items') {
        return {
          select() { return this },
          eq() { return this },
          lte: async () => ({ data: dueItems, error: null }),
          update: (patch: any) => {
            return {
              eq: async (_col: string, id: string) => {
                updates.push({ id, patch })
                return { data: null, error: null }
              },
            }
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

  return { supabase, updates }
}

Deno.test("runReminderSweep sends a reminder and marks reminder_sent for each due item", async () => {
  Deno.env.set('RESEND_API_KEY', 'test-resend-key')
  Deno.env.set('TWILIO_ACCOUNT_SID', 'test-sid')
  Deno.env.set('TWILIO_AUTH_TOKEN', 'test-token')

  const { supabase, updates } = createMockSupabase([
    { id: 'item-1', user_id: 'user-1', product_name: 'Sony Headphones', current_price: 4999, target_purchase_date: '2026-01-01T09:00:00Z' },
  ])

  const { calls, restore } = stubFetch()
  let result: { sent: number; checked: number }
  try {
    result = await runReminderSweep(supabase)
  } finally {
    restore()
  }

  assertEquals(result.checked, 1)
  assertEquals(result.sent, 1)
  assertEquals(updates.length, 1)
  assertEquals(updates[0].id, 'item-1')
  assertEquals(updates[0].patch, { reminder_sent: true })

  const emailCall = calls.find((c) => c.url === 'https://api.resend.com/emails')
  assertEquals(emailCall !== undefined, true)

  Deno.env.delete('RESEND_API_KEY')
  Deno.env.delete('TWILIO_ACCOUNT_SID')
  Deno.env.delete('TWILIO_AUTH_TOKEN')
})

Deno.test("runReminderSweep does nothing when no items are due", async () => {
  const { supabase, updates } = createMockSupabase([])

  const { restore } = stubFetch()
  let result: { sent: number; checked: number }
  try {
    result = await runReminderSweep(supabase)
  } finally {
    restore()
  }

  assertEquals(result, { sent: 0, checked: 0 })
  assertEquals(updates.length, 0)
})
