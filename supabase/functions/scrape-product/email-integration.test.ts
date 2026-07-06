// Real (non-mocked) integration check against the live Resend API — makes
// an actual HTTP call, unlike index.test.ts's mocked-fetch unit tests.
// Confirms the configured RESEND_API_KEY + "from" sender can actually send,
// using Resend's dedicated test recipient (delivered@resend.dev) so no real
// email goes to anyone. Self-skips when no key is present (CI, other
// machines) rather than failing — this validates live configuration, not
// application logic, which the mocked tests already cover.
// @ts-ignore
import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { sendNotification } from "./index.ts"

declare const Deno: any

Deno.test("Resend integration: a real API key can actually send email", async () => {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) {
    console.log("SKIPPED — no RESEND_API_KEY in this environment. Run with " +
      "RESEND_API_KEY=<your key> deno test ... to validate the live sender config.")
    return
  }

  const logs: string[] = []
  const originalLog = console.log
  console.log = (...args: any[]) => { logs.push(args.join(' ')) }

  try {
    await sendNotification('delivered@resend.dev', null, 'Integration Test Product', 1000, 800, false)
  } finally {
    console.log = originalLog
  }

  const statusLine = logs.find((l) => l.includes('Resend response status'))
  console.log(statusLine) // surface it in the real test output too
  assertStringIncludes(statusLine ?? '', 'Resend response status: 200')
})
