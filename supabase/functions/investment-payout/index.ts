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

    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      requestBody = {};
    }

    const { frequency } = requestBody;

    console.log('Starting investment payout check...', frequency ? `for ${frequency}` : 'for all');

    // Get all active investments
    let query = supabaseAdmin
      .from('investment_products')
      .select('*')
      .eq('status', 'active');

    // Filter by frequency if provided (for cron jobs)
    if (frequency) {
      query = query.eq('payout_frequency', frequency);
    }

    const { data: investments, error: investmentsError } = await query;

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
      const freq = investment.payout_frequency;
      
      let shouldPayout = false;
      const hoursSinceLastPayout = (now.getTime() - lastPayout.getTime()) / (1000 * 60 * 60);

      // Check if payout is due based on frequency (exact hours)
      switch (freq) {
        case 'two_days':
          shouldPayout = hoursSinceLastPayout >= 48;
          break;
        case 'weekly':
          shouldPayout = hoursSinceLastPayout >= 168; // 7 days
          break;
        case 'two_weeks':
          shouldPayout = hoursSinceLastPayout >= 336; // 14 days
          break;
        case 'monthly':
          shouldPayout = hoursSinceLastPayout >= 720; // 30 days
          break;
        case 'two_months':
          shouldPayout = hoursSinceLastPayout >= 1440; // 60 days
          break;
        case 'six_months':
          shouldPayout = hoursSinceLastPayout >= 4320; // 180 days
          break;
        default:
          shouldPayout = false;
      }

      if (shouldPayout) {
        console.log(`Processing final payout for investment ${investment.id}`);
        
        // Calculate total earnings (16% profit, investor gets 46% of that = 7.36% total return)
        const profit = investment.investment_amount * 0.16;
        const investorEarnings = profit * 0.46;
        
        // Total amount to return: capital + earnings
        const totalReturn = investment.investment_amount + investorEarnings;

        // Get wallet
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('balance')
          .eq('user_id', investment.investor_id)
          .single();

        if (wallet) {
          const msnAmount = totalReturn / 750; // Convert total return to MSN

          // Update wallet with capital + earnings
          await supabaseAdmin
            .from('wallets')
            .update({
              balance: Number(wallet.balance) + msnAmount,
            })
            .eq('user_id', investment.investor_id);

          // Create transaction record for total return
          const { data: transaction } = await supabaseAdmin.from('wallet_transactions').insert({
            from_user_id: null,
            to_user_id: investment.investor_id,
            amount: msnAmount,
            transaction_type: 'investment_return',
            status: 'completed',
            description: `Retour investissement ${investment.product_name}: ${investorEarnings.toFixed(0)} FCFA gains + ${investment.investment_amount} FCFA capital`
          }).select().single();

          if (transaction) {
            // Record the sale
            await supabaseAdmin.from('investment_sales').insert({
              investment_id: investment.id,
              sale_amount: investment.investment_amount * 1.16,
              profit_amount: profit,
              investor_earnings: investorEarnings
            });

            // Record payment history - Earnings
            await supabaseAdmin.from('investment_payment_history').insert({
              investment_id: investment.id,
              investor_id: investment.investor_id,
              payment_type: 'earnings',
              amount_paid: investorEarnings / 750, // MSN
              payment_status: 'completed'
            });

            // Record payment history - Capital return
            await supabaseAdmin.from('investment_payment_history').insert({
              investment_id: investment.id,
              investor_id: investment.investor_id,
              payment_type: 'capital_return',
              amount_paid: investment.investment_amount / 750, // MSN
              payment_status: 'completed'
            });

            // Send notification
            await supabaseAdmin.from('notifications').insert({
              user_id: investment.investor_id,
              title: '💰 Investissement Complété',
              message: `Votre investissement "${investment.product_name}" est terminé ! Vous avez reçu ${investorEarnings.toFixed(0)} FCFA de gains + votre capital de ${investment.investment_amount} FCFA.`,
              type: 'investment'
            });

            // Mark investment as completed
            await supabaseAdmin
              .from('investment_products')
              .update({
                status: 'completed',
                investor_earnings: investorEarnings,
                total_profit: profit,
                last_payout_at: now.toISOString()
              })
              .eq('id', investment.id);

            payoutsProcessed++;
            console.log(`Final payout completed for investment ${investment.id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${payoutsProcessed} investment payouts`,
        payoutsProcessed,
        totalInvestments: investments.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in investment payout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
