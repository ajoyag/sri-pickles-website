import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { orderId } = await req.json()

        // 1. Setup Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 2. Get Config
        const MID = Deno.env.get('PHONEPE_MERCHANT_ID')
        const SALT = Deno.env.get('PHONEPE_SALT_KEY')
        const INDEX = Deno.env.get('PHONEPE_SALT_INDEX') || "1"
        const ENV = Deno.env.get('PHONEPE_ENVIRONMENT') || "SANDBOX"

        if (!MID || !SALT || !orderId) {
            throw new Error("Missing Config or Order ID");
        }

        const host = ENV === "PRODUCTION"
            ? "https://api.phonepe.com/apis/hermes"
            : "https://api-preprod.phonepe.com/apis/pg-sandbox"

        // 3. Generate Checksum for Status API
        // GET /pg/v1/status/{merchantId}/{merchantTransactionId}
        const path = `/pg/v1/status/${MID}/${orderId}`
        const stringToHash = path + SALT

        const encoder = new TextEncoder()
        const data = encoder.encode(stringToHash)
        const hashBuffer = await crypto.subtle.digest("SHA-256", data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('') + "###" + INDEX

        // 4. Call PhonePe API
        const response = await fetch(`${host}${path}`, {
            method: "GET",
            headers: {
                "X-VERIFY": checksum,
                "X-MERCHANT-ID": MID,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        // 5. Handle Response
        if (result.code === "PAYMENT_SUCCESS") {
            // Payment Success! Update Database
            const { error } = await supabase
                .from('shop_orders')
                .update({
                    status: 'processing', // 'processing' implies paid/confirmed
                    payment_status: 'completed',
                    payment_id: result.data.transactionId, // Store PhonePe Transaction ID
                    payment_method: result.data.paymentInstrument?.type || 'PhonePe'
                })
                .eq('id', orderId)

            if (error) throw error

            // Also Log the success
            await supabase.from('payment_process').insert({
                order_id: orderId,
                process_step: 'VERIFIED',
                status: 'SUCCESS',
                transaction_id: result.data.transactionId,
                meta_data: result
            })

            return new Response(JSON.stringify({ success: true, status: 'PAYMENT_SUCCESS', data: result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })

        } else if (result.code === "PAYMENT_PENDING") {
            return new Response(JSON.stringify({ success: false, status: 'PAYMENT_PENDING' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else {
            // Payment Failed
            await supabase.from('payment_process').insert({
                order_id: orderId,
                process_step: 'VERIFIED',
                status: 'FAILED',
                meta_data: result
            })

            return new Response(JSON.stringify({ success: false, status: 'PAYMENT_FAILED', message: result.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
