import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { userId, type, message, recipient, subject } = await req.json();

    // Record notification in database
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        notification_type: type,
        message: message,
        recipient: recipient,
        subject: subject,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Try to send via Termii API (open source SMS provider)
    // Using Termii because it's widely available in Africa
    const termiiApiKey = Deno.env.get('TERMII_API_KEY');
    
    if (termiiApiKey && type === 'sms') {
      try {
        const response = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: recipient,
            from: "Moissonneur",
            sms: message,
            type: "plain",
            channel: "generic",
            api_key: termiiApiKey
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          await supabase
            .from('notifications')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString(),
              provider: 'termii',
              external_id: result.message_id
            })
            .eq('id', notification.id);
        } else {
          throw new Error(result.message || 'SMS send failed');
        }
      } catch (smsError) {
        console.error('SMS send error:', smsError);
        await supabase
          .from('notifications')
          .update({ status: 'failed' })
          .eq('id', notification.id);
        
        throw smsError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification enregistrée',
        notification 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});