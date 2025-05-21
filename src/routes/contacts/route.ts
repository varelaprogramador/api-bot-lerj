// Adaptação para Fastify - src/faltantes/contacts/routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "@/lib/supabase";
export default async function (fastify: FastifyInstance, opts: any) {
  fastify.get(
    "/contacts",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { data: contacts, error } = await supabase
          .from("users") // Mudei para 'users' baseado no código original
          .select("id, user_id, username, saldo, saldo_indicacao, created_at")
          .order("username");

        if (error) {
          console.error("Erro ao buscar contatos:", error);
          return reply.status(500).send({ error: "Erro ao buscar contatos" });
        }

        return reply.status(200).send({ contacts });
      } catch (error) {
        console.error("Erro ao buscar contatos:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  fastify.post(
    "/contacts",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // O corpo da requisição é automaticamente parseado pelo Fastify e acessível via request.body
      const { name, username } = request.body as {
        name: string;
        username: string;
      };

      try {
        if (!name || !username) {
          return reply
            .status(400)
            .send({ error: "Nome e username são obrigatórios" });
        }

        const { data, error } = await supabase
          .from("contacts")
          .insert([{ name, username }])
          .select()
          .single();

        if (error) {
          console.error("Erro ao adicionar contato:", error);
          return reply.status(500).send({ error: "Erro ao adicionar contato" });
        }

        return reply.status(201).send({ contact: data });
      } catch (error) {
        console.error("Erro ao adicionar contato:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}
