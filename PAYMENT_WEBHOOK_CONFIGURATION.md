# Payment Webhook Configuration Guide

## Overview

This guide explains how to configure webhook endpoints with each payment provider for automatic payment status updates.

---

## Webhook Endpoints

Your application webhooks are hosted at:

### Wave Webhook
```
https://your-app-domain.fly.dev/functions/v1/payment-webhook-wave
```

### Lygos Webhook
```
https://your-app-domain.fly.dev/functions/v1/payment-webhook-lygos
```

### CoinPayments Webhook
```
https://your-app-domain.fly.dev/functions/v1/payment-webhook-coinpayments
```

---

## Wave Configuration

### Step 1: Log in to Wave Dashboard
1. Go to https://dashboard.wave.com
2. Login with your merchant account

### Step 2: Configure Webhook
1. Navigate to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Paste the webhook URL:
   ```
   https://your-app-domain.fly.dev/functions/v1/payment-webhook-wave
   ```
4. Select events:
   - ✅ Payment successful
   - ✅ Payment failed
   - ✅ Payment cancelled

### Step 3: Test Webhook
1. In the admin panel, go to **Admin Payments** (`/admin/payments`)
2. Click on **Test des Webhooks** tab
3. Click "📱 Tester le webhook Wave"
4. Verify success message

### Webhook Payload Format
Wave sends:
```json
{
  "transactionId": "wave_txn_123",
  "status": "SUCCESSFUL",
  "amount": 1500,
  "currency": "XAF",
  "reference": "order-id-uuid",
  "timestamp": "2025-11-26T10:00:00Z"
}
```

---

## Lygos Configuration

### Step 1: Log in to Lygos Dashboard
1. Go to https://lygos.app (or your Lygos dashboard)
2. Login with your merchant account

### Step 2: Configure Webhook
1. Navigate to **Dashboard** → **Settings** → **Webhooks**
2. Click **Add Endpoint**
3. Paste the webhook URL:
   ```
   https://your-app-domain.fly.dev/functions/v1/payment-webhook-lygos
   ```
4. Select event types:
   - ✅ payment.completed
   - ✅ payment.failed
   - ✅ payment.cancelled

### Step 3: Test Webhook
1. In the admin panel, go to **Admin Payments** (`/admin/payments`)
2. Click on **Test des Webhooks** tab
3. Click "💳 Tester le webhook Lygos"
4. Verify success message

### Webhook Payload Format
Lygos sends:
```json
{
  "paymentId": "lygos_pay_456",
  "status": "COMPLETED",
  "amount": 1500,
  "currency": "XAF",
  "reference": "order-id-uuid",
  "timestamp": "2025-11-26T10:00:00Z"
}
```

---

## CoinPayments Configuration

### Step 1: Log in to CoinPayments
1. Go to https://www.coinpayments.net
2. Login with your account

### Step 2: Configure IPN (Instant Payment Notification)
1. Navigate to **Account** → **Notifications** → **IPN Settings**
2. Paste the webhook URL in the **IPN URL** field:
   ```
   https://your-app-domain.fly.dev/functions/v1/payment-webhook-coinpayments
   ```
3. Set **IPN Method** to: **POST**
4. Select the transaction types to notify:
   - ✅ Payment received
   - ✅ Payment failed
   - ✅ Payment cancelled

### Step 3: Configure API Key
1. Navigate to **Account** → **API Keys**
2. Create a new API key (if not exists)
3. Ensure it has permissions for:
   - ✅ Get transaction info
   - ✅ View account info

### Step 4: Test Webhook
1. In the admin panel, go to **Admin Payments** (`/admin/payments`)
2. Click on **Test des Webhooks** tab
3. Click "₿ Tester le webhook CoinPayments"
4. Verify success message

### Webhook Payload Format
CoinPayments sends:
```json
{
  "txn_id": "coinpay_789",
  "status": "1",
  "amount": "0.00022",
  "currency": "BTC",
  "received": "0.00022",
  "reference": "order-id-uuid",
  "timestamp": "2025-11-26T10:00:00Z"
}
```

---

## Direct Wallet Payment (No Webhook Needed)

When users select **"💰 Portefeuille Moissonneur"** as payment method:

1. Order is created immediately
2. Wallet balance is checked
3. If balance sufficient → Amount deducted automatically
4. Transaction recorded in `wallet_transactions` table
5. Wallet balance updated in real-time
6. Order status set to "validated"

**No webhook configuration needed** - All happens synchronously in the app.

---

## Testing Payment Flows

### Test Wave Payment
1. Navigate to **Orders Section** in dashboard
2. Fill order form:
   - Product: "Test Wave"
   - Amount: "100" MSN
   - Customer: "John Doe"
3. Select payment method: **"Wave Paiement"**
4. Click **"Créer Commande"**
5. Should redirect to Wave payment interface

### Test Lygos Payment
1. Fill order form:
   - Product: "Test Lygos"
   - Amount: "100" MSN
   - Customer: "Jane Doe"
2. Select payment method: **"Lygos Paiement"**
3. Click **"Créer Commande"**
4. Should show Lygos QR code payment interface

