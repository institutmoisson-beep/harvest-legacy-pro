import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
    
    console.log("Webhook Wave reçu:", payload);

    // Vérifier les données du webhook
    if (!payload.transactionId || !payload.status) {
      return new Response(
        JSON.stringify({ error: "Données manquantes" }),
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Trouver la transaction de paiement
    const { data: transaction, error: findError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("external_transaction_id", payload.transactionId)
      .single();

    if (findError || !transaction) {
      console.error("Transaction non trouvée:", findError);
      return new Response(
        JSON.stringify({ error: "Transaction non trouvée" }),
        { status: 404 }
      );
    }

    // Mapping des statuts Wave vers nos statuts
    const statusMap: { [key: string]: string } = {
      "SUCCESSFUL": "completed",
      "PENDING": "pending",
      "FAILED": "failed",
      "CANCELLED": "cancelled",
    };

    const newStatus = statusMap[payload.status] || "pending";

    // Mettre à jour la transaction
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        payment_details: payload,
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
    }

    // Si le paiement a échoué
    if (newStatus === "failed") {
      await supabase
        .from("payment_transactions")
        .update({
          error_message: payload.errorMessage || "Paiement échoué",
        })
        .eq("id", transaction.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook traité avec succès",
        transactionId: transaction.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur webhook Wave:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur lors du traitement du webhook",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
