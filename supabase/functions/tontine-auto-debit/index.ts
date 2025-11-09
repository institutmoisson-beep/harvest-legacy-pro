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

    console.log(`Auto-debiting participants for tontine ${tontineId}`);

    // Get tontine details
    const { data: tontine, error: tontineError } = await supabaseAdmin
      .from('tontines')
      .select('*')
      .eq('id', tontineId)
      .single();

    if (tontineError || !tontine) {
      throw new Error('Tontine introuvable');
    }

    // Get all participants
    const { data: participants, error: partsError } = await supabaseAdmin
      .from('tontine_participants')
      .select('*')
      .eq('tontine_id', tontineId)
      .eq('has_received', false);

    if (partsError) {
      throw new Error('Erreur lors de la récupération des participants');
    }

    if (!participants || participants.length === 0) {
      throw new Error('Aucun participant trouvé');
    }

    let successCount = 0;
    let failCount = 0;

    // Debit each participant
    for (const participant of participants) {
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', participant.user_id)
        .single();

      if (wallet) {
        const msnAmount = tontine.amount / 750; // Convert FCFA to MSN

        if (Number(wallet.balance) >= msnAmount) {
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
            transaction_type: 'order_profit',
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
            tontine_id: tontineId,
            user_id: participant.user_id,
            amount: tontine.amount,
            cycle_number: tontine.current_cycle + 1,
            payment_method: 'wallet',
            status: 'completed',
          });

          successCount++;
        } else {
          failCount++;
          console.log(`Insufficient balance for user ${participant.user_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        debited: successCount,
        failed: failCount,
        message: `Debited ${successCount} participants, ${failCount} failed`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
