import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }



  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking for upcoming tontine payments...');

    // Get all active tontines with participants
    const { data: tontines, error: tontinesError } = await supabase
      .from('tontines')
      .select('id, name')
      .eq('status', 'active');

    if (tontinesError) {
      console.error('Error fetching tontines:', tontinesError);
      throw tontinesError;
    }

    console.log(`Found ${tontines?.length || 0} active tontines`);

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let notificationsSent = 0;

    for (const tontine of tontines || []) {
      // Get payment schedule for this tontine
      const { data: schedule, error: scheduleError } = await supabase
        .from('tontine_payment_schedule')
        .select('*')
        .eq('tontine_id', tontine.id);

      if (scheduleError) {
        console.error(`Error fetching schedule for tontine ${tontine.id}:`, scheduleError);
        continue;
      }

      // Get participants
      const { data: participants, error: participantsError } = await supabase
        .from('tontine_participants')
        .select('user_id')
        .eq('tontine_id', tontine.id);

      if (participantsError) {
        console.error(`Error fetching participants for tontine ${tontine.id}:`, participantsError);
        continue;
      }

      for (const item of schedule || []) {
        const dueDate = new Date(item.due_date);
        
        // Check if payment is due within 3 days or 1 day and not paid
        const shouldNotify3Days = dueDate <= threeDaysFromNow && dueDate > oneDayFromNow;
        const shouldNotify1Day = dueDate <= oneDayFromNow && dueDate > now;

        if ((shouldNotify3Days || shouldNotify1Day) && item.status !== 'paid') {
          const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Send notification to all participants
          for (const participant of participants || []) {
            // Check if notification already sent
            const { data: existingNotif } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', participant.user_id)
              .eq('type', 'tontine')
              .eq('related_id', tontine.id)
              .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
              .maybeSingle();

            if (!existingNotif) {
              const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                  user_id: participant.user_id,
                  title: `Rappel Tontine: ${tontine.name}`,
                  message: `Paiement de ${item.amount} FCFA dû dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
                  type: 'tontine',
                  related_id: tontine.id,
                });

              if (notifError) {
                console.error(`Error creating notification for user ${participant.user_id}:`, notifError);
              } else {
                notificationsSent++;
                console.log(`Notification sent to user ${participant.user_id} for tontine ${tontine.name}`);
              }
            }
          }
        }
      }
    }

    console.log(`Total notifications sent: ${notificationsSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${tontines?.length || 0} tontines, sent ${notificationsSent} notifications` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tontine-auto-reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
