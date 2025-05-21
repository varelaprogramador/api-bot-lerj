import axios, { AxiosRequestConfig } from "axios";
import { supabase } from "@/lib/supabase";
import { instanceManager } from "@/utils/instance-manager";

interface SendMessageParams {
  phone: string;
  message: string;
}

export const evolutionApi = {
  getDefaultInstance: async () => {
    return await instanceManager.getDefaultInstance();
  },

  sendMessage: async ({ phone, message }: SendMessageParams) => {
    try {
      const defaultInstance = await instanceManager.getDefaultInstance();
      const config: AxiosRequestConfig = {
        method: "post",
        url: `${process.env.EVOLUTION_API_URL}/message/sendText/${defaultInstance.instance_id}`,
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.EVOLUTION_API_KEY,
        },
      };

      const response = await axios({
        ...config,
        data: JSON.stringify({
          delay: 500,
          number: phone,
          text: message,
          linkPreview: true,
        }),
      });

      await supabase.from("whatsapp_logs").insert({
        phone,
        message,
        status: "success",
        metadata: response.data,
      });

      return response.data;
    } catch (error) {
      console.error("Erro ao enviar mensagem via WhatsApp:", error);

      await supabase.from("whatsapp_logs").insert({
        phone,
        message,
        status: "error",
        error_message: (error as any).message,
        metadata: error,
      });

      throw error;
    }
  },
};
