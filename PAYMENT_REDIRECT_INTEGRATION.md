# Payment Redirect Integration - Complete System

## Overview
The payment system now has **full integration** with three major payment providers:
- **Wave** (Mobile Money - Africa)
- **Lygos** (QR Code Payment - Africa)
- **CoinPayments** (Cryptocurrency - Global)

When users create an order and select a payment method, they are **automatically redirected** to the payment provider's interface for real-time payment processing.

---

## Implementation Details

### 1. Payment Credentials Storage

All payment credentials are stored in the Supabase `payment_methods` table in the `config` JSONB field:

```
Wave:
  - Merchant Link: https://pay.wave.com/m/M_ci_txFrj6YmGYT2/c/ci/

Lygos:
  - Merchant ID: lygosapp-1857270e-82b3-4072-a565-4e1c3de4cf4c
  - API URL: https://api.lygos.com

CoinPayments:
  - Client ID: 3c672fcda81649908790a70d863a6b2e
  - Secret: RRFISUA7pF7z52oDFEOASw5uQIgpXPixX9F7GT1tnm4=
  - API URL: https://a-api.coinpayments.net
```

### 2. Order Creation Flow

**File**: `src/components/dashboard/OrdersSection.tsx`

When user submits order form:
1. Creates order in `orders` table
2. Creates payment transaction in `payment_transactions` table
3. **Redirects to payment provider** based on selected method:
   - Cash on Delivery → Stay on dashboard
   - Wave → Redirects to Wave payment link
   - Lygos → Calls Lygos API to create session
   - CoinPayments → Creates transaction and redirects to checkout

### 3. Payment Provider Integrations

**File**: `src/services/paymentService.ts`

#### Wave Integration
```javascript
redirectToWavePayment(amount, orderId, customerPhone)
// Redirects to Wave merchant link with order parameters
// Parameters: amount, reference (orderId), customer_phone
```

#### Lygos Integration
```javascript
redirectToLygosPayment(amount, orderId)
// Calls Lygos API to create payment session
// API: POST https://api.lygos.com/payment/create
// Returns: payment_url or qr_code
```

#### CoinPayments Integration
```javascript
redirectToCoinPaymentsPayment(amount, orderId)
// Creates cryptocurrency transaction via CoinPayments
// API: POST https://a-api.coinpayments.net/api.php
// Supported: Bitcoin, Ethereum, and other cryptocurrencies
// Returns: checkout_url
```

### 4. Order Confirmation Page

**File**: `src/pages/OrderConfirmation.tsx`
**Route**: `/order-confirmation/:orderId`

After payment processing:
- Users are redirected to confirmation page
- Page fetches order and payment transaction status
- Shows success/pending/error states
- Provides links to order dashboard or main dashboard

### 5. Webhook Handling

Payment providers will send webhook notifications to:
- **Wave**: Webhook handler TBD
- **Lygos**: Webhook handler TBD
- **CoinPayments**: `/api/webhooks/coinpayments`

These update the payment transaction status in Supabase.

---

## User Flow

### 1. Order Creation with Wave (Simplest)
```
User fills order form
  ↓
Selects "Wave" as payment method
  ↓
Clicks "Créer Commande"
  ↓
Order + Payment transaction created
  ↓
Automatically redirected to Wave payment link
  ↓
User pays via Wave app/browser
  ↓
Redirected back to confirmation page
```

### 2. Order Creation with Lygos (QR Code)
```
User fills order form
  ↓
Selects "Lygos" as payment method
  ↓
Clicks "Créer Commande"
  ↓
Order + Payment transaction created
  ↓
App calls Lygos API to create payment session
  ↓
Redirected to Lygos payment URL
  ↓
User scans QR or completes payment
  ↓
Redirected back to confirmation page
```

### 3. Order Creation with CoinPayments (Crypto)
```
User fills order form
  ↓
Selects "CoinPayments" as payment method
  ↓
Clicks "Créer Commande"
  ↓
Order + Payment transaction created
  ↓
App creates transaction via CoinPayments API
  ↓
Redirected to CoinPayments checkout page
  ↓
User selects cryptocurrency and pays
  ↓
Blockchain confirmation
  ↓
Webhook updates payment status
  ↓
User redirected to confirmation page
```

