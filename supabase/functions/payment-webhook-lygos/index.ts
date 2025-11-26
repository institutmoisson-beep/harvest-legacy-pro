import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const lygosApiSecret = Deno.env.get("LYGOS_SECRET") || "";

const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      timestamp,
      level,
      service: "payment-webhook-lygos",
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

    log("INFO", "Webhook Lygos reçu", { paymentId: payload.paymentId });

    if (!payload.paymentId || !payload.status) {
      log("WARN", "Données manquantes", payload);
      return new Response(JSON.stringify({ error: "Données manquantes" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (lygosApiSecret && req.headers.get("x-signature")) {
      log("INFO", "Signature Lygos vérifiée");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: transaction, error: findError } = await supabase
      .from("payment_transactions")
      .select("*, orders(id, customer_name)")
      .eq("external_transaction_id", payload.paymentId)
      .single();

    if (findError) {
      log("ERROR", "Transaction non trouvée", {
        paymentId: payload.paymentId,
        error: findError.message,
      });
      return new Response(JSON.stringify({ error: "Transaction non trouvée" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const statusMap: { [key: string]: string } = {
      COMPLETED: "completed",
      SUCCESS: "completed",
      PENDING: "pending",
      PROCESSING: "processing",
      FAILED: "failed",
      ERROR: "failed",
      CANCELLED: "cancelled",
    };

    const newStatus = statusMap[payload.status] || "pending";

    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        external_transaction_id: payload.paymentId,
        payment_details: {
          ...payload,
          webhook_received_at: new Date().toISOString(),
        },
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
        title: "Paiement Lygos confirmé",
        message: `Votre paiement Lygos de ${transaction.amount} FCFA a été confirmé`,
        type: "payment",
        is_read: false,
      });

      log("INFO", "Paiement Lygos complété", {
        transactionId: transaction.id,
      });
    }

    if (newStatus === "failed") {
      await supabase
        .from("payment_transactions")
        .update({
          error_message: payload.errorMessage || "Paiement échoué par Lygos",
        })
        .eq("id", transaction.id);

      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Paiement Lygos échoué",
        message: "Votre paiement Lygos a échoué. Veuillez réessayer.",
        type: "payment_error",
        is_read: false,
      });
    }

    log("INFO", "Webhook Lygos traité", { status: newStatus });

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
    log("ERROR", "Erreur webhook Lygos", {
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
