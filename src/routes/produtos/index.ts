import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { supabase } from "@/lib/supabase";

const userRoutes = async (
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) => {
  fastify.get("/", async (request, reply) => {
    try {
      const { tipo, status } = request.query as {
        tipo?: string;
        status?: string;
      };

      // Configurar a query base
      let query = supabase.from("produtos").select("*");

      // Aplicar filtros se especificados
      if (tipo) {
        query = query.eq("tipo", tipo);
      }

      if (status) {
        query = query.eq("status", status);
      }

      // Executar a consulta para obter produtos
      const { data: produtos, error: produtosError } = await query;

      if (produtosError) {
        console.error("Erro ao buscar produtos:", produtosError);
        return reply.status(500).send({
          success: false,
          message: "Erro ao buscar produtos",
        });
      }

      // Se o tipo não for combo, ou se nenhum tipo for especificado, buscar também combos
      let combos = [];
      if (!tipo || tipo === "combo") {
        // Consultar combos
        let combosQuery = supabase
          .from("combos")
          .select("*, itens:produtos(id, nome)");

        if (status) {
          combosQuery = combosQuery.eq("status", status);
        }

        const { data: combosData, error: combosError } = await combosQuery;

        if (combosError) {
          console.error("Erro ao buscar combos:", combosError);
          return reply.status(500).send({
            success: false,
            message: "Erro ao buscar combos",
          });
        }

        // Adicionar os combos à lista se existirem
        if (combosData && combosData.length > 0) {
          combos = combosData;
        }
      }

      // Combinar produtos e combos se necessário
      const resultados =
        tipo === "produto"
          ? produtos
          : tipo === "combo"
          ? combos
          : [...(produtos || []), ...(combos || [])];

      // Informações de paginação
      const total = resultados.length;
      const pagina = 1;
      const totalPaginas = 1;

      return reply.status(200).send({
        success: true,
        produtos: resultados,
        total,
        pagina,
        totalPaginas,
      });
    } catch (error) {
      console.error("Erro ao listar produtos:", error);
      return reply.status(500).send({
        success: false,
        message: "Erro ao processar a requisição",
      });
    }
  });
};

export default userRoutes;
