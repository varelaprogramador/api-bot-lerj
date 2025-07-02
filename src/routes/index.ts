import { FastifyInstance } from "fastify";

export default async function (app: FastifyInstance) {
  // GET
  app.get("/", async (_, reply) => {
    return reply.send({
      message: "Hello, world!",
    });
  });

  app.get("/ping", async (req, reply) => {
    return reply.send({ message: "pong" });
  });
}
