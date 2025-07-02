import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";

const getEvolutionApiConfig = () => {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  if (!url || !key) {
    throw new Error("Configuração do Evolution API não encontrada");
  }
  return { url, key };
};

const fetchInstances = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { url, key } = getEvolutionApiConfig();
    const response = await axios.get(`${url}/instance/fetchInstances`, {
      headers: {
        "Content-Type": "application/json",
        apikey: key,
      },
    });

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
    return reply.status(500).send({
      error: "Erro ao buscar instâncias",
      details: error?.response?.data || error.message,
    });
  }
};

const createInstance = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { url, key } = getEvolutionApiConfig();
    const { instanceName } = request.body as { instanceName: string };

    if (!instanceName) {
      return reply
        .status(400)
        .send({ error: "Nome da instância é obrigatório" });
    }

    const response = await axios.post(
      `${url}/instance/createInstance`,
      { name: instanceName },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: key,
        },
      }
    );

    return reply.send(response.data);
  } catch (error: any) {
    console.error("Erro ao criar instância:", error);
    return reply.status(500).send({
      error: "Erro ao criar instância",
      details: error?.response?.data || error.message,
    });
  }
};

const deleteInstance = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { url, key } = getEvolutionApiConfig();
    const { instanceName } = request.body as { instanceName: string };

    if (!instanceName) {
      return reply
        .status(400)
        .send({ error: "Nome da instância é obrigatório" });
    }

    const response = await axios.post(
      `${url}/instance/deleteInstance`,
      { name: instanceName },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: key,
        },
      }
    );

    return reply.send(response.data);
  } catch (error: any) {
    console.error("Erro ao deletar instância:", error);
    return reply.status(500).send({
      error: "Erro ao deletar instância",
      details: error?.response?.data || error.message,
    });
  }
};

const sendMessage = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { url, key } = getEvolutionApiConfig();
    const { instanceName, number, message, image, options } = request.body as {
      instanceName: string;
      number: string;
      message?: string;
      image?: string;
      options?: any;
    };

    if (!instanceName || !number || (!message && !image)) {
      return reply.status(400).send({
        error:
          "instanceName, number e pelo menos message ou image são obrigatórios",
      });
    }

    let endpoint = "";
    let payload: any = {
      instanceName,
      number,
    };

    if (image && !message) {
      endpoint = `${url}/message/sendImage`;
      payload.image = image;
    } else if (image && message) {
      endpoint = `${url}/message/sendImage`;
      payload.image = image;
      payload.caption = message;
    } else {
      endpoint = `${url}/message/sendText`;
      payload.message = message;
    }

    if (options) {
      payload.options = options;
    }

    const response = await axios.post(endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        apikey: key,
      },
    });

    return reply.send(response.data);
  } catch (error: any) {
    console.error("Erro ao enviar mensagem:", error);
    return reply.status(500).send({
      error: "Erro ao enviar mensagem",
      details: error?.response?.data || error.message,
    });
  }
};

export default async function (fastify: FastifyInstance, opts: any) {
  fastify.get("/instances", fetchInstances);
  fastify.post("/instance/create", createInstance);
  fastify.post("/instance/delete", deleteInstance);
  fastify.post("/message/send", sendMessage);
}
