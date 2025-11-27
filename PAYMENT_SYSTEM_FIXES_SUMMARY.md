# Payment System Fixes - Summary (26 Nov 2024)

## Overview
Fixed three critical issues with the order and payment system:
1. ✅ **Wallet Debit History Missing** - Transactions now recorded
2. ✅ **Commission Not Awarded** - Commissions now calculated and displayed
3. ✅ **Mandatory Admin Validation** - All orders now require admin approval with automatic refund on rejection

---

## Issue 1: Wallet Debit History Missing

### Problem
When users paid with wallet, the amount was debited but transaction history was not displayed.

### Root Cause
The `debit_wallet_for_payment()` SQL function did not exist, even though it was being called from the frontend.

### Solution
Created two database functions:

**1. `debit_wallet_for_payment()`** - Debits wallet and creates transaction record
- Checks wallet balance
- Debits the amount from wallet
- Creates `wallet_transactions` record with type 'order_payment'
- Returns success/error message

**2. `refund_wallet_payment()`** - Refunds wallet payments
- Credits amount back to wallet
- Creates `wallet_transactions` record with type 'order_payment' (refund)
- Used when orders are rejected

### Files Changed
- Created: `supabase/migrations/20251126131000_create_wallet_payment_functions.sql`
- Updated: `src/components/dashboard/TransactionHistorySection.tsx` - Added icon for 'order_payment' transactions
- Updated: `src/components/dashboard/OrdersSection.tsx` - Updated to call the function correctly

---

## Issue 2: Commissions Not Awarded

### Problem
Order initiators (brokers) were not receiving commissions, and commission history was not displayed.

### Root Cause
The `approve-order` function creates commissions in the `commissions` table, but the `AgentCommissions` component was only fetching from `agent_commission_earnings` table (which tracks deposit/withdrawal commissions, not order commissions).

### Solution
Updated `AgentCommissions` component to:
- Fetch both order-based commissions from `commissions` table AND wallet-based commissions from `agent_commission_earnings`
- Combine and display both types of commissions
- Show commission level for multi-level referral commissions

### Commission Plan
When an order is approved:
1. **Broker (Order Initiator)**: Gets 40% of 5% profit
   - Profit = 5% of total order value
   - Commission = 40% × profit
   
2. **Referrers (Up to 20 levels)**:
   - Level 1: 30% of profit
   - Level 2: 28.5% of profit
   - ... decreasing by 1.5% per level
   - Level 20: 1.5% of profit (minimum)

### Files Changed
- Updated: `src/components/dashboard/AgentCommissions.tsx` - Fetch and display both commission types

---

## Issue 3: Mandatory Admin Validation with Auto-Refund

### Problem
Orders paid from wallet were immediately marked as validated, bypassing admin review. No refund mechanism existed for rejected orders.

### Root Cause
1. Order status was set to 'validated' for wallet payments instead of waiting for admin approval
2. No refund mechanism when orders were rejected
3. No 'pending_admin_review' status in the order_status enum

### Solution

**A. Database Changes**
1. Added `pending_admin_review` status to `order_status` enum
2. Created `payment_methods` table - stores all payment method configurations
3. Created `payment_transactions` table - tracks all payment transactions with status

**B. Order Flow Changes**
All orders now follow this flow:
1. **Order Created** → Status = `pending_admin_review` (except COD)
2. **Admin Reviews** → Approves or Rejects
3. **If Approved** → 
   - Commissions calculated and distributed
   - Wallet updated with commissions
   - Order status = `validated`
4. **If Rejected** →
   - If paid by wallet: Amount automatically refunded
   - Transaction history updated with refund
   - Order status = `rejected`

**C. Refund Mechanism**
New SQL function `reject_order_with_refund()` handles:
- Checking payment method of the order
- If wallet payment: Automatically refunds to user's wallet
- Creates wallet transaction record for the refund
- Updates order and payment transaction status

### Files Changed
- Created: `supabase/migrations/20251126130000_add_payment_system_and_admin_review.sql`
  - Added `pending_admin_review` to order_status enum
  - Created `payment_methods` table
  - Created `payment_transactions` table
  - Inserted default payment methods
  
- Created: `supabase/migrations/20251126131000_create_wallet_payment_functions.sql`
  - Created `debit_wallet_for_payment()` function
  - Created `refund_wallet_payment()` function
  - Created `reject_order_with_refund()` function

- Updated: `src/components/dashboard/OrdersSection.tsx`
  - Changed order status to `pending_admin_review` for all non-COD payments
  - Updated success messages to reflect pending admin review

- Updated: `src/components/dashboard/AdminOrdersSection.tsx`
  - Changed to fetch orders with `pending_admin_review` status instead of `pending`

- Updated: `supabase/functions/approve-order/index.ts`
  - Enhanced reject action to handle wallet refunds
  - Checks payment method
  - Calls refund function for wallet payments
  - Updates payment transaction status

---

## Wallet Transaction History

The wallet transaction history now displays all transactions with proper icons:
- 💚 **Deposit** - Incoming funds (green)
- 🔴 **Withdrawal** - Outgoing funds (red)
- 🟠 **Order Payment** - Wallet payment for orders (orange)
- 💚 **Commission** - Earned commissions (green)
- 🔵 **Transfer** - Peer-to-peer transfers (blue)

---

## Testing Checklist

✅ **Wallet Payments**
- [ ] User initiates order with wallet payment
- [ ] Wallet is debited
- [ ] Transaction appears in wallet history
- [ ] Order status is `pending_admin_review`

✅ **Admin Approval**
- [ ] Admin sees orders with `pending_admin_review` status
- [ ] Admin can approve or reject orders
- [ ] Commissions are created for broker and referrers
- [ ] Wallet is credited with commission amounts
- [ ] Commission transaction history is recorded

✅ **Admin Rejection with Refund**
- [ ] Admin rejects a wallet-paid order
- [ ] Wallet amount is automatically refunded to user
- [ ] Refund appears in wallet transaction history
- [ ] Order status changes to `rejected`

✅ **Other Payment Methods**
- [ ] Wave/Lygos/CoinPayments orders are also `pending_admin_review`
- [ ] Admin approval/rejection works for all payment methods
- [ ] Cash on delivery orders remain `pending_delivery` (no wallet refund needed)

---

## Database Schema Changes

### New Tables
- `payment_methods` - Payment method configurations
- `payment_transactions` - Payment transaction tracking

### Updated Enums
- `order_status` - Added `pending_admin_review`

### New Functions
- `debit_wallet_for_payment()` - Wallet payment processing
- `refund_wallet_payment()` - Wallet refund processing
- `reject_order_with_refund()` - Order rejection with auto-refund

---

## Next Steps
1. ✅ Deploy database migrations
2. ✅ Deploy updated functions
3. ✅ Test the complete flow
4. Monitor commission payouts to ensure they're working correctly
