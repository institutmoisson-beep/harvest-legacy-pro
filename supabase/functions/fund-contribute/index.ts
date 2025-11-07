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

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError) throw walletError;

    if (!wallet || wallet.balance < amount) {
      throw new Error('Solde insuffisant');
    }

    // Deduct from wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - amount })
      .eq('user_id', user.id);

    if (deductError) throw deductError;

    // Update fund
    const { data: fundList } = await supabase
      .from('moissonneur_fund')
      .select('*')
      .limit(1);

    const fund = fundList?.[0];
    const newTotal = (fund?.total_amount || 0) + amount;

    const { error: fundError } = await supabase
      .from('moissonneur_fund')
      .update({ total_amount: newTotal })
      .eq('id', fund?.id);

    if (fundError) throw fundError;

    // Record contribution
    const { error: contribError } = await supabase
      .from('fund_contributions')
      .insert({
        user_id: user.id,
        amount: amount
      });

    if (contribError) throw contribError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contribution réussie',
        newBalance: wallet.balance - amount,
        newFundTotal: newTotal
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fund-contribute:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});