
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import axios from "axios";

export default async function (app: FastifyInstance) {
    app.post("/pix-expirado", async (req, reply) => {
        try {
            const data = req.body as any;
            const isTestEvent = data?.evento === "teste_webhook";

            if (isTestEvent) {
                console.log("Evento de teste recebido com sucesso.");
                return reply.status(StatusCodes.OK).send({
                    message: "Evento de teste recebido com sucesso.",
                });
            }

            const { additionalInfo } = data?.charge || {};

            if (!additionalInfo) {
                console.log("Campos adicionais não encontrados");
                return reply.status(StatusCodes.BAD_REQUEST).send({
                    message: "Campos adicionais não encontrados",
                });
            }

            const eventType = data?.event;
            const allowedEvents = [
                "OPENPIX:CHARGE_EXPIRED",
            ];

            if (!allowedEvents.includes(eventType)) {
                console.log("Evento não permitido:", eventType);
                return reply.status(StatusCodes.BAD_REQUEST).send({
                    error: "Evento não permitido",
                });
            }

            // Valida se o evento é o esperado
            if (
                data.event !== "OPENPIX:CHARGE_EXPIRED"
            ) {
                return reply.status(StatusCodes.BAD_REQUEST).send({
                    error: "Evento não suportado",
                });
            }

            // Extrai nome e telefone do cliente
            const name = data.charge?.customer?.name ||
                additionalInfo.find((info: any) => info.key === "Nome")?.value ||
                "Cliente";
            const phone = additionalInfo.find((info: any) => info.key === "Telefone")?.value;

            // Faz o POST para a URL fornecida se houver nome e telefone
            if (name && phone) {
                try {

                    await axios.post(
                        "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/103169/MLLqmXfERDak/",
                        {
                            name,
                            phone,
                        },
                        {
                            headers: { "Content-Type": "application/json" },
                            timeout: 5000,
                        }
                    );
                } catch (err) {
                    console.error("Erro ao enviar dados de pix expirado:", err);
                }
            } else {
                console.log("Nome ou telefone não encontrados para o cliente do pix expirado");
            }

            return reply.status(StatusCodes.OK).send({ message: "Evento de pix expirado processado." });
        } catch (error) {
            console.error("Erro no processamento do POST:", error);
            return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
                message: "Erro",
                error: (error as Error).message,
            });
        }
    });
}