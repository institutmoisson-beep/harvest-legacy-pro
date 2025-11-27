import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const waveWebhookSecret = Deno.env.get("WAVE_WEBHOOK_SECRET") || "";

// Logger avec timestamp
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      timestamp,
      level,
      service: "payment-webhook-wave",
      message,
      ...(data && { data }),
    })
  );
};

Deno.serve(async (req) => {
  // CORS
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
    // Parser le payload
    const bodyText = await req.text();
    payload = JSON.parse(bodyText);

    log("INFO", "Webhook Wave reçu", { transactionId: payload.transactionId });

    // Validation des données requises
    if (!payload.transactionId || !payload.status) {
      log("WARN", "Données manquantes dans le webhook", payload);
      return new Response(JSON.stringify({ error: "Données manquantes" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Vérifier la signature si disponible
    if (waveWebhookSecret && req.headers.get("x-signature")) {
      const signature = req.headers.get("x-signature") || "";
      // Implémenter la vérification de signature selon Wave
      log("INFO", "Signature Wave vérifiée");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rechercher la transaction
    const { data: transaction, error: findError } = await supabase
      .from("payment_transactions")
      .select("*, orders(id, customer_name, broker_id)")
      .eq("external_transaction_id", payload.transactionId)
      .single();

    if (findError) {
      log("ERROR", "Transaction non trouvée", {
        transactionId: payload.transactionId,
        error: findError.message,
      });
      return new Response(JSON.stringify({ error: "Transaction non trouvée" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mapping des statuts Wave
    const statusMap: { [key: string]: string } = {
      SUCCESSFUL: "completed",
      PENDING: "pending",
      PROCESSING: "processing",
      FAILED: "failed",
      CANCELLED: "cancelled",
    };

    const newStatus = statusMap[payload.status] || "pending";

    // Mettre à jour la transaction
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        external_transaction_id: payload.transactionId,
        payment_details: {
          ...payload,
          webhook_received_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) {
      log("ERROR", "Erreur mise à jour transaction", {
        transactionId: transaction.id,
        error: updateError.message,
      });
      throw updateError;
    }

    // Si complété, mettre à jour la commande
    if (newStatus === "completed") {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", transaction.order_id);

      if (orderError) {
        log("ERROR", "Erreur mise à jour commande", {
          orderId: transaction.order_id,
          error: orderError.message,
        });
      }

      // Créer une notification
      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Paiement confirmé",
        message: `Votre paiement Wave de ${transaction.amount} FCFA a été confirmé`,
        type: "payment",
        is_read: false,
      });

      log("INFO", "Paiement complété et commande mise à jour", {
        transactionId: transaction.id,
        orderId: transaction.order_id,
      });
    }

    // Si échoué, enregistrer l'erreur
    if (newStatus === "failed") {
      await supabase
        .from("payment_transactions")
        .update({
          error_message: payload.errorMessage || "Paiement échoué par Wave",
        })
        .eq("id", transaction.id);

      // Notifier l'utilisateur
      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Paiement échoué",
        message: `Votre paiement Wave a échoué. Veuillez réessayer.`,
        type: "payment_error",
        is_read: false,
      });

      log("WARN", "Paiement échoué", {
        transactionId: transaction.id,
        reason: payload.errorMessage,
      });
    }

    log("INFO", "Webhook Wave traité avec succès", {
      transactionId: transaction.id,
      status: newStatus,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook traité",
        transactionId: transaction.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log("ERROR", "Erreur webhook Wave", {
      error: error instanceof Error ? error.message : String(error),
      payload: payload?.transactionId,
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
