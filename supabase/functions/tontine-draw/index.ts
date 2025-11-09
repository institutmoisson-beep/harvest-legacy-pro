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

    const { tontineId } = await req.json();

    if (!tontineId) {
      throw new Error('Tontine ID requis');
    }

    console.log(`Starting draw for tontine ${tontineId}`);

    // Get tontine details
    const { data: tontine, error: tontineError } = await supabaseAdmin
      .from('tontines')
      .select('*')
      .eq('id', tontineId)
      .single();

    if (tontineError || !tontine) {
      throw new Error('Tontine introuvable');
    }

    // Get eligible participants (not yet drawn)
    const { data: participants, error: partsError } = await supabaseAdmin
      .from('tontine_participants')
      .select('*')
      .eq('tontine_id', tontineId)
      .eq('has_received', false)
      .eq('is_paid_current_cycle', true);

    if (partsError) {
      throw new Error('Erreur lors de la récupération des participants');
    }

    if (!participants || participants.length === 0) {
      throw new Error('Aucun participant éligible pour le tirage');
    }

    // Random draw
    const randomIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[randomIndex];

    const nextCycle = tontine.current_cycle + 1;
    const totalAmount = tontine.amount * participants.length;

    console.log(`Winner: ${winner.user_id}, Cycle: ${nextCycle}, Amount: ${totalAmount}`);

    // Create drawing record
    const { error: drawError } = await supabaseAdmin
      .from('tontine_drawings')
      .insert({
        tontine_id: tontineId,
        winner_id: winner.user_id,
        cycle_number: nextCycle,
        amount_won: totalAmount,
      });

    if (drawError) {
      console.error('Error creating drawing:', drawError);
      throw drawError;
    }

    // Update participant
    const { error: updatePartError } = await supabaseAdmin
      .from('tontine_participants')
      .update({
        has_received: true,
        received_at: new Date().toISOString(),
      })
      .eq('id', winner.id);

    if (updatePartError) {
      console.error('Error updating participant:', updatePartError);
    }

    // Update tontine cycle
    const { error: updateTontineError } = await supabaseAdmin
      .from('tontines')
      .update({
        current_cycle: nextCycle,
      })
      .eq('id', tontineId);

    if (updateTontineError) {
      console.error('Error updating tontine:', updateTontineError);
    }

    // Reset payment status for next cycle
    await supabaseAdmin
      .from('tontine_participants')
      .update({ is_paid_current_cycle: false })
      .eq('tontine_id', tontineId);

    // Credit winner wallet automatically
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

      await supabaseAdmin.from('wallet_transactions').insert({
        from_user_id: winner.user_id,
        to_user_id: winner.user_id,
        amount: msnAmount,
        transaction_type: 'order_profit',
        description: `🎉 Gain tontine ${tontine.name} - Cycle ${nextCycle}`,
        status: 'completed',
      });

      console.log(`Winner ${winner.user_id} credited with ${msnAmount} MSN`);
    }

    // Send notification message to tontine group
    await supabaseAdmin.from('tontine_messages').insert({
      tontine_id: tontineId,
      user_id: winner.user_id,
      content: `🎉 Félicitations! Le tirage du cycle ${nextCycle} a désigné le gagnant qui remporte ${totalAmount.toLocaleString()} FCFA!`,
    });

    console.log(`Draw completed successfully for tontine ${tontineId}`);

    return new Response(
      JSON.stringify({
        success: true,
        winner_id: winner.user_id,
        cycle: nextCycle,
        amount: totalAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
