import { FastifyReply } from "fastify";
import { StatusCodes } from "http-status-codes";

// Tipos separados para respostas de sucesso e erro
type SuccessResponse = {
  success: true;
  message?: string;
  data?: any;
};

type ErrorResponse = {
  success: false;
  error?: string;
  data?: any;
};

// O tipo ApiResponse agora é uma união dos tipos de sucesso e erro
type ApiResponse = SuccessResponse | ErrorResponse;

export const sendSuccess = (
  reply: FastifyReply,
  options: {
    status?: number;
    message?: string;
    data?: any;
  }
) => {
  const { data, message, status = StatusCodes.OK } = options;

  // Usando o tipo SuccessResponse explicitamente aqui
  const response: SuccessResponse = {
    success: true,
    message,
    data,
  };

  return reply.status(status).send(response);
};

export const sendError = (
  reply: FastifyReply,
  options: {
    status?: number;
    error?: string;
    data?: any;
  }
) => {
  const { data, error, status = StatusCodes.BAD_REQUEST } = options;

  // Usando o tipo ErrorResponse explicitamente aqui
  const response: ErrorResponse = {
    success: false,
    error,
    data,
  };

  return reply.status(status).send(response);
};
