import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailRequest {
    to: string;
    subject: string;
    message: string;
    customerName: string;
}

const handler = async (req: Request): Promise<Response> => {
    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { to, subject, message, customerName }: EmailRequest = await req.json();

        if (!RESEND_API_KEY) {
            throw new Error("Missing RESEND_API_KEY environment variable.");
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Sri Pickles Admin <admin@resend.dev>", // Or your verified domain
                to: [to],
                subject: subject,
                html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #D32F2F;">Response from Sri Pickles</h2>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Thank you for contacting us. Here is the response to your inquiry:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #D32F2F; margin: 20px 0; white-space: pre-wrap;">${message}</div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #888;">
              Sri Pickles - Authentic Homemade Taste<br>
              Nirmal, Telangana
            </p>
          </div>
        `,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("Resend API Error:", data);
            throw new Error(data.message || "Failed to send email via Resend");
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

serve(handler);
