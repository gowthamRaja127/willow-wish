// @ts-ignore
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { sendNotification } from "./index.ts"

declare const Deno: any

function resetNotificationEnv() {
  Deno.env.delete('RESEND_API_KEY')
  Deno.env.delete('TWILIO_ACCOUNT_SID')
  Deno.env.delete('TWILIO_AUTH_TOKEN')
  Deno.env.delete('TWILIO_WHATSAPP_FROM')
  Deno.env.delete('TWILIO_WHATSAPP_TO')
}

function stubFetch() {
  const calls: { url: string; init: any }[] = []
  const original = globalThis.fetch
  globalThis.fetch = ((url: string, init?: any) => {
    calls.push({ url: String(url), init })
    return Promise.resolve(new Response('{}', { status: 200 }))
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = original } }
}

Deno.test("sendNotification sends a price-drop email and WhatsApp message", async () => {
  resetNotificationEnv()
  Deno.env.set('RESEND_API_KEY', 'test-resend-key')
  Deno.env.set('TWILIO_ACCOUNT_SID', 'test-sid')
  Deno.env.set('TWILIO_AUTH_TOKEN', 'test-token')
  Deno.env.set('TWILIO_WHATSAPP_FROM', 'whatsapp:+10000000000')

  const { calls, restore } = stubFetch()
  try {
    await sendNotification('user@example.com', '+919876543210', 'Test Item', 1000, 800, false)
  } finally {
    restore()
  }

  const emailCall = calls.find((c) => c.url === 'https://api.resend.com/emails')
  const whatsappCall = calls.find((c) => c.url.includes('api.twilio.com'))

  assertEquals(emailCall !== undefined, true)
  const emailBody = JSON.parse(emailCall!.init.body)
  assertEquals(emailBody.to, 'user@example.com')
  assertStringIncludes(emailBody.subject, 'Price Dropped')
  assertStringIncludes(emailBody.html, '800')

  assertEquals(whatsappCall !== undefined, true)
  const params = whatsappCall!.init.body as URLSearchParams
  assertEquals(params.get('To'), 'whatsapp:+919876543210')
  assertStringIncludes(params.get('Body') ?? '', 'Price Drop')
})

Deno.test("sendNotification sends target-met copy when isTargetMet is true", async () => {
  resetNotificationEnv()
  Deno.env.set('RESEND_API_KEY', 'test-resend-key')
  Deno.env.set('TWILIO_ACCOUNT_SID', 'test-sid')
  Deno.env.set('TWILIO_AUTH_TOKEN', 'test-token')

  const { calls, restore } = stubFetch()
  try {
    await sendNotification('user@example.com', '+919876543210', 'Test Item', 1000, 500, true)
  } finally {
    restore()
  }

  const emailCall = calls.find((c) => c.url === 'https://api.resend.com/emails')
  const whatsappCall = calls.find((c) => c.url.includes('api.twilio.com'))

  const emailBody = JSON.parse(emailCall!.init.body)
  assertStringIncludes(emailBody.subject, 'Target Met')

  const params = whatsappCall!.init.body as URLSearchParams
  assertStringIncludes(params.get('Body') ?? '', 'Target Met')
})

Deno.test("sendNotification skips WhatsApp when no Twilio credentials or recipient are configured", async () => {
  resetNotificationEnv()
  Deno.env.set('RESEND_API_KEY', 'test-resend-key')

  const { calls, restore } = stubFetch()
  try {
    await sendNotification('user@example.com', null, 'Test Item', 1000, 800, false)
  } finally {
    restore()
  }

  const emailCall = calls.find((c) => c.url === 'https://api.resend.com/emails')
  const whatsappCall = calls.find((c) => c.url.includes('api.twilio.com'))

  assertEquals(emailCall !== undefined, true)
  assertEquals(whatsappCall, undefined)
})

Deno.test("sendNotification skips email when no Resend key is configured", async () => {
  resetNotificationEnv()
  Deno.env.set('TWILIO_ACCOUNT_SID', 'test-sid')
  Deno.env.set('TWILIO_AUTH_TOKEN', 'test-token')

  const { calls, restore } = stubFetch()
  try {
    await sendNotification('user@example.com', '+919876543210', 'Test Item', 1000, 800, false)
  } finally {
    restore()
  }

  const emailCall = calls.find((c) => c.url === 'https://api.resend.com/emails')
  const whatsappCall = calls.find((c) => c.url.includes('api.twilio.com'))

  assertEquals(emailCall, undefined)
  assertEquals(whatsappCall !== undefined, true)
})
