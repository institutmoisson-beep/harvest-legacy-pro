import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: max 10 withdrawals per user per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// Transaction limits
const MAX_TRANSACTION_AMOUNT = 1000000;
const MIN_TRANSACTION_AMOUNT = 0.0001;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (userLimit.count >= MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

function validateAmount(amount: any): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error('Amount must be a valid number');
  }
  
  if (amount < MIN_TRANSACTION_AMOUNT) {
    throw new Error(`Amount must be at least ${MIN_TRANSACTION_AMOUNT} MSN`);
  }
  
  if (amount > MAX_TRANSACTION_AMOUNT) {
    throw new Error(`Amount cannot exceed ${MAX_TRANSACTION_AMOUNT} MSN`);
  }
  
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 4) {
    throw new Error('Amount cannot have more than 4 decimal places');
  }
  
  return amount;
}

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

    // Rate limiting check
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Trop de demandes. Veuillez réessayer dans 10 minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { amount: rawAmount, paymentMethod, paymentContact } = body;

    // Validate amount
    const amount = validateAmount(rawAmount);

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
    const feePercentage = 0.006;
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
      const commissionAmount = feeAmount * 0.40;
      
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