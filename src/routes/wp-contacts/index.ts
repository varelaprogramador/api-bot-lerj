import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "@/lib/supabase";

export default async function (fastify: FastifyInstance, opts: any) {
  // Listar contatos
  fastify.get(
    "/wp-contacts",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { data: contacts, error } = await supabase
          .from("wp_contacts")
          .select("id, name, phone, created_at")
          .order("name");

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

  // Adicionar contato
  fastify.post(
    "/wp-contacts",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, phone } = request.body as { name: string; phone: string };
      try {
        if (!name || !phone) {
          return reply
            .status(400)
            .send({ error: "Nome e telefone são obrigatórios" });
        }
        const { data, error } = await supabase
          .from("wp_contacts")
          .insert([{ name, phone }])
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

  // Excluir contato
  fastify.delete(
    "/wp-contacts/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      try {
        if (!id) {
          return reply
            .status(400)
            .send({ error: "ID do contato é obrigatório" });
        }
        const { error } = await supabase
          .from("wp_contacts")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Erro ao excluir contato:", error);
          return reply.status(500).send({ error: "Erro ao excluir contato" });
        }
        return reply.status(204).send();
      } catch (error) {
        console.error("Erro ao excluir contato:", error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}
