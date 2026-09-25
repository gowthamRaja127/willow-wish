// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendReminderNotification } from '../_shared/notify.ts'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Service-role-only sweep: finds items whose target_purchase_date has
 * arrived and a reminder hasn't been sent yet, notifies the owner, and
 * marks reminder_sent so it never fires twice. Invoked on a schedule by
 * .github/workflows/reminder-check.yml (every 15 minutes) — the same
 * pattern as thrice-daily.yml's scrape sweep.
 */
export async function runReminderSweep(supabase: any): Promise<{ sent: number; checked: number }> {
  const { data: dueItems, error } = await supabase
    .from('items')
    .select('id, user_id, product_name, current_price, target_purchase_date')
    .eq('reminder_sent', false)
    .eq('is_purchased', false)
    .lte('target_purchase_date', new Date().toISOString())

  if (error) throw error
  const items = dueItems ?? []

  let sent = 0
  for (const item of items) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(item.user_id)
      const userEmail = userData?.user?.email || ''
      const userWhatsapp = userData?.user?.user_metadata?.whatsapp_number || null
      const itemName = item.product_name || 'Wishlist Item'

      await sendReminderNotification(userEmail, userWhatsapp, itemName, item.current_price ?? null)
      await supabase.from('items').update({ reminder_sent: true }).eq('id', item.id)
      sent++
    } catch (e) {
      console.error(`Failed to send reminder for item ${item.id}:`, e)
    }
  }

  return { sent, checked: items.length }
}

export async function handleRequest(req: any): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Service-role only — this sweeps every user's items, so it must never be
  // reachable with a regular user session token.
  if (bearerToken !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey)
    const result = await runReminderSweep(supabase)
    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
}

if (import.meta.main) {
  serve(handleRequest)
}
