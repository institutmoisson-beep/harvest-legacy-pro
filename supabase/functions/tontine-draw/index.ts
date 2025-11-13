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

    let tontineId;
    try {
      const body = await req.json();
      tontineId = body.tontineId;
    } catch {
      // No body, process all tontines
    }

    console.log('Starting tontine draw...', tontineId ? `for tontine ${tontineId}` : 'for all tontines');

    // Get tontines ready for drawing
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
        JSON.stringify({ message: 'No tontines ready for drawing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let drawingsCompleted = 0;
    let drawingsFailed = 0;

    for (const tontine of tontines) {
      try {
        console.log(`Processing tontine ${tontine.id}: ${tontine.name}`);

        // Get eligible participants (paid current cycle and not yet received)
        const { data: participants, error: partsError } = await supabaseAdmin
          .from('tontine_participants')
          .select('*')
          .eq('tontine_id', tontine.id)
          .eq('has_received', false)
          .eq('is_paid_current_cycle', true);

        if (partsError) {
          console.error('Error fetching participants:', partsError);
          drawingsFailed++;
          continue;
        }

        if (!participants || participants.length === 0) {
          console.log(`No eligible participants for tontine ${tontine.id}`);
          continue;
        }

        // Check if all participants have paid
        const { data: allParticipants } = await supabaseAdmin
          .from('tontine_participants')
          .select('*')
          .eq('tontine_id', tontine.id)
          .eq('has_received', false);

        const allPaid = allParticipants?.every(p => p.is_paid_current_cycle);

        if (!allPaid) {
          console.log(`Not all participants have paid for tontine ${tontine.id}`);
          continue;
        }

        // Random draw
        const randomIndex = Math.floor(Math.random() * participants.length);
        const winner = participants[randomIndex];

        const nextCycle = tontine.current_cycle + 1;
        const totalAmount = tontine.amount * (allParticipants?.length || 0);

        console.log(`Winner: ${winner.user_id}, Cycle: ${nextCycle}, Amount: ${totalAmount} FCFA`);

        // Get winner's referral code
        const { data: winnerProfile } = await supabaseAdmin
          .from('profiles')
          .select('referral_code')
          .eq('id', winner.user_id)
          .single();

        // Create drawing record
        const { error: drawError } = await supabaseAdmin
          .from('tontine_drawings')
          .insert({
            tontine_id: tontine.id,
            winner_id: winner.user_id,
            cycle_number: nextCycle,
            amount_won: totalAmount,
          });

        if (drawError) {
          console.error('Error creating drawing:', drawError);
          drawingsFailed++;
          continue;
        }

        // Update participant
        await supabaseAdmin
          .from('tontine_participants')
          .update({
            has_received: true,
            received_at: new Date().toISOString(),
          })
          .eq('id', winner.id);

        // Credit winner's wallet in MSN
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('balance')
          .eq('user_id', winner.user_id)
          .single();

        if (wallet) {
          const msnAmount = totalAmount / 750; // Convert FCFA to MSN
          
          await supabaseAdmin
            .from('wallets')
            .update({
              balance: Number(wallet.balance) + msnAmount,
            })
            .eq('user_id', winner.user_id);

          // Create transaction record
          await supabaseAdmin.from('wallet_transactions').insert({
            from_user_id: winner.user_id,
            to_user_id: winner.user_id,
            amount: msnAmount,
            transaction_type: 'order_profit',
            description: `Gain tontine ${tontine.name} - Cycle ${nextCycle} (Code: ${winnerProfile?.referral_code || winner.user_id})`,
            status: 'completed',
          });

          console.log(`Credited ${totalAmount} FCFA (${msnAmount} MSN) to winner ${winner.user_id}`);
        }

        // Update tontine cycle
        await supabaseAdmin
          .from('tontines')
          .update({
            current_cycle: nextCycle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tontine.id);

        // Reset payment status for next cycle
        await supabaseAdmin
          .from('tontine_participants')
          .update({ is_paid_current_cycle: false })
          .eq('tontine_id', tontine.id);

        // Check if tontine is complete (all participants have received)
        const { data: remainingParticipants } = await supabaseAdmin
          .from('tontine_participants')
          .select('*')
          .eq('tontine_id', tontine.id)
          .eq('has_received', false);

        if (!remainingParticipants || remainingParticipants.length === 0) {
          await supabaseAdmin
            .from('tontines')
            .update({ status: 'completed' })
            .eq('id', tontine.id);
          
          console.log(`Tontine ${tontine.id} completed`);
        }

        drawingsCompleted++;
      } catch (error) {
        console.error(`Error processing tontine ${tontine.id}:`, error);
        drawingsFailed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${tontines.length} tontines`,
        tontinesProcessed: tontines.length,
        drawingsCompleted,
        drawingsFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in tontine draw:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
