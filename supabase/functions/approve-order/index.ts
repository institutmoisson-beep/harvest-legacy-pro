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
    // User auth client for checking permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Service role client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Non authentifié');
    }

    // Check if user is admin using service role client (bypasses RLS)
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      throw rolesError;
    }

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'financier');
    if (!isAdmin) {
      throw new Error('Accès non autorisé');
    }

    const { orderId, action }: ApproveOrderRequest = await req.json();

    if (!orderId || !['approve', 'reject'].includes(action)) {
      throw new Error('Paramètres invalides');
    }

    console.log(`Admin ${user.id} is ${action}ing order ${orderId}`);

    // Get order details using admin client
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw orderError;
    }
    if (!order) throw new Error('Commande introuvable');

    if (action === 'approve') {
      // Update order status to validated using admin client
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      // Calculate profit = 5% du prix total (purchase_price * quantity)
      const totalPrice = Number(order.purchase_price) * Number(order.quantity);
      const profit = totalPrice * 0.05; // 5% du prix total = bénéfice
      const brokerId = order.broker_id;

      console.log(`Order total: ${totalPrice} MSN, Profit (5%): ${profit} MSN`);

      // Commission for the initiator (broker) = 40% du bénéfice
      const brokerCommission = profit * 0.40;
      console.log(`Creating broker commission: ${brokerCommission} MSN (40% of profit) for user ${brokerId}`);
      
      const { error: brokerCommError } = await supabaseAdmin.from('commissions').insert({
        user_id: brokerId,
        order_id: orderId,
        source_user_id: brokerId,
        commission_type: 'order',
        level: 0,
        commission_rate: 0.40,
        amount: brokerCommission,
      });

      if (brokerCommError) {
        console.error('Error creating broker commission:', brokerCommError);
        throw brokerCommError;
      }

      console.log(`Created broker commission: ${brokerCommission} for user ${brokerId}`);

      // Update broker wallet
      const { data: brokerWallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', brokerId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching broker wallet:', walletError);
      }

      if (brokerWallet) {
        const { error: updateWalletError } = await supabaseAdmin
          .from('wallets')
          .update({
            balance: Number(brokerWallet.balance) + brokerCommission,
          })
          .eq('user_id', brokerId);

        if (updateWalletError) {
          console.error('Error updating broker wallet:', updateWalletError);
        }

        // Create transaction record
        const { error: transactionError } = await supabaseAdmin.from('wallet_transactions').insert({
          from_user_id: brokerId,
          to_user_id: brokerId,
          amount: brokerCommission,
          transaction_type: 'commission',
          description: `Commission de vente (40%) pour commande ${order.customer_name}`,
          status: 'approved',
        });

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
        }
      } else {
        const { error: insertWalletError } = await supabaseAdmin
          .from('wallets')
          .insert({ user_id: brokerId, balance: brokerCommission });

        if (insertWalletError) {
          console.error('Error creating broker wallet:', insertWalletError);
        } else {
          const { error: transactionError } = await supabaseAdmin.from('wallet_transactions').insert({
            from_user_id: brokerId,
            to_user_id: brokerId,
            amount: brokerCommission,
            transaction_type: 'commission',
            description: `Commission de vente (40%) pour commande ${order.customer_name}`,
            status: 'approved',
          });

          if (transactionError) {
            console.error('Error creating transaction:', transactionError);
          }
        }
      }

      // Referral commissions - 20 levels with decreasing rates
      // Level 1: 30%, Level 2: 28.5%, ..., Level 20: 1.5%
      // Formula: rate = 30% - ((level - 1) * 1.5%)
      
      const referralLevels = Array.from({ length: 20 }, (_, i) => {
        const level = i + 1;
        const rate = 0.30 - ((level - 1) * 0.015); // Decreasing by 1.5% per level
        return { level, rate: Math.max(rate, 0.015) }; // Minimum 1.5%
      });

      console.log('Calculating referral commissions for 20 levels...');

      // Get all referrers up the chain (up to 20 levels)
      const { data: referrers, error: referrersError } = await supabaseAdmin
        .from('referrals')
        .select('referrer_id, level')
        .eq('referred_id', brokerId)
        .lte('level', 20)
        .order('level', { ascending: true });

      if (referrersError) {
        console.error('Error fetching referrers:', referrersError);
      } else if (referrers && referrers.length > 0) {
        console.log(`Found ${referrers.length} referrers in the chain`);
        
        for (const referrer of referrers) {
          const rateConfig = referralLevels.find(r => r.level === referrer.level);
          if (rateConfig) {
            // Commission is based on the profit (5% of total price)
            const commission = profit * rateConfig.rate;

            console.log(`Level ${referrer.level} referral: ${commission} MSN (${(rateConfig.rate * 100).toFixed(1)}% of profit) for user ${referrer.referrer_id}`);

            // Create commission record
            const { error: commError } = await supabaseAdmin.from('commissions').insert({
              user_id: referrer.referrer_id,
              order_id: orderId,
              source_user_id: brokerId,
              commission_type: 'referral',
              level: referrer.level,
              commission_rate: rateConfig.rate,
              amount: commission,
            });

            if (commError) {
              console.error(`Error creating commission for referrer ${referrer.referrer_id}:`, commError);
            } else {
              // Update wallet
              const { data: wallet, error: walletFetchError } = await supabaseAdmin
                .from('wallets')
                .select('balance')
                .eq('user_id', referrer.referrer_id)
                .single();

              if (walletFetchError && walletFetchError.code !== 'PGRST116') {
                console.error(`Error fetching wallet for referrer ${referrer.referrer_id}:`, walletFetchError);
              }

              if (wallet) {
                const { error: walletUpdateError } = await supabaseAdmin
                  .from('wallets')
                  .update({
                    balance: Number(wallet.balance) + commission,
                  })
                  .eq('user_id', referrer.referrer_id);

                if (walletUpdateError) {
                  console.error(`Error updating wallet for referrer ${referrer.referrer_id}:`, walletUpdateError);
                }

                // Create transaction record
                const { error: transError } = await supabaseAdmin.from('wallet_transactions').insert({
                  from_user_id: referrer.referrer_id,
                  to_user_id: referrer.referrer_id,
                  amount: commission,
                  transaction_type: 'commission',
                  description: `Commission parrainage niveau ${referrer.level} (${(rateConfig.rate * 100).toFixed(1)}%) pour commande ${order.customer_name}`,
                  status: 'approved',
                });

                if (transError) {
                  console.error(`Error creating transaction for referrer ${referrer.referrer_id}:`, transError);
                }
              } else {
                const { error: insertWalletError } = await supabaseAdmin
                  .from('wallets')
                  .insert({ user_id: referrer.referrer_id, balance: commission });

                if (insertWalletError) {
                  console.error(`Error creating wallet for referrer ${referrer.referrer_id}:`, insertWalletError);
                } else {
                  const { error: transError } = await supabaseAdmin.from('wallet_transactions').insert({
                    from_user_id: referrer.referrer_id,
                    to_user_id: referrer.referrer_id,
                    amount: commission,
                    transaction_type: 'commission',
                    description: `Commission parrainage niveau ${referrer.level} (${(rateConfig.rate * 100).toFixed(1)}%) pour commande ${order.customer_name}`,
                    status: 'approved',
                  });

                  if (transError) {
                    console.error(`Error creating transaction for referrer ${referrer.referrer_id}:`, transError);
                  }
                }
              }
            }
          }
        }
      } else {
        console.log('No referrers found in the chain');
      }

      console.log(`Order ${orderId} approved and commissions distributed`);
    } else if (action === 'reject') {
      // Update order status to rejected using admin client
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'rejected',
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error rejecting order:', updateError);
        throw updateError;
      }

      console.log(`Order ${orderId} rejected`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Commande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    const message = typeof error?.message === 'string'
      ? error.message
      : (typeof error === 'object' ? JSON.stringify(error) : 'Une erreur est survenue');
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
