import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { clerkClient } from "@clerk/fastify";

const userRoutes = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) => {
  // Rota para criar um novo usuário (baseado em create-user/route.ts)
  fastify.post("/", async (request, reply) => {
    const { firstName, lastName, email, password } = request.body as any;

    try {
      const newUser = await clerkClient.users.createUser({
        firstName,
        lastName,
        emailAddress: [email],
        password,
      });
      return reply.send(newUser);
    } catch (error) {
      console.error("Erro ao criar novo usuário:", error);
      return reply.status(500).send({ error: "Erro ao criar novo usuário" });
    }
  });

  // Rota para obter todos os usuários (baseado em get-users/route.ts)
  fastify.get("/", async (request, reply) => {
    try {
      const users = await clerkClient.users.getUserList({
        orderBy: "-created_at",
      });
      // A resposta original retornava users.data, assumindo que essa é a lista
      return reply.send(users.data);
    } catch (error) {
      console.error("Erro ao obter todos os usuários:", error);
      return reply
        .status(500)
        .send({ error: "Erro ao obter todos os usuários" });
    }
  });

  // Rota para atualizar um usuário por ID (baseado em update-user/route.ts)
  // Usando PUT e ID na URL para ser mais RESTful
  fastify.put("/:userId", async (request, reply) => {
    const { userId } = request.params as any;
    const { firstName, lastName } = request.body as any;

    try {
      const updatedUser = await clerkClient.users.updateUser(userId, {
        firstName,
        lastName,
      });
      return reply.send(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar o usuário:", error);
      return reply.status(500).send({ error: "Erro ao atualizar o usuário" });
    }
  });

  // Rota para deletar um usuário por ID (baseado em delete-user/route.ts)
  // Usando DELETE e ID na URL para ser mais RESTful
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as any;

    if (!id) {
      return reply.status(400).send({ error: "ID do usuário é obrigatório" });
    }

    try {
      await clerkClient.users.deleteUser(id);
      return reply.send({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return reply.status(500).send({ error: "Erro ao excluir usuário" });
    }
  });
};

export default userRoutes;
