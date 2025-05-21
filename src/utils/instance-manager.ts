import { supabase } from "@/lib/supabase";
import { Instance } from "../types/instance";

export const instanceManager = {
  async createInstance(instanceName: string, instanceId: string) {
    // Verifica se a instância já existe
    const { data: existingInstances } = await supabase
      .from("instances")
      .select()
      .eq("instance_id", instanceId);

    if (existingInstances && existingInstances.length > 0) {
      return existingInstances[0] as Instance;
    }

    // Se não existir, cria a nova instância
    const { data, error } = await supabase
      .from("instances")
      .insert([
        {
          instance_name: instanceName,
          instance_id: instanceId,
          status: "disconnected",
        },
      ])
      .select();

    if (error) throw error;
    return data[0] as Instance;
  },

  async setDefaultInstance(instanceName: string, instanceId: string) {
    try {
      // Primeiro, remove todas as instâncias do banco
      const { error: deleteError } = await supabase
        .from("instances")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) {
        console.error("Erro ao limpar instâncias:", deleteError);
        throw new Error("Erro ao limpar instâncias");
      }

      // Insere apenas a nova instância padrão
      const { data, error } = await supabase
        .from("instances")
        .insert({
          instance_name: instanceName,
          instance_id: instanceId,
          is_default: true,
          status: "disconnected",
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao definir instância padrão:", error);
        throw new Error("Erro ao definir instância padrão");
      }

      return data;
    } catch (error) {
      console.error("Erro ao definir instância padrão:", error);
      throw error;
    }
  },

  async getDefaultInstance() {
    const { data, error } = await supabase
      .from("instances")
      .select()
      .eq("is_default", true);

    if (error) throw error;
    return data[0] as Instance;
  },

  async updateInstanceStatus(instanceId: string, status: Instance["status"]) {
    const { data, error } = await supabase
      .from("instances")
      .update({ status })
      .eq("instance_id", instanceId)
      .select();

    if (error) throw error;
    return data[0] as Instance;
  },

  async listInstances() {
    const { data, error } = await supabase
      .from("instances")
      .select()
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Instance[];
  },

  async syncInstance(instanceName: string, instanceId: string) {
    try {
      // Verifica se a instância já existe
      const { data: existingInstances } = await supabase
        .from("instances")
        .select()
        .eq("instance_id", instanceId);

      if (!existingInstances || existingInstances.length === 0) {
        // Se não existir, cria a nova instância
        return await this.createInstance(instanceName, instanceId);
      }

      const existingInstance = existingInstances[0];

      // Se existir, atualiza o nome se necessário
      if (existingInstance.instance_name !== instanceName) {
        const { data, error } = await supabase
          .from("instances")
          .update({ instance_name: instanceName })
          .eq("instance_id", instanceId)
          .select();

        if (error) throw error;
        return data[0] as Instance;
      }

      return existingInstance as Instance;
    } catch (error) {
      console.error("Erro ao sincronizar instância:", error);
      throw error;
    }
  },
};
