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
      throw new Error('Non autorisé');
    }

    const { memberCode, amount } = await req.json();

    if (!memberCode || !amount || amount <= 0) {
      throw new Error('Données invalides');
    }

    console.log('Agent withdrawal request:', { agentId: user.id, memberCode, amount });

    // Verify agent role
    const { data: agentRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'agent')
      .single();

    if (!agentRole) {
      throw new Error('Rôle agent requis');
    }

    // Find member by QR code
    const { data: qrData, error: qrError } = await supabase
      .from('user_qr_codes')
      .select('user_id')
      .eq('qr_code_data', memberCode)
      .single();

    if (qrError || !qrData) {
      throw new Error('Code QR invalide');
    }

    const memberId = qrData.user_id;

    // Check member's balance
    const { data: memberWallet, error: memberWalletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', memberId)
      .single();

    if (memberWalletError || !memberWallet) {
      throw new Error('Portefeuille membre introuvable');
    }

    if (memberWallet.balance < amount) {
      throw new Error('Solde insuffisant dans le portefeuille membre');
    }

    // Debit member wallet
    const { error: debitError } = await supabase.rpc('decrement_wallet_balance', {
      p_user_id: memberId,
      p_amount: amount
    });

    if (debitError) {
      console.error('Debit error:', debitError);
      throw new Error('Erreur lors du débit du portefeuille membre');
    }

    // Credit agent wallet
    const { error: creditError } = await supabase.rpc('increment_wallet_balance', {
      p_user_id: user.id,
      p_amount: amount
    });

    if (creditError) {
      console.error('Credit error:', creditError);
      // Rollback member debit
      await supabase.rpc('increment_wallet_balance', {
        p_user_id: memberId,
        p_amount: amount
      });
      throw new Error('Erreur lors du crédit du portefeuille agent');
    }

    // Record transaction
    const { error: transError } = await supabase
      .from('agent_transactions')
      .insert({
        agent_id: user.id,
        member_id: memberId,
        transaction_type: 'withdrawal',
        amount: amount,
        status: 'completed',
        description: 'Retrait via agent'
      });

    if (transError) {
      console.error('Transaction record error:', transError);
    }

    console.log('Withdrawal completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Retrait effectué avec succès'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-withdrawal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
