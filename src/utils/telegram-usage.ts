import { supabase } from "@/lib/supabase";

export const telegramUsage = {
  async checkAndUpdateUsage(
    telegramId: string
  ): Promise<{ canSend: boolean; remaining: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verifica se é um usuário conhecido
    const { data: contact } = await supabase
      .from("telegram_contacts")
      .select("telegram_id")
      .eq("telegram_id", telegramId)
      .single();

    const isKnownUser = !!contact;

    // Busca o uso do dia
    const { data: usage } = await supabase
      .from("telegram_usage")
      .select("message_count")
      .eq("telegram_id", telegramId)
      .eq("date", today.toISOString())
      .single();

    const messageCount = usage?.message_count || 0;
    const maxMessages = isKnownUser ? 1000 : 50; // Limite de 50 mensagens para desconhecidos
    const remaining = maxMessages - messageCount;

    return {
      canSend: remaining > 0,
      remaining,
    };
  },

  async incrementUsage(telegramId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verifica se é um usuário conhecido
    const { data: contact } = await supabase
      .from("telegram_contacts")
      .select("telegram_id")
      .eq("telegram_id", telegramId)
      .single();

    const isKnownUser = !!contact;

    // Busca ou cria o registro de uso
    const { data: usage } = await supabase
      .from("telegram_usage")
      .select("id, message_count")
      .eq("telegram_id", telegramId)
      .eq("date", today.toISOString())
      .single();

    if (usage) {
      // Atualiza o contador existente
      await supabase
        .from("telegram_usage")
        .update({ message_count: usage.message_count + 1 })
        .eq("id", usage.id);
    } else {
      // Cria um novo registro
      await supabase.from("telegram_usage").insert([
        {
          telegram_id: telegramId,
          date: today.toISOString(),
          message_count: 1,
          is_known_user: isKnownUser,
        },
      ]);
    }
  },
};
