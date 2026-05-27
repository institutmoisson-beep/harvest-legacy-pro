
DROP POLICY IF EXISTS "Authenticated users can read active employment domains" ON public.user_employment;

DROP POLICY IF EXISTS "Authenticated users can contribute" ON public.fundraiser_contributions;
CREATE POLICY "Authenticated users can contribute"
ON public.fundraiser_contributions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR (is_anonymous = true AND user_id IS NULL));

DROP POLICY IF EXISTS "System and admins can insert payment history" ON public.savings_payments;
CREATE POLICY "Admins can insert payment history"
ON public.savings_payments
FOR INSERT TO authenticated
WITH CHECK (has_access_level(auth.uid(), 90));

DROP POLICY IF EXISTS "Authenticated users can buy tickets" ON public.ticket_purchases;
CREATE POLICY "Authenticated users can buy tickets"
ON public.ticket_purchases
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated can view pending offers" ON public.immo_offers;
CREATE POLICY "Hosts can view pending offers"
ON public.immo_offers
FOR SELECT TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.immo_listings l
    WHERE l.host_id = auth.uid() AND l.is_active = true
  )
);
