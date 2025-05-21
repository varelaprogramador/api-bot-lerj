import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { telegramUsage } from "@/utils/telegram-usage";

interface BatchMessageData {
  userIds: string[];
  message: string;
  buttons?: any;
  image?: any;
}

// Refatorado para o modelo Fastify
export default async function (fastify: FastifyInstance, opts: any) {
  fastify.post(
    "/",
    async (
      request: FastifyRequest<{ Body: BatchMessageData }>,
      reply: FastifyReply
    ) => {
      try {
        const { userIds, message, buttons, image } = request.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return reply
            .status(400)
            .send({ error: "Lista de usuários inválida" });
        }

        if (!message) {
          return reply.status(400).send({ error: "Mensagem não fornecida" });
        }

        const results = {
          successful: 0,
          failed: 0,
          total: userIds.length,
          errors: [] as string[],
        };

        // Processa cada usuário individualmente para verificar o limite
        for (const userId of userIds) {
          try {
            const { canSend, remaining } =
              await telegramUsage.checkAndUpdateUsage(userId);

            if (!canSend) {
              results.failed++;
              results.errors.push(
                `Usuário ${userId}: Limite diário de mensagens atingido`
              );
              continue;
            }

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/webhooks/telegram`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId,
                  message,
                  buttons,
                  image,
                  disparo: true,
                }),
              }
            );

            if (response.ok) {
              results.successful++;
            } else {
              const error = await response.json();
              results.failed++;
              results.errors.push(
                `Usuário ${userId}: ${error.message || "Erro desconhecido"}`
              );
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push(
              `Usuário ${userId}: ${error.message || "Erro desconhecido"}`
            );
          }
        }

        return reply.send(results);
      } catch (error: any) {
        console.error("Erro no envio em lote:", error);
        return reply
          .status(500)
          .send({ error: error.message || "Erro interno do servidor" });
      }
    }
  );
}
