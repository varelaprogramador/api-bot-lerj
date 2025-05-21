// Conteúdo inicial do arquivo, será preenchido com os endpoints em seguida.

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import { contactManager } from "@/utils/contact-manager";

const instanceRoutes = async (fastify: FastifyInstance, options: any) => {
  fastify.get(
    "/instances",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
          return reply.status(500).send({
            error: "Configuração do Evolution API não encontrada",
          });
        }

        const response = await axios.get(
          `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.EVOLUTION_API_KEY,
            },
          }
        );

        const instances = response.data.map((instance: any) => ({
          instanceName: instance.name,
          status:
            instance.connectionStatus === "open" ? "connected" : "disconnected",
          number: instance.ownerJid?.split("@")[0] || null,
          profileName: instance.profileName,
          profilePicUrl: instance.profilePicUrl,
          token: instance.token,
          lastSeen: instance.updatedAt
            ? new Date(instance.updatedAt).toLocaleString("pt-BR")
            : null,
          isOnline: instance.connectionStatus === "open",
          isAuthenticated: instance.connectionStatus === "open",
          messageCount: instance._count?.Message || 0,
          contactCount: instance._count?.Contact || 0,
          chatCount: instance._count?.Chat || 0,
        }));

        return reply.send(instances);
      } catch (error: any) {
        console.error("Erro ao buscar instâncias:", error);

        if (error.response) {
          return reply.status(error.response.status).send({
            error: "Erro na comunicação com o Evolution API",
            details: error.response.data,
          });
        }

        if (error.request) {
          return reply.status(503).send({
            error: "Não foi possível conectar ao Evolution API",
          });
        }

        return reply.status(500).send({
          error: "Erro ao buscar instâncias",
        });
      }
    }
  );

  fastify.post(
    "/instances/create",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { instanceName } = request.body as { instanceName: string };

        if (!instanceName) {
          return reply.status(400).send({
            error: "Nome da instância é obrigatório",
          });
        }

        if (instanceName.length < 3 || instanceName.length > 30) {
          return reply.status(400).send({
            error: "Nome da instância deve ter entre 3 e 30 caracteres",
          });
        }

        const instanceConfig = {
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook_by_events: false,
          events: ["APPLICATION_STARTUP"],
          reject_call: true,
          groups_ignore: true,
          always_online: true,
          read_messages: true,
          read_status: true,
          websocket_enabled: true,
          websocket_events: ["APPLICATION_STARTUP"],
        };

        const response = await axios.post(
          `${process.env.EVOLUTION_API_URL}/instance/create`,
          instanceConfig,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.EVOLUTION_API_KEY || "",
            },
          }
        );

        if (response.status !== 200) {
          if (response.status === 409) {
            return reply.status(409).send({
              error: "Já existe uma instância com este nome",
            });
          }
          return reply.status(response.status).send({
            error: response.data.message || "Erro ao criar instância",
          });
        }

        return reply.send({
          ...response.data,
          message: "Instância criada com sucesso",
        });
      } catch (error: any) {
        console.error("Erro ao criar instância:", error);

        if (error.response) {
          return reply.status(error.response.status).send({
            error: "Erro na comunicação com o Evolution API",
            details: error.response.data,
          });
        }

        if (error.request) {
          return reply.status(503).send({
            error: "Não foi possível conectar ao Evolution API",
          });
        }

        return reply.status(500).send({
          error: "Erro interno do servidor",
        });
      }
    }
  );

  fastify.get(
    "/instances/qr",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
          return reply.status(500).send({
            error: "Configuração do Evolution API não encontrada",
          });
        }

        const { instanceName } = request.query as { instanceName: string };

        if (!instanceName) {
          return reply.status(400).send({
            error: "Nome da instância não fornecido",
          });
        }

        const response = await axios.get(
          `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceName}`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.EVOLUTION_API_KEY,
            },
          }
        );

        return reply.send(response.data);
      } catch (error: any) {
        console.error("Erro ao gerar QR code:", error);

        if (error.response) {
          return reply.status(error.response.status).send({
            error: "Erro na comunicação com o Evolution API",
            details: error.response.data,
            status: error.response.status,
          });
        }

        if (error.request) {
          return reply.status(503).send({
            error: "Não foi possível conectar ao Evolution API",
          });
        }

        return reply.status(500).send({
          error: "Erro ao gerar QR code",
        });
      }
    }
  );

  fastify.delete(
    "/instances/delete",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
          return reply.status(500).send({
            error: "Configuração do Evolution API não encontrada",
          });
        }

        const { instanceName } = request.query as { instanceName: string };

        if (!instanceName) {
          return reply.status(400).send({
            error: "Nome da instância não fornecido",
          });
        }

        const response = await axios.delete(
          `${process.env.EVOLUTION_API_URL}/instance/delete/${instanceName}`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.EVOLUTION_API_KEY,
            },
          }
        );

        return reply.send(response.data);
      } catch (error: any) {
        console.error("Erro ao deletar instância:", error);

        if (error.response) {
          return reply.status(error.response.status).send({
            error: "Erro na comunicação com o Evolution API",
            details: error.response.data,
            status: error.response.status,
          });
        }

        if (error.request) {
          return reply.status(503).send({
            error: "Não foi possível conectar ao Evolution API",
          });
        }

        return reply.status(500).send({
          error: "Erro ao deletar instância",
        });
      }
    }
  );

  fastify.post(
    "/instances/connect",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
          return reply.status(500).send({
            error: "Configuração do Evolution API não encontrada",
          });
        }

        const { instanceName } = request.body as { instanceName: string };

        const response = await axios.get(
          `${process.env.EVOLUTION_API_URL}/instance/connect/${instanceName}`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.EVOLUTION_API_KEY,
            },
          }
        );

        return reply.send({
          ...response.data,
          message: "Instância conectada com sucesso",
        });
      } catch (error: any) {
        console.error("Erro ao conectar instância:", error);

        if (error.response) {
          return reply.status(error.response.status).send({
            error: "Erro na comunicação com o Evolution API",
            details: error.response.data,
          });
        }

        if (error.request) {
          return reply.status(503).send({
            error: "Não foi possível conectar ao Evolution API",
          });
        }

        return reply.status(500).send({
          error: "Erro ao conectar instância",
        });
      }
    }
  );

  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verifica se as variáveis de ambiente do Evolution API estão configuradas
      if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
        return reply.status(500).send({
          message: "Erro de configuração",
          error: "Variáveis de ambiente do Evolution API não configuradas.",
        });
      }

      const { message } = request.body as { message: string };

      // Busca todos os contatos ativos
      const contacts = await contactManager.listAllContacts();

      console.log(contacts, "contacts");

      // Envia a mensagem para cada contato
      const results = await Promise.allSettled(
        contacts.map(async (contact: { whatsapp: string }) => {
          try {
            // Envia a mensagem usando fetch para o Evolution API
            const response = await fetch(
              `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_ID}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: process.env.EVOLUTION_API_KEY as string, // Casting para string
                },
                body: JSON.stringify({
                  number: contact.whatsapp,
                  text2: message, // Use text2 conforme a documentação da Evolution
                }),
              }
            );

            if (!response.ok) {
              const errorBody = await response.json();
              throw new Error(
                `Erro da API Evolution: ${response.status} - ${
                  errorBody.message || JSON.stringify(errorBody)
                }`
              );
            }

            // Não há necessidade de ler o corpo da resposta para esta operação, apenas verificar se foi ok

            return { success: true, contact };
          } catch (error: any) {
            console.error(`Erro ao enviar para ${contact.whatsapp}:`, error);
            return { success: false, contact, error };
          }
        })
      );

      // Conta sucessos e falhas
      const successful = results.filter(
        (r) =>
          r.status === "fulfilled" &&
          (
            r as PromiseFulfilledResult<{
              success: boolean;
              contact: { whatsapp: string };
            }>
          ).value.success
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
};

export default instanceRoutes;
