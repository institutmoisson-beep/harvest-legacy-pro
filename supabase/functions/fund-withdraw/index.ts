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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Unauthorized: Admin role required');
    }

    const { amount, reason, description } = await req.json();

    if (!amount || !reason) {
      throw new Error('Amount and reason are required');
    }

    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // Get current fund balance
    const { data: fund, error: fundError } = await supabaseAdmin
      .from('moissonneur_fund')
      .select('*')
      .single();

    if (fundError) {
      throw fundError;
    }

    if (!fund || Number(fund.total_amount) < withdrawAmount) {
      throw new Error('Insufficient fund balance');
    }

    // Deduct from fund
    const { error: updateError } = await supabaseAdmin
      .from('moissonneur_fund')
      .update({
        total_amount: Number(fund.total_amount) - withdrawAmount,
      })
      .eq('id', fund.id);

    if (updateError) {
      throw updateError;
    }

    // Create withdrawal record
    const { error: withdrawalError } = await supabaseAdmin
      .from('fund_withdrawals')
      .insert({
        admin_id: user.id,
        amount: withdrawAmount,
        reason,
        description,
      });

    if (withdrawalError) {
      // Rollback fund update
      await supabaseAdmin
        .from('moissonneur_fund')
        .update({
          total_amount: fund.total_amount,
        })
        .eq('id', fund.id);
      throw withdrawalError;
    }

    console.log(`Fund withdrawal: ${withdrawAmount} FCFA by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        amount: withdrawAmount,
        new_balance: Number(fund.total_amount) - withdrawAmount,
        message: 'Withdrawal successful',
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
