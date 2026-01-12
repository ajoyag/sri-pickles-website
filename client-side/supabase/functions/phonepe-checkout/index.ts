// Copy this entirely into your Supabase Edge Function Editor
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { amount, orderId, phone, redirectUrl } = await req.json()
    
    // These values will be pulled from 'Secrets' in Step 2 of Supabase deployment
    const MID = Deno.env.get('PHONEPE_MERCHANT_ID')
    const SALT = Deno.env.get('PHONEPE_SALT_KEY')
    const INDEX = Deno.env.get('PHONEPE_SALT_INDEX') || "1"
    const ENV = Deno.env.get('PHONEPE_ENVIRONMENT') || "SANDBOX" // change to PRODUCTION when live

    // Validate config
    if (!MID || !SALT) {
      throw new Error("Missing PhonePe Configuration (MID or SALT_KEY)");
    }

    const host = ENV === "PRODUCTION" 
      ? "https://api.phonepe.com/apis/hermes" 
      : "https://api-preprod.phonepe.com/apis/pg-sandbox"

    const payload = {
      merchantId: MID,
      merchantTransactionId: orderId,
      merchantUserId: "MUID" + Math.floor(Math.random() * 1000000),
      amount: Math.round(amount * 100), // PhonePe expects amount in paise
      redirectUrl: redirectUrl || "https://yourwebsite.com/shop.html", // Use client provided URL or fallback
      redirectMode: "REDIRECT", // or "POST"
      callbackUrl: redirectUrl || "https://yourwebsite.com/shop.html", // S2S Callback URL (Webhooks) - usually different, but for now reuse
      mobileNumber: phone,
      paymentInstrument: { type: "PAY_PAGE" }
    }

    const base64Payload = btoa(JSON.stringify(payload))
    const string = base64Payload + "/pg/v1/pay" + SALT
    
    // Hash creation (CheckSum)
    const encoder = new TextEncoder()
    const data = encoder.encode(string)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('') + "###" + INDEX

    const response = await fetch(`${host}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'accept': 'application/json'
      },
      body: JSON.stringify({ request: base64Payload })
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
