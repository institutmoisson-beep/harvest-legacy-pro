import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// Transaction limits
const MAX_TRANSACTION_AMOUNT = 10000000;
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

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Trop de demandes. Veuillez réessayer dans 10 minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { amount: rawAmount, transactionId } = body;

    const amount = validateAmount(rawAmount);

    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }

    if (typeof transactionId !== 'string' || transactionId.length < 3 || transactionId.length > 100) {
      throw new Error('Invalid transaction ID format');
    }

    // Create transaction record with pending status
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        from_user_id: user.id,
        to_user_id: user.id,
        amount,
        transaction_type: 'deposit',
        status: 'pending',
        description: `Dépôt en attente - ID: ${transactionId}`
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
        message: 'Demande de dépôt créée, en attente de validation',
        transaction 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wallet-deposit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});