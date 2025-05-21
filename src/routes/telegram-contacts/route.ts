import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "@/lib/supabase";

interface ContactData {
  name: string;
  telegram_id: string;
}

// Função para validar os dados do contato
const validateContactData = (data: any) => {
  if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
    return { valid: false, message: "Nome do contato é obrigatório" };
  }

  if (
    !data.telegram_id ||
    typeof data.telegram_id !== "string" ||
    !/^\d+$/.test(data.telegram_id)
  ) {
    return {
      valid: false,
      message: "ID do Telegram inválido (deve conter apenas números)",
    };
  }

  return { valid: true };
};

// Refatorado para o modelo Fastify
export default async function (fastify: FastifyInstance, opts: any) {
  // Rota POST para criar um novo contato
  fastify.post(
    "/telegram-contacts",
    async (
      request: FastifyRequest<{ Body: ContactData }>,
      reply: FastifyReply
    ) => {
      try {
        // Obtém os dados da requisição
        const data = request.body; // Fastify usa request.body para POST

        // Valida os dados
        const validation = validateContactData(data);
        if (!validation.valid) {
          return reply.status(400).send({ error: validation.message });
        }

        // Insere o contato no banco de dados
        const { data: contact, error } = await supabase
          .from("telegram_contacts")
          .insert([
            {
              name: data.name.trim(),
              telegram_id: data.telegram_id,
            },
          ])
          .select()
          .single();

        if (error) {
          // Verifica se é um erro de duplicação
          if (error.code === "23505") {
            return reply
              .status(409)
              .send({ error: "Este ID do Telegram já está cadastrado" });
          }

          console.error("Erro ao inserir contato:", error);
          return reply.status(500).send({ error: "Falha ao salvar o contato" });
        }

        return reply.status(201).send(contact);
      } catch (error) {
        console.error("Erro inesperado:", error);
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );

  // Rota GET para listar todos os contatos
  fastify.get(
    "/telegram-contacts",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { data, error } = await supabase
          .from("telegram_contacts")
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          console.error("Erro ao buscar contatos:", error);
          return reply.status(500).send({ error: "Falha ao buscar contatos" });
        }

        return reply.send(data);
      } catch (error) {
        console.error("Erro inesperado:", error);
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );
}
