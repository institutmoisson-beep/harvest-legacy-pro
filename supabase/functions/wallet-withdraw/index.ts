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

    const { amount, paymentMethod, paymentContact } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!paymentMethod || !paymentContact) {
      throw new Error('Payment method and contact are required');
    }

    // Check user balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    // Calculate fees (0.60%)
    const feePercentage = 0.006; // 0.60%
    const feeAmount = amount * feePercentage;
    const totalDeduction = amount + feeAmount;

    if (wallet.balance < totalDeduction) {
      throw new Error('Insufficient balance (including fees)');
    }

    // Create withdrawal transaction with pending status
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        from_user_id: user.id,
        amount,
        transaction_type: 'withdrawal',
        status: 'pending',
        payment_method: paymentMethod,
        payment_contact: paymentContact,
        description: `Retrait en attente - Frais: ${feeAmount.toFixed(4)} MSN (0.60%)`
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction error:', txError);
      throw txError;
    }

    // Update treasury with fees
    const { data: treasury } = await supabase
      .from('treasury')
      .select('*')
      .single();

    if (treasury) {
      await supabase
        .from('treasury')
        .update({
          withdrawal_fees: Number(treasury.withdrawal_fees) + feeAmount,
          total_balance: Number(treasury.total_balance) + feeAmount,
        })
        .eq('id', treasury.id);
    }

    // Check if user is an agent and give commission
    const { data: agentRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'agent')
      .single();

    if (agentRole) {
      // Agent gets 40% commission
      const commissionAmount = feeAmount * 0.40;
      
      // Record commission
      await supabase.from('agent_commissions').insert({
        agent_id: user.id,
        transaction_id: transaction.id,
        commission_type: 'withdrawal',
        transaction_fee: feeAmount,
        commission_amount: commissionAmount,
        commission_rate: 40,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demande de retrait créée, en attente de validation',
        transaction 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wallet-withdraw:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});