import { supabase } from '@/integrations/supabase/client';

// Types de paiement
export type PaymentMethodName = 'cash_on_delivery' | 'wave' | 'lygos' | 'coinpayments';

export interface PaymentTransaction {
  id: string;
  order_id: string;
  user_id: string;
  payment_method_id: string;
  amount: number;
  currency: string;
  status: string;
  external_transaction_id?: string;
  payment_details?: any;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Rediriger vers Wave pour le paiement
 */
export const redirectToWavePayment = (amount: number, orderId: string, customerPhone: string): void => {
  const merchantLink = 'https://pay.wave.com/m/M_ci_txFrj6YmGYT2/c/ci/';
  const params = new URLSearchParams({
    amount: (amount / 750).toString(), // Convertir FCFA en MSN
    reference: orderId,
    customer_phone: customerPhone,
  });
  const paymentUrl = `${merchantLink}?${params.toString()}`;
  window.location.href = paymentUrl;
};

/**
 * Générer un lien de paiement Wave (backward compatibility)
 */
export const generateWavePaymentLink = (amount: number, orderId: string): string => {
  const merchantLink = 'https://pay.wave.com/m/M_ci_txFrj6YmGYT2/c/ci/';
  const params = new URLSearchParams({
    amount: (amount / 750).toString(),
    reference: orderId,
  });
  return `${merchantLink}?${params.toString()}`;
};

/**
 * Générer un code QR Lygos
 */
export const generateLygosQRCode = async (amount: number, orderId: string): Promise<string> => {
  try {
    const lygosMerchantId = 'lygosapp-1857270e-82b3-4072-a565-4e1c3de4cf4c';
    
    // Appel à l'API Lygos pour générer un code QR
    const response = await fetch('https://api.lygos.com/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lygosMerchantId}`,
      },
      body: JSON.stringify({
        amount: amount,
        reference: orderId,
        currency: 'XAF', // Franc CFA
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la génération du code QR Lygos');
    }

    const data = await response.json();
    return data.qrCode || data.qr_code || '';
  } catch (error) {
    console.error('Erreur Lygos:', error);
    return '';
  }
};

/**
 * Générer une adresse de paiement CoinPayments
 */
export const generateCoinPaymentsAddress = async (
  amount: number,
  currency: string = 'BTC',
  orderId: string = ''
): Promise<{ address: string; qr: string }> => {
  try {
    const clientId = '3c672fcda81649908790a70d863a6b2e';

    // Appel à l'API CoinPayments
    const response = await fetch('https://a-api.coinpayments.net/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        version: 'v1',
        cmd: 'get_callback_address',
        key: clientId,
        currency: currency,
        ipn_url: `${window.location.origin}/api/webhooks/coinpayments`,
        amount: String(amount),
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la génération de l\'adresse crypto');
    }

    const data = await response.json();
    return {
      address: data.address || '',
      qr: data.qr_url || '',
    };
  } catch (error) {
    console.error('Erreur CoinPayments:', error);
    return { address: '', qr: '' };
  }
};

/**
 * Obtenir les moyens de paiement actifs
 */
export const getPaymentMethods = async () => {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des moyens de paiement:', error);
    return [];
  }
};

/**
 * Créer une transaction de paiement
 */
export const createPaymentTransaction = async (
  orderId: string,
  userId: string,
  paymentMethodId: string,
  amount: number,
  currency: string = 'FCFA'
): Promise<PaymentTransaction | null> => {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        user_id: userId,
        payment_method_id: paymentMethodId,
        amount: amount,
        currency: currency,
        status: 'pending',
        payment_details: {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la création de la transaction:', error);
    return null;
  }
};

/**
 * Mettre à jour le statut d'une transaction
 */
export const updatePaymentStatus = async (
  transactionId: string,
  status: string,
  details?: any
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status: status,
        payment_details: details || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return false;
  }
};

/**
 * Obtenir l'historique des transactions d'un utilisateur
 */
export const getUserPaymentTransactions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        payment_methods:payment_method_id (display_name, icon),
        orders:order_id (customer_name, product_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
    return [];
  }
};

/**
 * Vérifier le statut d'une transaction
 */
export const checkPaymentStatus = async (
  transactionId: string
): Promise<PaymentTransaction | null> => {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    return null;
  }
};

/**
 * Notifier l'utilisateur d'un changement de statut de paiement
 */
export const notifyPaymentStatusChange = async (
  userId: string,
  paymentStatus: string,
  amount: number,
  paymentMethodName: string
): Promise<boolean> => {
  try {
    const messageMap: { [key: string]: string } = {
      'completed': `Votre paiement de ${amount} FCFA a été confirmé ✅`,
      'failed': `Votre paiement de ${amount} FCFA a échoué ❌`,
      'pending': `Paiement de ${amount} FCFA en attente...`,
      'cancelled': `Votre paiement de ${amount} FCFA a été annulé`,
    };

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: `Statut du paiement ${paymentMethodName}`,
        message: messageMap[paymentStatus] || `Mise à jour du paiement: ${paymentStatus}`,
        type: 'payment',
        is_read: false,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return false;
  }
};
