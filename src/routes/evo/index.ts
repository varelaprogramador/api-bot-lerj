import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { contactManager } from "@/utils/contact-manager";

export default async function (fastify: FastifyInstance) {
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (
        !process.env.EVOLUTION_API_URL ||
        !process.env.EVOLUTION_API_KEY ||
        !process.env.EVOLUTION_INSTANCE_ID
      ) {
        return reply.status(500).send({
          message: "Erro de configuração",
          error:
            "Variáveis de ambiente do Evolution API (URL, Key ou Instance ID) não configuradas.",
        });
      }

      const { message } = request.body as { message: string };

      const contacts = await contactManager.listAllContacts();

      console.log(contacts, "contacts");

      const results = await Promise.allSettled(
        contacts.map(async (contact: { whatsapp: string }) => {
          try {
            const response = await fetch(
              `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_ID}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: process.env.EVOLUTION_API_KEY as string,
                },
                body: JSON.stringify({
                  number: contact.whatsapp,
                  text2: message,
                }),
              }
            );

            if (!response.ok) {
              let errorBody = "Erro desconhecido";
              try {
                errorBody = await response.json();
              } catch (e) {
                // Ignora erro ao tentar ler o corpo se não for JSON
              }
              throw new Error(
                `Erro da API Evolution: ${response.status} - ${
                  typeof errorBody === "object"
                    ? JSON.stringify(errorBody)
                    : errorBody
                }`
              );
            }

            return { success: true, contact };
          } catch (error: any) {
            console.error(`Erro ao enviar para ${contact.whatsapp}:`, error);
            return { status: "rejected", reason: { contact, error } };
          }
        })
      );

      const successful = results.filter(
        (
          r
        ): r is PromiseFulfilledResult<{
          success: boolean;
          contact: { whatsapp: string };
        }> => r.status === "fulfilled" && r.value?.success === true
      ).length;
      const failed = results.length - successful;

      return reply.send({
        message: "Processo de envio concluído",
        total: results.length,
        successful,
        failed,
        details: results.map((r) => {
          if (r.status === "fulfilled") {
            return {
              phone: (
                r as PromiseFulfilledResult<{
                  success: boolean;
                  contact: { whatsapp: string };
                }>
              ).value.contact.whatsapp,
              success: true,
            };
          } else {
            const rejectedReason = r.reason as any;
            const contactPhone =
              rejectedReason?.contact?.whatsapp || "telefone desconhecido";
            const errorMessage =
              rejectedReason?.error?.message ||
              rejectedReason?.message ||
              JSON.stringify(rejectedReason);
            return {
              phone: contactPhone,
              success: false,
              error: errorMessage,
            };
          }
        }),
      });
    } catch (error: any) {
      console.error("Erro ao processar requisição:", error);
      return reply.status(500).send({
        message: "Erro ao enviar mensagens",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
}
