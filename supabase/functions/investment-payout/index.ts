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

    console.log('Starting investment payout check...');

    // Get all active investments
    const { data: investments, error: investmentsError } = await supabaseAdmin
      .from('investment_products')
      .select('*')
      .eq('status', 'active');

    if (investmentsError) {
      throw investmentsError;
    }

    if (!investments || investments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active investments found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const now = new Date();
    let payoutsProcessed = 0;

    for (const investment of investments) {
      const lastPayout = investment.last_payout_at ? new Date(investment.last_payout_at) : new Date(investment.created_at);
      const frequency = investment.payout_frequency;
      
      let shouldPayout = false;
      const hoursSinceLastPayout = (now.getTime() - lastPayout.getTime()) / (1000 * 60 * 60);

      // Check if payout is due based on frequency
      switch (frequency) {
        case 'daily':
          shouldPayout = hoursSinceLastPayout >= 24;
          break;
        case 'two_days':
          shouldPayout = hoursSinceLastPayout >= 48;
          break;
        case 'weekly':
          shouldPayout = hoursSinceLastPayout >= 168;
          break;
        case 'two_weeks':
          shouldPayout = hoursSinceLastPayout >= 336;
          break;
        case 'monthly':
          shouldPayout = hoursSinceLastPayout >= 720;
          break;
        case 'two_months':
          shouldPayout = hoursSinceLastPayout >= 1440;
          break;
        case 'six_months':
          shouldPayout = hoursSinceLastPayout >= 4320;
          break;
      }

      if (shouldPayout) {
        // Calculate earnings (16% profit, investor gets 46% of that)
        const profit = investment.investment_amount * 0.16;
        const investorEarnings = profit * 0.46;
        const totalPayout = investment.investment_amount + investorEarnings;

        // Update investor wallet
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('balance')
          .eq('user_id', investment.investor_id)
          .single();

        if (wallet) {
          const msnAmount = totalPayout / 750; // Convert to MSN

          await supabaseAdmin
            .from('wallets')
            .update({
              balance: Number(wallet.balance) + msnAmount,
            })
            .eq('user_id', investment.investor_id);

          // Create transaction record
          await supabaseAdmin.from('wallet_transactions').insert({
            from_user_id: investment.investor_id,
            to_user_id: investment.investor_id,
            amount: msnAmount,
            transaction_type: 'order_profit',
            description: `Gain investissement ${investment.product_name}`,
            status: 'completed',
          });

          // Update investment
          await supabaseAdmin
            .from('investment_products')
            .update({
              investor_earnings: Number(investment.investor_earnings || 0) + investorEarnings,
              total_profit: Number(investment.total_profit || 0) + profit,
              last_payout_at: now.toISOString(),
              status: 'completed', // Mark as completed after payout
            })
            .eq('id', investment.id);

          payoutsProcessed++;
          console.log(`Processed payout for investment ${investment.id}: ${totalPayout} FCFA`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payouts_processed: payoutsProcessed,
        message: `Processed ${payoutsProcessed} investment payouts`,
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
