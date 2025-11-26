import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const coinpaymentsSecret = Deno.env.get("COINPAYMENTS_SECRET") || "";

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      timestamp,
      level,
      service: "payment-webhook-coinpayments",
      message,
      ...(data && { data }),
    })
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, X-Signature",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: any = null;

  try {
    const bodyText = await req.text();
    payload = JSON.parse(bodyText);

    log("INFO", "Webhook CoinPayments reçu", { txn_id: payload.txn_id });

    if (!payload.txn_id || !payload.hasOwnProperty("status")) {
      log("WARN", "Données manquantes", payload);
      return new Response(JSON.stringify({ error: "Données manquantes" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (coinpaymentsSecret && req.headers.get("x-signature")) {
      log("INFO", "Signature CoinPayments vérifiée");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: transaction, error: findError } = await supabase
      .from("payment_transactions")
      .select("*, orders(id, customer_name)")
      .eq("external_transaction_id", payload.txn_id)
      .single();

    if (findError) {
      log("ERROR", "Transaction non trouvée", {
        txn_id: payload.txn_id,
        error: findError.message,
      });
      return new Response(JSON.stringify({ error: "Transaction non trouvée" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Statuts CoinPayments: 0=pending, 1=success, 2=failed, -1=cancelled
    const statusMap: { [key: string]: string } = {
      "0": "pending",
      "1": "completed",
      "2": "failed",
      "-1": "cancelled",
    };

    const newStatus = statusMap[String(payload.status)] || "pending";

    const paymentDetails = {
      txn_id: payload.txn_id,
      currency: payload.currency || "BTC",
      amount: payload.amount,
      amountf: payload.amountf,
      received: payload.received,
      receivedf: payload.receivedf,
      status: payload.status,
      webhook_received_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        external_transaction_id: payload.txn_id,
        payment_details: paymentDetails,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) throw updateError;

    if (newStatus === "completed") {
      await supabase
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", transaction.order_id);

      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Paiement crypto confirmé",
        message: `Votre paiement de ${payload.amount} ${payload.currency} a été confirmé`,
        type: "payment",
        is_read: false,
      });

      log("INFO", "Paiement crypto complété", {
        transactionId: transaction.id,
        currency: payload.currency,
      });
    }

    if (newStatus === "pending") {
      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Paiement crypto en attente",
        message: `Votre paiement ${payload.currency} est en attente de confirmations blockchain...`,
        type: "payment",
        is_read: false,
      });

      log("INFO", "Paiement crypto en attente de confirmations", {
        transactionId: transaction.id,
      });
    }

    if (newStatus === "failed") {
      await supabase
        .from("payment_transactions")
        .update({
          error_message: `Paiement crypto échoué - Statut: ${payload.status}`,
        })
        .eq("id", transaction.id);

      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Paiement crypto échoué",
        message: "Votre paiement crypto a échoué. Veuillez réessayer.",
        type: "payment_error",
        is_read: false,
      });
    }

    log("INFO", "Webhook CoinPayments traité", { status: newStatus });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook traité",
        transactionId: transaction.id,
        newStatus: newStatus,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log("ERROR", "Erreur webhook CoinPayments", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        error: "Erreur serveur",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
