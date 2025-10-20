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

    // Find recipient
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id')
      .or(`id.eq.${recipientIdentifier},referral_code.eq.${recipientIdentifier},phone.eq.${recipientIdentifier}`)
      .single();

    if (recipientError || !recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient.id === user.id) {
      throw new Error('Cannot transfer to yourself');
    }

    // Update sender wallet
    const { error: senderUpdateError } = await supabase
      .from('wallets')
      .update({ balance: senderWallet.balance - amount })
      .eq('user_id', user.id);

    if (senderUpdateError) {
      throw senderUpdateError;
    }

    // Update recipient wallet
    const { data: recipientWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', recipient.id)
      .single();

    if (recipientWallet) {
      await supabase
        .from('wallets')
        .update({ balance: recipientWallet.balance + amount })
        .eq('user_id', recipient.id);
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        from_user_id: user.id,
        to_user_id: recipient.id,
        amount,
        transaction_type: 'transfer',
        status: 'approved',
        description: 'Transfert instantané'
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction error:', txError);
      throw txError;
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