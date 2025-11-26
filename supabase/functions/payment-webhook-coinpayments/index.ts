import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const coinpaymentsSecret = Deno.env.get("COINPAYMENTS_SECRET") || "";

Deno.serve(async (req) => {
  // Vérifier la méthode HTTP
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée" }),
      { status: 405 }
    );
  }

  try {
    const payload = await req.json();
    
    console.log("Webhook CoinPayments reçu:", payload);

    // Vérifier les données du webhook
    if (!payload.txn_id || !payload.status) {
      return new Response(
        JSON.stringify({ error: "Données manquantes" }),
        { status: 400 }
      );
    }

    // Vérifier la signature du webhook (optionnel mais recommandé)
    if (payload.merchant && coinpaymentsSecret) {
      // Validation de signature CoinPayments (à implémenter selon votre API)
      console.log("Validation de signature pour:", payload.merchant);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Trouver la transaction de paiement
    const { data: transaction, error: findError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("external_transaction_id", payload.txn_id)
      .single();

    if (findError || !transaction) {
      console.error("Transaction non trouvée:", findError);
      return new Response(
        JSON.stringify({ error: "Transaction non trouvée" }),
        { status: 404 }
      );
    }

    // Mapping des statuts CoinPayments vers nos statuts
    // Status codes: 0=pending, 1=success/completed, 2=failed
    const statusMap: { [key: string]: string } = {
      "0": "pending",
      "1": "completed",
      "2": "failed",
      "-1": "cancelled",
    };

    const newStatus = statusMap[String(payload.status)] || "pending";

    // Détails du crypto paiement
    const paymentDetails = {
      txn_id: payload.txn_id,
      currency: payload.currency || "BTC",
      amount: payload.amount,
      amountf: payload.amountf,
      received: payload.received,
      receivedf: payload.receivedf,
      status: payload.status,
      timestamp: new Date().toISOString(),
    };

    // Mettre à jour la transaction
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        payment_details: paymentDetails,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) throw updateError;

    // Si le paiement est complété, mettre à jour le statut de la commande
    if (newStatus === "completed") {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", transaction.order_id);

      if (orderError) console.error("Erreur mise à jour commande:", orderError);

      // Notifier l'utilisateur
      await supabase
        .from("notifications")
        .insert({
          user_id: transaction.user_id,
          title: "Paiement en cryptomonnaie confirmé",
          message: `Votre paiement de ${payload.amount} ${payload.currency} a été confirmé`,
          type: "payment",
          is_read: false,
        });
    }

    // Si le paiement est en attente (confirmations blockchain)
    if (newStatus === "pending") {
      await supabase
        .from("notifications")
        .insert({
          user_id: transaction.user_id,
          title: "Paiement crypto en attente",
          message: `Votre paiement ${payload.currency} est en cours de confirmation blockchain...`,
          type: "payment",
          is_read: false,
        });
    }

    // Si le paiement a échoué
    if (newStatus === "failed") {
      await supabase
        .from("payment_transactions")
        .update({
          error_message: `Paiement crypto échoué - ${payload.status}`,
        })
        .eq("id", transaction.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook CoinPayments traité avec succès",
        transactionId: transaction.id,
        newStatus: newStatus,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur webhook CoinPayments:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur lors du traitement du webhook",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