### Test CoinPayments Payment
1. Fill order form:
   - Product: "Test Crypto"
   - Amount: "100" MSN
   - Customer: "Crypto User"
2. Select payment method: **"Cryptomonnaie"**
3. Click **"Créer Commande"**
4. Should redirect to CoinPayments checkout

### Test Wallet Payment
1. Ensure your wallet has balance (MSN)
2. Fill order form:
   - Product: "Wallet Test"
   - Amount: Less than wallet balance
   - Customer: "Your Name"
3. Select payment method: **"💰 Portefeuille Moissonneur"**
4. Click **"Créer Commande"**
5. Payment should deduct immediately
6. Order should show "validated" status
7. Wallet balance should decrease

---

## Testing Webhooks

### Using the Webhook Tester

1. Go to dashboard → **Admin Payments** page
2. Click **"Test des Webhooks"** tab
3. Optionally enter a custom **Transaction ID**
4. For each provider:
   - Click the provider button
   - Check the response
   - Verify payment status updated in database

### Manual Webhook Testing

You can also test webhooks using `curl`:

```bash
# Test Wave webhook
curl -X POST https://your-app-domain.fly.dev/functions/v1/payment-webhook-wave \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "wave_test_123",
    "status": "SUCCESSFUL",
    "amount": 1500,
    "reference": "order-uuid"
  }'

# Test Lygos webhook
curl -X POST https://your-app-domain.fly.dev/functions/v1/payment-webhook-lygos \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "lygos_test_456",
    "status": "COMPLETED",
    "amount": 1500,
    "reference": "order-uuid"
  }'

# Test CoinPayments webhook
curl -X POST https://your-app-domain.fly.dev/functions/v1/payment-webhook-coinpayments \
  -H "Content-Type: application/json" \
  -d '{
    "txn_id": "cp_test_789",
    "status": "1",
    "amount": "0.00022",
    "currency": "BTC",
    "reference": "order-uuid"
  }'
```

---

## Troubleshooting

### Wave Webhook Not Received
- ✅ Verify webhook URL is correct and publicly accessible
- ✅ Check Wave dashboard webhook log for errors
- ✅ Ensure payment status is one of: SUCCESSFUL, FAILED, CANCELLED
- ✅ Check Supabase Edge Function logs

### Lygos Webhook Not Received
- ✅ Verify webhook URL is correct
- ✅ Check Lygos webhook delivery status
- ✅ Ensure payment status is one of: COMPLETED, FAILED, CANCELLED
- ✅ Check if IP whitelist is enabled

### CoinPayments Webhook Not Received
- ✅ Verify IPN URL is set correctly in Account settings
- ✅ Check transaction history for webhook status
- ✅ Ensure user's IP is whitelisted (if required)
- ✅ Test IPN with test transactions

### Payment Status Not Updating
- ✅ Check Supabase database logs
- ✅ Verify order ID is being passed correctly
- ✅ Check payment_transactions table for corresponding record
- ✅ Review webhook payload format

---

## Payment Status Codes

### Our System Status Codes
```
pending        - Awaiting payment
pending_delivery - Cash on delivery, awaiting delivery
completed      - Payment successful
failed         - Payment failed
cancelled      - Payment cancelled
```

### Wave Status Mapping
```
SUCCESSFUL → completed
FAILED     → failed
CANCELLED  → cancelled
```

### Lygos Status Mapping
```
COMPLETED  → completed
FAILED     → failed
CANCELLED  → cancelled
```

### CoinPayments Status Mapping
```
0   → pending
1   → completed (Coins received)
2   → cancelled
-1  → failed
```

---

## Security Considerations

### ✅ Implemented
- Webhooks verify request source (when possible)
- RLS policies protect payment data
- Sensitive data not logged

### 🔄 Recommended
- Implement webhook signature verification
- Add rate limiting on webhook endpoints
- Monitor webhook delivery failures
- Log all payment events for audit trail
- Implement payment reconciliation process

### IP Whitelisting (Provider-Specific)
Some providers allow IP whitelisting:
- Wave: Usually no IP whitelist needed
- Lygos: Check if IP whitelist is enabled
- CoinPayments: Optional IP whitelist in Account settings

---

## Monitoring Webhooks

### Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Edge Functions**
3. Filter by function: `payment-webhook-wave`, `payment-webhook-lygos`, or `payment-webhook-coinpayments`
4. Review recent invocations

### Monitor Payment Transactions
1. Go to Supabase Editor
2. Query the `payment_transactions` table
3. Filter by status to see pending vs completed payments
4. Check timestamps to see if webhooks are being processed

### Check Orders Status
1. View the `orders` table
2. Filter by status to see validation progress
3. Ensure order status updates when payment completes

---

## Next Steps

1. **Configure each provider's webhook** using the guides above
2. **Test webhook delivery** using the webhook tester
3. **Monitor for errors** in Supabase logs
4. **Implement payment reconciliation** (daily check of payments vs orders)
5. **Set up alerts** for webhook failures

---

## Support

For webhook issues:
1. Check provider's webhook documentation
2. Review Supabase Edge Function logs
3. Test with webhook tester tool
4. Contact payment provider support if webhook not delivering
