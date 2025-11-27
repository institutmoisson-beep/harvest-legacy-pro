-- Create function to debit wallet for payment
-- This function handles wallet debit with transaction recording
CREATE OR REPLACE FUNCTION public.debit_wallet_for_payment(
  p_user_id UUID,
  p_amount NUMERIC,
  p_order_id UUID,
  p_product_name TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Check current wallet balance
  SELECT balance INTO v_current_balance
  FROM public.wallets
  WHERE user_id = p_user_id;

  -- If wallet doesn't exist or balance is insufficient, raise exception
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false::boolean, 'Portefeuille non trouvé'::TEXT;
    RETURN;
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false::boolean, 'Solde insuffisant'::TEXT;
    RETURN;
  END IF;

  -- Debit the wallet
  UPDATE public.wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create wallet transaction record
  INSERT INTO public.wallet_transactions (
    from_user_id,
    to_user_id,
    amount,
    transaction_type,
    description,
    status
  ) VALUES (
    p_user_id,
    p_user_id,
    p_amount,
    'order_payment'::transaction_type,
    'Paiement de la commande ' || p_order_id::TEXT || ' - ' || p_product_name,
    'completed'
  ) RETURNING id INTO v_transaction_id;

  -- Return success
  RETURN QUERY SELECT true::boolean, 'Portefeuille débité avec succès'::TEXT;
END;
$$;

-- Create function to refund wallet payment
-- This function refunds a wallet payment when an order is rejected
CREATE OR REPLACE FUNCTION public.refund_wallet_payment(
  p_user_id UUID,
  p_amount NUMERIC,
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Commande rejetée'
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Credit the wallet
  UPDATE public.wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create wallet transaction record for refund
  INSERT INTO public.wallet_transactions (
    from_user_id,
    to_user_id,
    amount,
    transaction_type,
    description,
    status
  ) VALUES (
    p_user_id,
    p_user_id,
    p_amount,
    'order_payment'::transaction_type,
    'Remboursement - ' || p_reason || ' (commande ' || p_order_id::TEXT || ')',
    'completed'
  ) RETURNING id INTO v_transaction_id;

  -- Return success
  RETURN QUERY SELECT true::boolean, 'Portefeuille remboursé avec succès'::TEXT;
END;
$$;

-- Create function to handle order rejection with wallet refund
-- This function is called when an admin rejects an order
CREATE OR REPLACE FUNCTION public.reject_order_with_refund(
  p_order_id UUID,
  p_rejection_reason TEXT DEFAULT 'Commande rejetée par l\'administrateur'
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_payment RECORD;
  v_refund_result RECORD;
BEGIN
  -- Get order details
  SELECT id, broker_id, purchase_price, quantity, product_name
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RETURN QUERY SELECT false::boolean, 'Commande non trouvée'::TEXT;
    RETURN;
  END IF;

  -- Get payment transaction details
  SELECT id, payment_method_id, amount
  INTO v_payment
  FROM public.payment_transactions
  WHERE order_id = p_order_id
  LIMIT 1;

  -- Update order status to rejected
  UPDATE public.orders
  SET status = 'rejected'::order_status
  WHERE id = p_order_id;

  -- If payment was made with wallet, refund it
  IF v_payment IS NOT NULL THEN
    -- Check if it was a wallet payment
    SELECT pm.name
    INTO v_refund_result
    FROM public.payment_methods pm
    WHERE pm.id = v_payment.payment_method_id
    AND pm.name = 'wallet';

    IF v_refund_result IS NOT NULL THEN
      -- Refund the wallet
      PERFORM public.refund_wallet_payment(
        v_order.broker_id,
        v_order.purchase_price * v_order.quantity * 750, -- Convert MSN to FCFA
        p_order_id,
        p_rejection_reason
      );
    END IF;

    -- Update payment transaction status to failed
    UPDATE public.payment_transactions
    SET status = 'failed'
    WHERE id = v_payment.id;
  END IF;

  RETURN QUERY SELECT true::boolean, 'Commande rejetée et remboursement traité'::TEXT;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_payment(UUID, NUMERIC, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_wallet_payment(UUID, NUMERIC, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_order_with_refund(UUID, TEXT) TO authenticated;
