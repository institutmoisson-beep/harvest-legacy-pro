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

    const { amount, recipientIdentifier } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!recipientIdentifier) {
      throw new Error('Recipient identifier is required');
    }

    // Check sender balance
    const { data: senderWallet, error: senderWalletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (senderWalletError || !senderWallet) {
      throw new Error('Wallet not found');
    }

    if (senderWallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Find recipient by ID, referral code, phone number, or email
    let recipientId: string | null = null;
    
    console.log('Searching for recipient:', recipientIdentifier);
    
    // Try to find by UUID (direct user ID)
    const { data: directUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipientIdentifier)
      .maybeSingle();
    
    if (directUser) {
      recipientId = directUser.id;
      console.log('Found recipient by ID:', recipientId);
    } else {
      // Try to find by referral code (case-insensitive)
      const { data: byReferralCode } = await supabase
        .from('profiles')
        .select('id, referral_code')
        .ilike('referral_code', recipientIdentifier)
        .maybeSingle();
      
      if (byReferralCode) {
        recipientId = byReferralCode.id;
        console.log('Found recipient by referral code:', recipientId);
      } else {
        // Try to find by phone number
        const { data: byPhone } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', recipientIdentifier)
          .maybeSingle();
        
        if (byPhone) {
          recipientId = byPhone.id;
          console.log('Found recipient by phone:', recipientId);
        } else {
          // Try to find by email using auth.users
          const { data: authData } = await supabase.auth.admin.listUsers();
          const userByEmail = authData.users.find(u => u.email === recipientIdentifier);
          
          if (userByEmail) {
            recipientId = userByEmail.id;
            console.log('Found recipient by email:', recipientId);
          }
        }
      }
    }

    if (!recipientId) {
      throw new Error('Recipient not found');
    }

    if (recipientId === user.id) {
      throw new Error('Cannot transfer to yourself');
    }

    // Calculate fees (0.50%)
    const feePercentage = 0.005; // 0.50%
    const feeAmount = amount * feePercentage;
    const totalDeduction = amount + feeAmount;

    if (senderWallet.balance < totalDeduction) {
      throw new Error('Insufficient balance (including fees)');
    }

    // Check if user is an agent
    const { data: agentRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'agent')
      .single();

    let commissionAmount = 0;
    if (agentRole) {
      // Agent gets 40% commission
      commissionAmount = feeAmount * 0.40;
    }

    // Update sender wallet (deduct amount + fee - commission if agent)
    const { error: senderUpdateError } = await supabase
      .from('wallets')
      .update({ balance: senderWallet.balance - totalDeduction + commissionAmount })
      .eq('user_id', user.id);

    if (senderUpdateError) {
      throw senderUpdateError;
    }

    // Update recipient wallet
    const { data: recipientWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', recipientId)
      .single();

    if (recipientWallet) {
      await supabase
        .from('wallets')
        .update({ balance: recipientWallet.balance + amount })
        .eq('user_id', recipientId);
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        from_user_id: user.id,
        to_user_id: recipientId,
        amount,
        transaction_type: 'transfer',
        status: 'approved',
        description: `Transfert - Frais: ${feeAmount.toFixed(4)} MSN (0.50%)`
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
          transfer_fees: Number(treasury.transfer_fees) + feeAmount,
          total_balance: Number(treasury.total_balance) + feeAmount,
        })
        .eq('id', treasury.id);
    }

    // Record agent commission if applicable
    if (agentRole && commissionAmount > 0) {
      await supabase.from('agent_commissions').insert({
        agent_id: user.id,
        transaction_id: transaction.id,
        commission_type: 'transfer',
        transaction_fee: feeAmount,
        commission_amount: commissionAmount,
        commission_rate: 40,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transfer completed successfully',
        transaction 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wallet-transfer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});