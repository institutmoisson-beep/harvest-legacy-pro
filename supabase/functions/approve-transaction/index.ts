import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { transactionId, status } = await req.json();

    if (!transactionId || !['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid parameters');
    }

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction already processed');
    }

    // Update transaction status
    await supabase
      .from('wallet_transactions')
      .update({ status })
      .eq('id', transactionId);

    // If approved, update wallet balance
    if (status === 'approved') {
      if (transaction.transaction_type === 'deposit') {
        // Add to wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', transaction.from_user_id)
          .single();

        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance + transaction.amount })
            .eq('user_id', transaction.from_user_id);
        }
      } else if (transaction.transaction_type === 'withdrawal') {
        // Apply withdrawal fee (0.60%)
        const feeRate = 0.006;
        const feeAmount = transaction.fee_amount ?? Math.round(Number(transaction.amount) * feeRate * 100) / 100;
        const totalDebit = Number(transaction.amount) + Number(feeAmount);

        // Deduct from wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', transaction.from_user_id)
          .single();

        if (wallet) {
          await supabase
            .from('wallets')
            .update({ balance: wallet.balance - totalDebit })
            .eq('user_id', transaction.from_user_id);
        }

        // Ledger recording and optional agent commission (40% of fee)
        const agentCommission = transaction.acted_by ? Math.round(Number(feeAmount) * 0.4 * 100) / 100 : 0;
        const platformFee = Math.round((Number(feeAmount) - agentCommission) * 100) / 100;
        await supabase.from('fees_ledger').insert({
          transaction_id: transaction.id,
          user_id: transaction.from_user_id,
          agent_id: transaction.acted_by || null,
          operation: 'withdraw',
          base_amount: transaction.amount,
          fee_rate: feeRate,
          fee_amount: feeAmount,
          agent_commission: agentCommission,
          platform_fee: platformFee,
        });

        if (transaction.acted_by && agentCommission > 0) {
          const { data: agentWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', transaction.acted_by)
            .single();
          if (agentWallet) {
            await supabase
              .from('wallets')
              .update({ balance: agentWallet.balance + agentCommission })
              .eq('user_id', transaction.acted_by);
          }
          await supabase.from('wallet_transactions').insert({
            from_user_id: transaction.acted_by,
            to_user_id: transaction.acted_by,
            amount: agentCommission,
            transaction_type: 'commission',
            status: 'approved',
            description: `Commission agent (retrait) ${agentCommission}`,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Transaction ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in approve-transaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
