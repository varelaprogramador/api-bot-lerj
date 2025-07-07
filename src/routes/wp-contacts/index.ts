import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "@/lib/supabase";

type ContactBody = {
  name: string;
  phone: string;
};

type ContactParams = {
  id: string;
};

const getContacts = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { data: contacts, error } = await supabase
      .from("wp_contacts")
      .select("id, name, phone, created_at")
      .order("name");

    if (error) {
      return reply.status(500).send({ error: "Erro ao buscar contatos" });
    }

    return reply.status(200).send({ contacts });
  } catch {
    return reply.status(500).send({ error: "Internal server error" });
  }
};

const addContact = async (
  request: FastifyRequest<{ Body: ContactBody }>,
  reply: FastifyReply
) => {
  const { name, phone } = request.body;
  try {
    if (!name || !phone) {
      return reply
        .status(400)
        .send({ error: "Nome e telefone são obrigatórios" });
    }
    const { data, error } = await supabase
      .from("wp_contacts")
      .insert([{ name, phone }])
      .select();

    if (error) {
      return reply.status(500).send({ error: "Erro ao adicionar contato" });
    }
    return reply.status(201).send({ contact: data?.[0] });
  } catch {
    return reply.status(500).send({ error: "Internal server error" });
  }
};

const deleteContact = async (
  request: FastifyRequest<{ Params: ContactParams }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  try {
    if (!id) {
      return reply.status(400).send({ error: "ID do contato é obrigatório" });
    }
    const { error } = await supabase.from("wp_contacts").delete().eq("id", id);

    if (error) {
      return reply.status(500).send({ error: "Erro ao excluir contato" });
    }
    return reply.status(204).send();
  } catch {
    return reply.status(500).send({ error: "Internal server error" });
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.get("/wp-contacts", getContacts);
  fastify.post("/wp-contacts", addContact);
  fastify.delete("/wp-contacts/:id", deleteContact);
}
