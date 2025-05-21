import { z } from "zod";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { supabase } from "@/lib/supabase";
import { sendError, sendSuccess } from "@/utils/response-formatter";
import { CodigosProps } from "@/utils/codigos";

export default async function (app: FastifyInstance) {
  //   app.post("/pix-server", async (req, reply) => {
  //     try {
  //       const data = req.body as any;
  //       const isTestEvent = data?.event === "teste_webhook";

  //       if (isTestEvent) {
  //         console.log("Evento de teste recebido com sucesso.");
  //         return reply.status(StatusCodes.OK).send({
  //           message: "Evento de teste recebido com sucesso.",
  //         });
  //       }

  //       const { additionalInfo } = data?.charge || {};

  //       if (!additionalInfo) {
  //         console.log("Campos adicionais não encontrados");
  //         return reply.status(StatusCodes.BAD_REQUEST).send({
  //           message: "Campos adicionais não encontrados",
  //         });
  //       }

  //       const eventType = data?.event;
  //       const allowedEvents = ["OPENPIX:CHARGE_COMPLETED"];

  //       if (!allowedEvents.includes(eventType)) {
  //         console.log("Evento não permitido:", eventType);
  //         return reply.status(StatusCodes.BAD_REQUEST).send({
  //           error: "Evento não permitido",
  //         });
  //       }

  //       // Valida se o evento é o esperado
  //       if (data.event !== "OPENPIX:CHARGE_COMPLETED") {
  //         return reply.status(StatusCodes.BAD_REQUEST).send({
  //           error: "Evento não suportado",
  //         });
  //       }

  //       // Verifica a origem
  //       const originField = additionalInfo.find(
  //         (info: any) => info.key === "Origin"
  //       );

  //       const originValue = originField?.value;

  //       if (!originValue) {
  //         console.log("Campo Origin não encontrado");
  //         return reply.status(StatusCodes.BAD_REQUEST).send({
  //           error: "Campo Origin não encontrado",
  //         });
  //       }

  //       const isBotOrigin = originValue === "bot";
  //       const isSiteOrigin = originValue === "site";

  //       if (isBotOrigin) {
  //         // Para o bot, processamos de forma assíncrona para evitar timeout
  //         processBotOrigin(data, additionalInfo, originValue).catch((error) => {
  //           console.error("Erro no processamento do bot:", error);
  //         });

  //         // Retornamos resposta imediata para o bot
  //         return reply.status(StatusCodes.OK).send({
  //           message:
  //             "Evento do bot recebido e sendo processado em segundo plano.",
  //         });
  //       } else if (isSiteOrigin) {
  //         // Para o site, processamos de forma síncrona para obter o código
  //         console.log("========Site=========");

  //         try {
  //           const produtoId = additionalInfo?.find(
  //             (info: any) => info.key === "Product"
  //           )?.value;

  //           // Recuperar códigos do produto apenas se o status for "ativo"
  //           const { data: codigos, error: codigoError } = await supabase
  //             .from("codigos")
  //             .select("*")
  //             .eq("id_produto", produtoId);

  //           // Filtrar códigos ativos
  //           const defaultData = [
  //             {
  //               id_codigo: "",
  //               id_produto: "",
  //               codigo: "",
  //               status: "",
  //             },
  //           ];
  //           const codigosAtivos: CodigosProps[] =
  //             codigos?.filter(
  //               (codigo) => codigo.status.toLowerCase() === "ativo"
  //             ) || defaultData;

  //           if (codigoError || !codigosAtivos || codigosAtivos.length <= 0) {
  //             console.log(
  //               "❌ Não foi possível processar o código do produto. Solicite um chamado e envie o seu id."
  //             );
  //             return reply.status(StatusCodes.BAD_REQUEST).send({
  //               error: "Nenhum código ativo encontrado",
  //             });
  //           }

  //           // Atualizar o status do primeiro código ativo para "resgatado"
  //           const codigoData = codigosAtivos[0]; // Usar o primeiro código ativo
  //           const { error: updateCodigoError } = await supabase
  //             .from("codigos")
  //             .update({ status: "Resgatado" })
  //             .eq("id_codigo", codigoData?.id_codigo);

  //           if (updateCodigoError) {
  //             console.error(
  //               `Erro ao atualizar o código ${codigoData?.codigo}:`,
  //               updateCodigoError
  //             );
  //           }

  //           const name =
  //             additionalInfo.find((info: any) => info.key === "Nome")?.value ||
  //             "Cliente";
  //           const code = codigoData?.codigo || "N/A";
  //           const phone = additionalInfo.find(
  //             (info: any) => info.key === "Telefone"
  //           )?.value;
  //           const produto = additionalInfo.find(
  //             (info: any) => info.key === "Product-Nome"
  //           )?.value;

  //           console.log("Nome:", name);
  //           console.log("Código:", code);
  //           console.log("Telefone:", phone);

  //           if (phone) {
  //             try {
  //               // Timeout de 5 segundos para não bloquear resposta
  //               const controller = new AbortController();
  //               const timeoutId = setTimeout(() => controller.abort(), 5000);

  //               const response = await fetch(
  //                 "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/107090/N0zmZuEk8fwK/",
  //                 {
  //                   method: "POST",
  //                   headers: {
  //                     "Content-Type": "application/json",
  //                   },
  //                   body: JSON.stringify({
  //                     name: name,
  //                     phone: phone,
  //                     codigo: code,
  //                     produto: produto,
  //                   }),
  //                   signal: controller.signal,
  //                 }
  //               );

  //               clearTimeout(timeoutId);

  //               if (!response.ok) {
  //                 console.error("Erro na resposta do webhook:", response.status);
  //               }
  //             } catch (error: any) {
  //               if (error.name === "AbortError") {
  //                 console.log("Requisição de webhook cancelada por timeout");
  //               } else {
  //                 console.error("Erro ao chamar webhook:", error);
  //               }
  //             }
  //           }

  //           // Atualizar o status da venda existente
  //           const idTransacaoField = additionalInfo.find(
  //             (info: any) => info.key === "ID"
  //           );
  //           if (!idTransacaoField) {
  //             throw new Error(
  //               "ID da transação não encontrado nos campos adicionais."
  //             );
  //           }

  //           const id_transacao = idTransacaoField.value; // Obtém o ID da transação

  //           const { error: vendaUpdateError } = await supabase
  //             .from("vendas")
  //             .update({ status: "concluida", origin: originValue })
  //             .eq("id_transacao", id_transacao);

  //           if (vendaUpdateError) {
  //             console.error(
  //               "Erro ao atualizar o status da venda:",
  //               vendaUpdateError.message
  //             );
  //             return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
  //               message: "Erro ao atualizar o status da venda",
  //               error: vendaUpdateError.message,
  //             });
  //           }

  //           console.log("Status da venda atualizado com sucesso.");
  //           return reply.status(StatusCodes.OK).send({
  //             message:
  //               "Saldo atualizado e status da venda atualizado com sucesso.",
  //             codigo: code,
  //             produto: produto,
  //           });
  //         } catch (error) {
  //           console.error("Erro ao processar origem 'site':", error);
  //           return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
  //             message: "Erro no processamento da compra via site",
  //             error: (error as Error).message,
  //           });
  //         }
  //       } else {
  //         console.log("Origem não reconhecida:", originValue);
  //         return reply.status(StatusCodes.BAD_REQUEST).send({
  //           error: "Origem não reconhecida",
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Erro no processamento do POST:", error);
  //       return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
  //         message: "Erro",
  //         error: (error as Error).message,
  //       });
  //     }
  //   });
  //   app.post("/pix-simples", async (req, reply) => {
  //     try {
  //       // Pegar os dados da requisição
  //       const data = req.body as any;
  //       console.log("Webhook PIX recebido:", JSON.stringify(data, null, 2));

  //       // Verificar se é um evento de teste
  //       if (data?.event === "teste_webhook") {
  //         console.log("Evento de teste recebido com sucesso.");
  //         return reply.status(StatusCodes.OK).send({
  //           message: "Evento de teste recebido com sucesso.",
  //         });
  //       }

  //       // Verificar se é um evento de pagamento concluído
  //       if (data?.event === "OPENPIX:CHARGE_COMPLETED" && data?.charge) {
  //         const { correlationID } = data.charge;

  //         if (!correlationID) {
  //           console.error("correlationID não encontrado no webhook");
  //           return reply.status(StatusCodes.BAD_REQUEST).send({
  //             error: "correlationID não encontrado",
  //           });
  //         }

  //         // Atualizar o status da venda no banco de dados
  //         if (supabase) {
  //           try {
  //             const { error } = await supabase
  //               .from("vendas")
  //               .update({ status: "concluida" })
  //               .eq("correlation_id", correlationID);

  //             if (error) {
  //               console.error("Erro ao atualizar status da venda:", error);
  //               return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
  //                 error: "Erro ao atualizar status da venda",
  //                 details: error.message,
  //               });
  //             }

  //             console.log(
  //               `Status da venda atualizado com sucesso para ${correlationID}`
  //             );
  //             return reply.status(StatusCodes.OK).send({
  //               message: "Status da venda atualizado com sucesso.",
  //             });
  //           } catch (error: any) {
  //             console.error("Erro ao processar webhook:", error);
  //             return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
  //               error: "Erro ao processar webhook",
  //               details: error.message,
  //             });
  //           }
  //         } else {
  //           console.warn(
  //             "Cliente Supabase não disponível, não foi possível atualizar a venda"
  //           );
  //           return reply.status(StatusCodes.OK).send({
  //             warning: "Cliente Supabase não disponível",
  //             message: "Recebido, mas não processado completamente",
  //           });
  //         }
  //       }

  //       // Se não for um evento suportado
  //       return reply.status(StatusCodes.BAD_REQUEST).send({
  //         message: "Evento não suportado",
  //       });
  //     } catch (error: any) {
  //       console.error("Erro ao processar webhook:", error);
  //       return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
  //         error: "Erro ao processar webhook",
  //         details: error.message,
  //       });
  //     }
  //   });
  app.post("/openpix-botconversa", async (req, reply) => {
    try {
      const data: any = req.body; // Corpo da requisição
      console.log(data);
      const isTestEvent = data.evento === "teste_webhook";

      if (isTestEvent) {
        console.log("Evento de teste recebido com sucesso.");

        reply
          .code(200)
          .send({ message: "Evento de teste recebido com sucesso." });
      }

      const charge = (data as any)?.charge as {
        additionalInfo?: Array<{ key: string; value: string }>;
      };

      const additionalInfo = charge?.additionalInfo;

      if (!additionalInfo) {
        console.log("Campos adicionais não encontrados");

        return reply.code(400).send({
          message: "Campos adicionais não encontrados",
        });
      }

      const eventType = data?.event;
      const allowedEvents = [
        "OPENPIX:CHARGE_COMPLETED",
        "OPENPIX:TRANSACTION_RECEIVED",
      ];

      if (!eventType || !allowedEvents.includes(eventType)) {
        console.log("Evento não permitido:", eventType);

        return reply.code(400).send({ error: "Evento não permitido" });
      }

      if (
        data.event === "OPENPIX:CHARGE_COMPLETED" ||
        data.event === "OPENPIX:TRANSACTION_RECEIVED"
      ) {
        console.log("========BOTCONVERSA=========");

        const tipoField = additionalInfo.find(
          (info: any) => info.key === "Tipo"
        );
        const tipo = tipoField?.value || "produto"; // Default to "produto" if not specified

        const name =
          additionalInfo.find((info: any) => info.key === "Nome")?.value ||
          "Cliente";
        const phone = additionalInfo.find(
          (info: any) => info.key === "Telefone"
        )?.value;

        if (tipo === "combo") {
          // Process combo - need to handle multiple products
          console.log("Processando combo...");

          // Find all products in the combo by searching for Produto-X-ID pattern
          const produtosNoCombo: { id: string; nome: string }[] = [];

          additionalInfo.forEach((info: any) => {
            const match = info.key.match(/^Produto-(\d+)-ID$/);
            if (match) {
              const index = match[1];
              const produtoId = info.value;
              const produtoNome =
                additionalInfo.find(
                  (i: any) => i.key === `Produto-${index}-Nome`
                )?.value || "Produto";

              produtosNoCombo.push({ id: produtoId, nome: produtoNome });
            }
          });

          console.log(
            `Encontrados ${produtosNoCombo.length} produtos no combo`
          );

          // Process each product in the combo
          const codigosResgatados: { produto: string; codigo: string }[] = [];

          for (const produto of produtosNoCombo) {
            // Recuperar códigos do produto apenas se o status for "ativo"
            const { data: codigos, error: codigoError } = await supabase
              .from("codigos")
              .select("*")
              .eq("id_produto", produto.id);

            // Filtrar códigos ativos
            const defaultData = [
              {
                id_codigo: "",
                id_produto: "",
                codigo: "",
                status: "",
              },
            ];
            const codigosAtivos: CodigosProps[] =
              codigos?.filter(
                (codigo) => codigo.status.toLowerCase() === "ativo"
              ) || defaultData;

            if (codigoError || !codigosAtivos || codigosAtivos.length <= 0) {
              console.log(
                `❌ Não foi possível processar o código do produto ${produto.nome}. Solicite um chamado e envie o seu id.`
              );
              continue;
            }

            if (!codigosAtivos || codigosAtivos.length <= 0) {
              console.log(
                `Nenhum código ativo encontrado para ${produto.nome}`
              );
              continue;
            }

            // Atualizar o status do primeiro código ativo para "resgatado"
            const codigoData = codigosAtivos[0]; // Usar o primeiro código ativo
            const { error: updateCodigoError } = await supabase
              .from("codigos")
              .update({ status: "Resgatado" })
              .eq("id_codigo", codigoData?.id_codigo);

            if (updateCodigoError) {
              console.error(
                `Erro ao atualizar o código ${codigoData?.codigo} para ${produto.nome}:`,
                updateCodigoError
              );
            } else {
              if (codigoData?.codigo) {
                codigosResgatados.push({
                  produto: produto.nome,
                  codigo: codigoData.codigo,
                });
              }
            }
          }

          if (codigosResgatados.length > 0 && phone) {
            // Format the combo message
            const comboNome =
              additionalInfo.find((info: any) => info.key === "Combo-Nome")
                ?.value || "Combo";

            // Prepare data to send to BotConversa webhook
            const dadosCombo = {
              name: name,
              phone: phone,
              combo: comboNome,
              message: `🙋‍♀️ Olá ${name}, segue chave de ativação:
    ✅ ${produtosNoCombo.map((produto) => produto.nome).join(", ")}
    🔑 Código de Recargas: ${codigosResgatados
      .map((codigo) => codigo.codigo)
      .join(", ")}
    ✨ Obrigado pela sua compra!  Até a próxima`,
            };

            console.log("Enviando códigos do combo:", dadosCombo);

            // Send to BotConversa webhook for combo
            const response = await fetch(
              "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/107090/j9e9TDrKaU22/",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(dadosCombo),
              }
            );

            console.log("Resposta do webhook de combo:", await response.text());
          }
        } else {
          // Original code for single product
          const produtoId = additionalInfo.find(
            (info: any) => info.key === "Product"
          )?.value;

          // Recuperar códigos do produto apenas se o status for "ativo"
          const { data: codigos, error: codigoError } = await supabase
            .from("codigos")
            .select("*")
            .eq("id_produto", produtoId);

          // Filtrar códigos ativos
          const defaultData = [
            {
              id_codigo: "",
              id_produto: "",
              codigo: "",
              status: "",
            },
          ];
          const codigosAtivos: CodigosProps[] =
            codigos?.filter(
              (codigo) => codigo.status.toLowerCase() === "ativo"
            ) || defaultData;

          if (codigoError || !codigosAtivos || codigosAtivos.length <= 0) {
            console.log(
              "❌ Não foi possível processar o código do produto. Solicite um chamado e envie o seu id."
            );
          }

          if (!codigosAtivos || codigosAtivos.length <= 0) {
            console.log("Nenhum código ativo encontrado");

            return reply.code(StatusCodes.BAD_REQUEST).send({
              error: "Nenhum código ativo encontrado",
            });
          }

          // Atualizar o status do primeiro código ativo para "resgatado"
          const codigoData = codigosAtivos[0]; // Usar o primeiro código ativo
          const { error: updateCodigoError } = await supabase
            .from("codigos")
            .update({ status: "Resgatado" }) // Ou "inativo", dependendo da sua lógica
            .eq("id_codigo", codigoData?.id_codigo); // Atualizando pelo ID do código

          if (updateCodigoError) {
            console.error(
              `Erro ao atualizar o código ${codigoData?.codigo}:`,
              updateCodigoError
            );
            // Você pode optar por notificar o usuário ou registrar o erro
          }

          const code = codigoData?.codigo || "N/A";
          const produto = additionalInfo.find(
            (info: any) => info.key === "Product-Nome"
          )?.value;
          console.log("Nome:", name);
          console.log("Código:", code);
          console.log("Telefone:", phone);

          if (phone) {
            const response = await fetch(
              "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/107090/j9e9TDrKaU22/",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: name,
                  phone: phone,
                  produto: produto,
                  codigo: code,
                  message: `🙋‍♀️ Olá ${name}, segue chave de ativação:
    ✅ ${produto}
    🔑 Código de Recargas: ${code}
    ✨ Obrigado pela sua compra!  Até a próxima`,
                }),
              }
            );
          }
        }

        // Atualizar o status da venda existente (tanto para produto quanto para combo)
        const idTransacaoField = additionalInfo.find(
          (info: any) => info.key === "ID"
        );
        if (!idTransacaoField) {
          throw new Error(
            "ID da transação não encontrado nos campos adicionais."
          );
        }

        const id_transacao = idTransacaoField.value; // Obtém o ID da transação

        const { error: vendaUpdateError } = await supabase
          .from("vendas")
          .update({ status: "concluida", origin: "bot-conversa" }) // Atualiza o status da venda
          .eq("id_transacao", id_transacao); // Filtra pela ID da transação

        if (vendaUpdateError) {
          console.error(
            "Erro ao atualizar o status da venda:",
            vendaUpdateError.message
          );
          return reply.code(500).send({
            message: "Erro ao atualizar o status da venda",
            error: vendaUpdateError.message,
          });
        }
        console.log("Status da venda atualizado com sucesso.");
        return reply.code(200).send({
          message:
            "Códigos processados e status da venda atualizado com sucesso.",
        });
      }

      return reply.code(200).send({
        message: "Requisição processada, mas nenhuma ação específica tomada.",
      });
    } catch (error) {
      console.error("Erro no processamento do POST:", error);

      return reply.code(500).send({
        message: "Erro",
        error: (error as Error).message,
      });
    }
  });
}
// Função para processar origem "bot"
async function processBotOrigin(
  data: any,
  additionalInfo: any[],
  originValue: string
) {
  try {
    // Encontrar o user_id nos campos adicionais
    const userIdField = additionalInfo.find(
      (info: any) => info.key === "UserID"
    );
    if (!userIdField) {
      throw new Error("User ID não encontrado nos campos adicionais.");
    }

    const user_id = userIdField.value; // Obtém o user_id
    console.log(`User ID extraído: ${user_id}`);

    const saldo = data.charge.value / 100; // Converte o valor para o formato correto
    console.log(`Saldo a ser adicionado: ${saldo} (em formato correto)`);

    // Verificar o tipo de saldo
    if (isNaN(saldo) || saldo <= 0) {
      throw new Error(`Valor de saldo inválido: ${saldo}`);
    }

    // Fetch the current saldo
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("saldo")
      .eq("user_id", user_id)
      .single();

    if (fetchError) {
      console.error("Erro ao buscar saldo do usuário:", fetchError.message);
      return;
    }

    const newSaldo = user.saldo + saldo; // Incrementa o saldo
    const { error: updateError } = await supabase
      .from("users")
      .update({ saldo: newSaldo })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Erro ao atualizar saldo do usuário:", updateError.message);
      return;
    }

    console.log("Saldo atualizado com sucesso para o usuário:", user_id);

    // Atualizar o status da venda existente
    const idTransacaoField = additionalInfo.find(
      (info: any) => info.key === "ID"
    );
    if (!idTransacaoField) {
      throw new Error("ID da transação não encontrado nos campos adicionais.");
    }

    const id_transacao = idTransacaoField.value; // Obtém o ID da transação

    const { error: vendaUpdateError } = await supabase
      .from("vendas")
      .update({ status: "concluida", origin: originValue }) // Atualiza o status da venda
      .eq("id_transacao", id_transacao); // Filtra pela ID da transação

    if (vendaUpdateError) {
      console.error(
        "Erro ao atualizar o status da venda:",
        vendaUpdateError.message
      );
      return;
    }

    const mensagem = `
  🎉 Parabéns! Seu saldo foi adicionado à sua carteira.
  
  Agora é só escolher o produto que deseja comprar! O valor será descontado automaticamente da sua carteira.
  
  Caso seu saldo seja insuficiente, basta adicionar mais, e ele será somado ao valor já disponível.
  
  Boas compras!`;

    //disparo de mensagem com timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout

      const dataUpdate = {
        userId: user_id,
        message: mensagem,
        button: [
          {
            type: "Rota do bot",
            command: "bemvindos-2",
            name: "🤖 COMPRAR PELO BOT 🤖",
          },
        ],
        image: "",
        disparo: true,
      };

      const response = await fetch(
        "https://nextgiftcards.com/api/webhooks/telegram",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataUpdate),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const datares = await response.json();
        console.log("Mensagem enviada com sucesso:", datares);
      } else {
        const error = await response.json();
        console.error("Erro ao enviar mensagem:", error);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Requisição de envio de mensagem cancelada por timeout");
      } else {
        console.error("Erro ao enviar mensagem:", error);
      }
    }
  } catch (error) {
    console.error("Erro ao processar origem 'bot':", error);
  }
}