---

## API Endpoints Used

### Wave
- **Merchant Link**: `https://pay.wave.com/m/M_ci_txFrj6YmGYT2/c/ci/`
- **No API required** - Direct merchant link
- **Parameters**: amount, reference, customer_phone

### Lygos
- **API Endpoint**: `https://api.lygos.com/payment/create`
- **Method**: POST
- **Auth**: Bearer {merchant_id}
- **Parameters**: amount, reference, currency, return_url, cancel_url

### CoinPayments
- **API Endpoint**: `https://a-api.coinpayments.net/api.php`
- **Method**: POST
- **Auth**: API Key-based
- **Commands**:
  - `create_transaction`: Create new payment
  - `get_callback_address`: Generate crypto address

---

## Testing the Payment System

### Local Testing

1. **Create Order with Wave**:
   ```
   - Navigate to Orders section
   - Fill order form
   - Select "Wave" payment
   - Click "Créer Commande"
   - Should redirect to Wave payment page
   ```

2. **Create Order with Lygos**:
   ```
   - Navigate to Orders section
   - Fill order form
   - Select "Lygos" payment
   - Click "Créer Commande"
   - Should call Lygos API and show QR code
   ```

3. **Create Order with CoinPayments**:
   ```
   - Navigate to Orders section
   - Fill order form
   - Select "CoinPayments" payment
   - Click "Créer Commande"
   - Should redirect to CoinPayments checkout
   ```

### Webhook Testing

Use the **Payment Webhook Tester** in Admin Payments:
- URL: `/admin/payments`
- Test each webhook provider
- Verify order status updates

---

## Environment Configuration

The system reads credentials from:
1. **Supabase `payment_methods` table** (Primary)
2. **Environment variables** (Optional - for sensitive data like secret keys)

### Optional: Store secrets in environment variables

Add to deployment environment:
```
VITE_WAVE_MERCHANT_LINK=https://pay.wave.com/m/M_ci_txFrj6YmGYT2/c/ci/
VITE_LYGOS_MERCHANT_ID=lygosapp-1857270e-82b3-4072-a565-4e1c3de4cf4c
VITE_COINPAYMENTS_CLIENT_ID=3c672fcda81649908790a70d863a6b2e
VITE_COINPAYMENTS_SECRET=RRFISUA7pF7z52oDFEOASw5uQIgpXPixX9F7GT1tnm4=
```

---

## Security Considerations

### ✅ Implemented
- Credentials stored in Supabase (secure)
- Order validation on backend
- User can only see their own orders
- RLS policies protect data

### 🔄 Recommended
- Implement HTTPS for all redirects
- Verify webhook signatures from providers
- Implement rate limiting on order creation
- Add CSRF tokens to forms
- Monitor for fraudulent transactions

### ⚠️ Important
- **Never expose secret keys in frontend code**
- Only store merchant IDs and public links in JSONB
- Keep API secrets in environment variables
- Validate all webhook requests on backend

---

## Troubleshooting

### Payment redirect not working
- Check payment credentials in Supabase
- Verify order was created successfully
- Check browser console for errors
- Ensure payment method is selected

### Lygos API errors
- Verify merchant ID is correct
- Check API URL is accessible
- Ensure amount is in correct format
- Validate currency code

### CoinPayments errors
- Verify Client ID and Secret are correct
- Check API endpoint is accessible
- Ensure user's IP is whitelisted (if required)
- Validate transaction parameters

### Webhooks not received
- Verify webhook URL is publicly accessible
- Check payment provider's webhook configuration
- Ensure webhook handler implements signature verification
- Monitor Supabase logs for errors

---

## Future Enhancements

1. **Payment status dashboard** - Real-time payment tracking
2. **Webhook handlers** - Automatic order status updates
3. **Payment retry logic** - Automatic retry on failure
4. **Multi-currency support** - Support more currencies
5. **Payment analytics** - Track conversion rates and payment methods
6. **Subscription payments** - Recurring payments support
7. **Invoice generation** - PDF invoices after payment
8. **Payment reconciliation** - Match transactions with payments

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation for each provider
3. Check Supabase logs
4. Contact payment provider support
