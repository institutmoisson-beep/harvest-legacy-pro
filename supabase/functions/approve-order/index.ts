import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveOrderRequest {
  orderId: string;
  action: 'approve' | 'reject';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Check if user is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Non authentifié');
    }

    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) throw rolesError;

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'financier');
    if (!isAdmin) {
      throw new Error('Accès non autorisé');
    }

    const { orderId, action }: ApproveOrderRequest = await req.json();

    console.log(`Admin ${user.id} is ${action}ing order ${orderId}`);

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, profiles:broker_id(referred_by, referral_code)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Commande introuvable');

    if (action === 'approve') {
      // Update order status to completed
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: 'completed',
          validated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Create commissions for the broker and referrers
      const profit = Number(order.profit);
      const brokerId = order.broker_id;

      // Commission for the broker (direct seller)
      const brokerCommission = profit * 0.20; // 20%
      await supabaseClient.from('commissions').insert({
        user_id: brokerId,
        order_id: orderId,
        source_user_id: brokerId,
        commission_type: 'direct_sale',
        level: 0,
        commission_rate: 0.20,
        amount: brokerCommission,
      });

      // Get wallet and update balance for broker
      const { data: brokerWallet } = await supabaseClient
        .from('wallets')
        .select('balance')
        .eq('user_id', brokerId)
        .single();

      if (brokerWallet) {
        await supabaseClient
          .from('wallets')
          .update({
            balance: Number(brokerWallet.balance) + brokerCommission,
          })
          .eq('user_id', brokerId);

        // Create transaction record
        await supabaseClient.from('wallet_transactions').insert({
          from_user_id: brokerId,
          to_user_id: brokerId,
          amount: brokerCommission,
          transaction_type: 'commission',
          description: `Commission de vente pour commande ${order.customer_name}`,
          status: 'approved',
        });
      }

      // Referral commissions
      const referralRates = [
        { level: 1, rate: 0.10 }, // 10% niveau 1
        { level: 2, rate: 0.05 }, // 5% niveau 2
        { level: 3, rate: 0.03 }, // 3% niveau 3
        { level: 4, rate: 0.02 }, // 2% niveau 4
        { level: 5, rate: 0.01 }, // 1% niveau 5
      ];

      // Get all referrers up the chain
      const { data: referrers, error: referrersError } = await supabaseClient
        .from('referrals')
        .select('referrer_id, level')
        .eq('referred_id', brokerId)
        .in('level', [1, 2, 3, 4, 5]);

      if (referrersError) {
        console.error('Error fetching referrers:', referrersError);
      } else if (referrers && referrers.length > 0) {
        for (const referrer of referrers) {
          const rateConfig = referralRates.find(r => r.level === referrer.level);
          if (rateConfig) {
            const commission = profit * rateConfig.rate;

            // Create commission record
            await supabaseClient.from('commissions').insert({
              user_id: referrer.referrer_id,
              order_id: orderId,
              source_user_id: brokerId,
              commission_type: 'referral',
              level: referrer.level,
              commission_rate: rateConfig.rate,
              amount: commission,
            });

            // Update wallet
            const { data: wallet } = await supabaseClient
              .from('wallets')
              .select('balance')
              .eq('user_id', referrer.referrer_id)
              .single();

            if (wallet) {
              await supabaseClient
                .from('wallets')
                .update({
                  balance: Number(wallet.balance) + commission,
                })
                .eq('user_id', referrer.referrer_id);

              // Create transaction record
              await supabaseClient.from('wallet_transactions').insert({
                from_user_id: referrer.referrer_id,
                to_user_id: referrer.referrer_id,
                amount: commission,
                transaction_type: 'commission',
                description: `Commission niveau ${referrer.level} pour commande ${order.customer_name}`,
                status: 'approved',
              });
            }
          }
        }
      }

      console.log(`Order ${orderId} approved and commissions distributed`);
    } else if (action === 'reject') {
      // Update order status to rejected
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: 'rejected',
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      console.log(`Order ${orderId} rejected`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Commande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Une erreur est survenue' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
