import { supabase } from "@/lib/supabase";
type WebhookEvent = {
  nova_venda: boolean;
  estoque_baixo: boolean;
  pagamento_confirmado: boolean;
  pagamento_cancelado: boolean;
};

export const dispararWebhook = async (
  evento: keyof WebhookEvent,
  payload: any
) => {
  try {
    // Buscar webhooks ativos para este evento
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("ativo", true)
      .contains("eventos", { [evento]: true });

    if (error) {
      console.error("Erro ao buscar webhooks:", error);
      return;
    }

    // Disparar webhook para cada URL configurada
    for (const webhook of webhooks) {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            evento,
            payload,
            timestamp: new Date().toISOString(),
          }),
        });

        // Registrar o log do webhook
        await supabase.from("webhook_logs").insert({
          webhook_id: webhook.id,
          evento,
          payload,
          status: response.status,
          response: await response.text(),
        });
      } catch (error) {
        console.error(`Erro ao disparar webhook para ${webhook.url}:`, error);

        // Registrar o erro no log
        await supabase.from("webhook_logs").insert({
          webhook_id: webhook.id,
          evento,
          payload,
          status: 0,
          response:
            error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }
  } catch (error) {
    console.error("Erro ao processar webhooks:", error);
  }
};
