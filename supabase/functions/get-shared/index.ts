import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHARED_ITEM_FIELDS =
  'id, product_name, description, image_url, target_price, current_price, initial_price, target_purchase_date, tags, priority, notes, is_purchased, created_at'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { token, type } = await req.json()
    if (!token || (type !== 'item' && type !== 'wishlist')) {
      throw new Error('token and a valid type ("item" or "wishlist") are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (type === 'item') {
      const { data, error } = await supabase
        .from('items')
        .select(SHARED_ITEM_FIELDS)
        .eq('share_token', token)
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders })
      }
      return new Response(
        JSON.stringify({ item: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: share, error: shareError } = await supabase
      .from('wishlist_shares')
      .select('user_id')
      .eq('token', token)
      .single()

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders })
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(SHARED_ITEM_FIELDS)
      .eq('user_id', share.user_id)
      .order('created_at', { ascending: false })

    if (itemsError) throw itemsError

    return new Response(
      JSON.stringify({ items: items ?? [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
