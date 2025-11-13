import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting tontine payment reminder check...');

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

    // Get upcoming payments within 3 days
    const { data: upcomingPayments, error: paymentsError } = await supabaseAdmin
      .from('tontine_payment_schedule')
      .select(`
        *,
        tontines (name)
      `)
      .eq('status', 'pending')
      .lte('due_date', threeDaysFromNow.toISOString())
      .gte('due_date', now.toISOString())
      .eq('reminder_sent', false);

    if (paymentsError) throw paymentsError;

    if (!upcomingPayments || upcomingPayments.length === 0) {
      console.log('No upcoming payments to remind');
      return new Response(
        JSON.stringify({ message: 'No reminders to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let remindersSent = 0;

    for (const payment of upcomingPayments) {
      // Get all participants of this tontine
      const { data: participants } = await supabaseAdmin
        .from('tontine_participants')
        .select('user_id')
        .eq('tontine_id', payment.tontine_id);

      if (participants) {
        const dueDate = new Date(payment.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send notification to each participant
        for (const participant of participants) {
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: participant.user_id,
              title: '⏰ Rappel de Paiement Tontine',
              message: `Votre paiement pour "${payment.tontines?.name}" (Cycle ${payment.cycle_number}) est dû dans ${daysUntilDue} jour(s). Montant: ${payment.amount.toLocaleString()} FCFA`,
              type: 'tontine',
              related_id: payment.tontine_id
            });

          remindersSent++;
        }

        // Mark reminder as sent
        await supabaseAdmin
          .from('tontine_payment_schedule')
          .update({ reminder_sent: true })
          .eq('id', payment.id);
      }
    }

    console.log(`Sent ${remindersSent} payment reminders`);

    return new Response(
      JSON.stringify({ 
        success: true,
        reminders_sent: remindersSent,
        message: `Successfully sent ${remindersSent} payment reminders`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in tontine-payment-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
