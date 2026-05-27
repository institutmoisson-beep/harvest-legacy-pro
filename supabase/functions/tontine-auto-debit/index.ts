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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let tontineId;
    try {
      const body = await req.json();
      tontineId = body.tontineId;
    } catch {
      // No body, process all tontines
    }

    console.log('Starting tontine auto-debit...', tontineId ? `for tontine ${tontineId}` : 'for all tontines');

    // Get active tontines
    let query = supabaseAdmin
      .from('tontines')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString());

    if (tontineId) {
      query = query.eq('id', tontineId);
    }

    const { data: tontines, error: tontinesError } = await query;

    if (tontinesError) {
      throw tontinesError;
    }

    if (!tontines || tontines.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active tontines found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let totalDebited = 0;
    let totalFailed = 0;

    for (const tontine of tontines) {
      console.log(`Processing tontine ${tontine.id}: ${tontine.name}`);

      // Get participants who haven't paid for current cycle
      const { data: participants, error: partsError } = await supabaseAdmin
        .from('tontine_participants')
        .select('*')
        .eq('tontine_id', tontine.id)
        .eq('is_paid_current_cycle', false)
        .eq('has_received', false);

      if (partsError) {
        console.error('Error fetching participants:', partsError);
        continue;
      }

      if (!participants || participants.length === 0) {
        console.log(`No participants to debit for tontine ${tontine.id}`);
        continue;
      }

      // Debit each participant
      for (const participant of participants) {
        try {
          const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', participant.user_id)
            .single();

          if (!wallet) {
            console.log(`No wallet found for user ${participant.user_id}`);
            totalFailed++;
            continue;
          }

          const msnAmount = tontine.amount / 750; // Convert FCFA to MSN

          if (Number(wallet.balance) < msnAmount) {
            console.log(`Insufficient balance for user ${participant.user_id}: has ${wallet.balance} MSN, needs ${msnAmount} MSN`);
            totalFailed++;
            continue;
          }

          // Deduct from wallet
          await supabaseAdmin
            .from('wallets')
            .update({
              balance: Number(wallet.balance) - msnAmount,
            })
            .eq('user_id', participant.user_id);

          // Create transaction
          await supabaseAdmin.from('wallet_transactions').insert({
            from_user_id: participant.user_id,
            to_user_id: participant.user_id,
            amount: msnAmount,
            transaction_type: 'withdrawal',
            description: `Cotisation tontine ${tontine.name} - Cycle ${tontine.current_cycle + 1}`,
            status: 'completed',
          });

          // Mark as paid
          await supabaseAdmin
            .from('tontine_participants')
            .update({ is_paid_current_cycle: true })
            .eq('id', participant.id);

          // Create payment record
          await supabaseAdmin.from('tontine_payments').insert({
            tontine_id: tontine.id,
            user_id: participant.user_id,
            amount: tontine.amount,
            cycle_number: tontine.current_cycle + 1,
            payment_method: 'wallet',
            status: 'completed',
          });

          totalDebited++;
          console.log(`Successfully debited ${tontine.amount} FCFA (${msnAmount} MSN) from user ${participant.user_id}`);
        } catch (error) {
          console.error(`Error debiting participant ${participant.id}:`, error);
          totalFailed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${tontines.length} tontines`,
        tontinesProcessed: tontines.length,
        participantsDebited: totalDebited,
        participantsFailed: totalFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in tontine auto-debit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
