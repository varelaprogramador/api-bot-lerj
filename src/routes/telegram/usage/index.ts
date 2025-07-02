// Adaptação para Fastify - src/faltantes/telegram/usage/routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "@/lib/supabase";

interface TelegramUsage {
  date: string;
  message_count: number;
  is_known_user: boolean;
  // Adicionar outros campos se existirem na tabela 'telegram_usage'
}

interface GroupedUsage {
  date: string;
  message_count: number;
  known_users: number;
  unknown_users: number;
}

// Função para registrar as rotas de uso do Telegram no Fastify
export default async function (fastify: FastifyInstance, opts: any) {
  // GET /telegram/usage (ou o caminho apropriado para esta rota)
  fastify.get(
    "/telegram/usage",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Busca o total de mensagens
        const { data: totalMessages, error: totalError } = await supabase
          .from("telegram_usage")
          .select("message_count")
          .single();

        if (totalError) throw totalError;

        // Busca o número de usuários conhecidos e desconhecidos
        const { data: userStats, error: userError } = await supabase
          .from("telegram_usage")
          .select("is_known_user")
          .eq("date", new Date().toISOString().split("T")[0]);

        if (userError) throw userError;

        // Corrigindo tipagem implícita
        const knownUsers =
          userStats?.filter(
            (user: Pick<TelegramUsage, "is_known_user">) => user.is_known_user
          ).length || 0;
        const unknownUsers =
          userStats?.filter(
            (user: Pick<TelegramUsage, "is_known_user">) => !user.is_known_user
          ).length || 0;

        // Busca o uso por dia dos últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: usageByDate, error: usageError } = await supabase
          .from("telegram_usage") // Usando tipagem para o retorno
          .select("*")
          .gte("date", sevenDaysAgo.toISOString().split("T")[0])
          .order("date", { ascending: false });

        if (usageError) throw usageError;

        // Agrupa os dados por dia
        // Corrigindo tipagem implícita
        const groupedUsage = (usageByDate || []).reduce(
          (acc: Record<string, GroupedUsage>, curr: TelegramUsage) => {
            const date = curr.date;
            if (!acc[date]) {
              acc[date] = {
                date,
                message_count: 0,
                known_users: 0,
                unknown_users: 0,
              };
            }
            acc[date].message_count += curr.message_count;
            if (curr.is_known_user) {
              acc[date].known_users++;
            } else {
              acc[date].unknown_users++;
            }
            return acc;
          },
          {} as Record<string, GroupedUsage>
        ); // Definindo o tipo inicial do acumulador

        return reply.status(200).send({
          total_messages: totalMessages?.message_count || 0,
          known_users: knownUsers,
          unknown_users: unknownUsers,
          usage_by_date: Object.values(groupedUsage),
        });
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
        // Usando reply para o retorno de erro
        return reply.status(500).send({ error: "Erro ao buscar estatísticas" });
      }
    }
  );
}
