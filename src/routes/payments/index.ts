import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase";
import { ProdutosProps } from "@/utils/produto";
import { v4 } from "uuid";
import { dispararWebhook } from "@/utils/webhook";

// Função utilitária para converter para o formato correto no fuso de Brasília
const toBrTimestamp = (dateInput: string | number | Date) => {
  const date = new Date(dateInput);
  return date
    .toLocaleString("sv-SE", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
    })
    .replace("T", " ");
};

export default async function (app: FastifyInstance) {
  app.post("/bot-conversa", async (req, reply) => {
    try {
      // Lendo o corpo da requisição como JSON (Fastify faz o parsing automaticamente)
      const body = req.body as any; // Fastify já faz o parsing do JSON ou texto se o content-type for apropriado
      console.log("Corpo recebido:", body);

      // Não é necessário tentar consertar o JSON ou extrair dados manualmente
      // Fastify lida com o parsing baseado no Content-Type

      console.log("Dados processados:", body);

      // Verificando formato e adaptando se necessário
      const dadosProcessados = {
        nome: body.nome || body.name || "",
        telefone: body.telefone || body.phonenumber || "",
        produto: {
          nome: body.produto ? body.produto.nome : body.produto_nome || "",
        } as ProdutosProps,
        type_product: "", // Adicionando o campo type_product na definição
      };

      // Determina se é combo ou produto com base na presença do "+" no nome
      dadosProcessados.type_product = dadosProcessados.produto.nome.includes(
        "+"
      )
        ? "combo"
        : "produto";

      // Validação dos dados básicos
      if (
        !dadosProcessados.nome ||
        !dadosProcessados.telefone ||
        !dadosProcessados.produto.nome
      ) {
        console.error("Dados incompletos:", dadosProcessados);
        return reply.code(400).send({
          error:
            "Dados incompletos. Necessário: nome, telefone e produto_nome.",
          dados_recebidos: body,
        });
      }

      let rechargeAmount = 0;
      let productDetails: any = {};
      let productComment = "";
      let additionalProductInfo: any[] = [];

      // Based on type_product, fetch from appropriate table and process accordingly
      if (dadosProcessados.type_product === "combo") {
        // Fetching combo details from the combo table

        const { data: combos, error: comboError } = await supabase
          .from("bot_conversa_com_combos")
          .select("*")
          .ilike(
            "nome_combo",
            dadosProcessados.produto.nome
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "")
          );

        console.log("Combos encontrados:", combos);
        if (comboError || !combos || combos.length === 0) {
          console.error(
            "Combo não encontrado no banco de dados:",
            comboError || "Sem resultados"
          );
          return reply.code(404).send({
            error: "Combo não encontrado. Verifique o nome do combo.",
            combo: dadosProcessados.produto.nome,
          });
        }

        const comboDB = combos[0];

        // Verificar se o combo tem valor definido
        if (!comboDB.valor_combo_vinculado) {
          return reply.code(400).send({
            error: "Combo encontrado, mas sem valor definido no sistema.",
          });
        }

        // Usar o valor do combo
        rechargeAmount = comboDB.valor_combo_vinculado;

        // Parse produtos array if it's a string
        let produtosArray = comboDB.produtos;
        if (typeof produtosArray === "string") {
          try {
            produtosArray = JSON.parse(produtosArray);
          } catch (e) {
            console.error("Erro ao processar array de produtos do combo:", e);
            produtosArray = [];
          }
        }

        // Add product info for each product in the combo
        if (Array.isArray(produtosArray)) {
          productComment = `Combo: ${comboDB.nome_combo}`;

          // Add combo info
          additionalProductInfo = [
            { key: "Combo-ID", value: comboDB.id || "" },
            { key: "Combo-Nome", value: comboDB.nome_combo || "" },
            {
              key: "Combo-Valor",
              value: comboDB.valor_combo_vinculado.toString() || "",
            },
          ];

          // Add each product in the combo
          produtosArray.forEach((produto, index) => {
            additionalProductInfo.push(
              { key: `Produto-${index + 1}-ID`, value: produto.id || "" },
              { key: `Produto-${index + 1}-Nome`, value: produto.nome || "" },
              {
                key: `Produto-${index + 1}-Valor`,
                value: produto.valor?.toString() || "",
              }
            );
          });
        }

        productDetails = {
          id: comboDB.id,
          nome: comboDB.nome_combo,
          valor: comboDB.valor_combo_vinculado,
          tipo: "combo",
        };
      } else {
        // Original logic for single product
        const { data: produtos, error: produtoError } = await supabase
          .from("bot_conversa_com_produto")
          .select("*")
          .ilike(
            "nome",
            dadosProcessados.produto.nome
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "")
          );

        if (produtoError || !produtos || produtos.length === 0) {
          console.error(
            "Produto não encontrado no banco de dados:",
            produtoError || "Sem resultados"
          );
          return reply.code(404).send({
            error: "Produto não encontrado. Verifique o nome do produto.",
            produto: dadosProcessados.produto.nome,
          });
        }

        // Verificar se o produto tem valor definido
        if (!produtos[0].valor_vinculado) {
          return reply.code(400).send({
            error: "Produto encontrado, mas sem valor definido no sistema.",
          });
        }

        // Atribuir o valor do produto encontrado no banco
        const produtoDB = produtos[0];
        dadosProcessados.produto.valor = produtoDB.valor_vinculado;
        rechargeAmount = produtoDB.valor_vinculado;
        productComment =
          produtoDB.nome_vinculado || dadosProcessados.produto.nome;

        additionalProductInfo = [
          { key: "Product", value: produtoDB.id_produto_vinculado },
          { key: "Product-Nome", value: produtoDB.nome_vinculado },
        ];

        productDetails = {
          id: produtoDB.id_produto_vinculado,
          nome: produtoDB.nome_vinculado,
          valor: produtoDB.valor_vinculado,
          tipo: "produto",
        };
      }

      const id_transacao = v4();

      // Verificação adicional (isso não deveria acontecer, mas é uma proteção)
      if (typeof rechargeAmount !== "number") {
        return reply.code(400).send({
          error: "Valor do produto inválido ou não numérico.",
        });
      }

      const novaVenda = {
        id_cliente: "bot_conversa",
        nome_cliente: dadosProcessados.nome,
        id_transacao: id_transacao,
        valor: rechargeAmount,
        status: "pendente",
        tipo_pagamento: "pix",
        origin: "bot-conversa",
        tipo_produto: dadosProcessados.type_product,
        detalhes_produto: productDetails,
      };

      const { error: vendaError } = await supabase
        .from("vendas")
        .insert([novaVenda]);

      if (vendaError) {
        console.error("Erro ao inserir nova venda:", vendaError);
      }

      // Concatenar informações básicas com informações de produtos
      const allAdditionalInfo = [
        { key: "ID", value: id_transacao },
        { key: "Nome", value: dadosProcessados.nome },
        { key: "Telefone", value: dadosProcessados.telefone },
        { key: "Email", value: "sem@gmail.com" },
        { key: "Invoice", value: body.data || Date.now().toString() },
        { key: "Origin", value: "bot-conversa" },
        { key: "Tipo", value: dadosProcessados.type_product },
        ...additionalProductInfo,
      ];

      const response = await fetch(
        "https://api.openpix.com.br/api/v1/charge?return_existing=true",
        {
          method: "POST",
          headers: {
            Authorization: `${process.env.OPENPIX_API_KEY_BOTCONVERSA}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correlationID: v4(),
            value: Math.round(rechargeAmount * 100),
            comment: productComment,
            expiresIn: 7200,
            additionalInfo: allAdditionalInfo,
            payer: {
              name: dadosProcessados.nome,
              email: "",
              phone: dadosProcessados.telefone,
            },
          }),
        }
      );

      const responseData = await response.json();
      console.log("Resposta OpenPix:", responseData);

      // Registro na tabela openpix_charges
      if (responseData.charge) {
        const charge = responseData.charge;
        await supabase.from("openpix_charges").insert([
          {
            correlation_id:
              charge.correlationID || charge.correlationId || null,
            payment_link_id:
              charge.paymentLinkID || charge.paymentLinkId || null,
            payment_link_url: charge.paymentLinkUrl || null,
            status: charge.status || null,
            comment: charge.comment || null,
            value: charge.value || null,
            fee: charge.fee || null,
            br_code: charge.brCode || null,
            qr_code_image: charge.qrCodeImage || null,
            expires_in: charge.expiresIn || null,
            expires_date: charge.expiresAt
              ? toBrTimestamp(charge.expiresAt)
              : toBrTimestamp(Date.now() + 2 * 60 * 60 * 1000),
            created_at: charge.createdAt
              ? toBrTimestamp(charge.createdAt)
              : toBrTimestamp(Date.now()),
            updated_at: charge.updatedAt
              ? toBrTimestamp(charge.updatedAt)
              : toBrTimestamp(Date.now()),
            customer: charge.customer || null,
            payment_methods: charge.paymentMethods || null,
            additional_info: charge.additionalInfo || null,
          },
        ]);
      }

      if (dadosProcessados.telefone) {
        await fetch(
          "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/103169/HwJWbNEvb3F4/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: dadosProcessados.nome,
              phone: dadosProcessados.telefone,
              produto: dadosProcessados.produto.nome,
              codigo: responseData.charge.brCode,
              message: `🔔 ${
                dadosProcessados.nome
              }, seu acesso está quase liberado!
Para concluir seu pedido de IPTV, siga as instruções abaixo:

💳 Pagamento via PIX:
Acesse o link abaixo para efetuar o pagamento de forma rápida e segura:

🔗 LINK DE PAGAMENTO${
                process.env.NEXT_PUBLIC_CHECKOUT +
                (responseData.charge?.correlationID ||
                  responseData.charge?.correlationId ||
                  "")
              }`,
              message2: `📋 Ou copie e cole o código abaixo no app do seu banco:

\`\`\`
${responseData.charge?.brCode}
\`\`\``,
            }),
          }
        );
        console.log("==========Notificação enviada para EVO============");
      }
      return reply.send(responseData);
    } catch (error) {
      console.error("Erro no processamento:", error);
      return reply.code(500).send({
        error: "Erro ao processar a requisição",
        details: String(error),
      });
    }
  });
  app.post("/site", async (req, reply) => {
    try {
      console.log("Requisição recebida:", req.body);
      const body = req.body as {
        nome: string;
        telefone: string;
        email: string;
        produto: {
          nome: string;
          id: string;
          valor: number;
        };
        origin: string;
      };
      const { nome, telefone, email, produto, origin } = body;

      if (!nome || !telefone || !produto?.valor) {
        return reply.code(400).send({ error: "Dados incompletos" });
      }

      console.log(
        "==================Iniciando processo de nova venda==================="
      );
      const id_transacao = v4();
      const novaVenda = {
        id_cliente: origin || "site",
        nome_cliente: nome,
        id_transacao,
        valor: produto.valor,
        status: "pendente",
        tipo_pagamento: "pix",
        origin: origin || "site",
        tipo_produto: "produto",
        detalhes_produto: {
          id: produto.id,
          nome: produto.nome,
          valor: produto.valor,
          tipo: "produto",
        },
      };

      const { error: vendaError } = await supabase
        .from("vendas")
        .insert([novaVenda]);

      if (vendaError) {
        console.error("Erro ao inserir nova venda:", vendaError);
      }

      await dispararWebhook("nova_venda", {
        ...novaVenda,
        cliente: {
          nome,
          telefone,
          email: email || "",
        },
      });

      const response = await fetch("https://api.openpix.com.br/api/v1/charge", {
        method: "POST",
        headers: {
          Authorization: `${process.env.OPENPIX_API_KEY_SITE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correlationID: v4(),
          value: Math.round(produto.valor * 100),
          comment: `Pagamento via PIX SITE - ${produto.nome}`,
          expiresIn: 7200,
          additionalInfo: [
            { key: "Nome", value: nome },
            { key: "ID", value: id_transacao },
            { key: "Telefone", value: telefone },
            { key: "Email", value: email || "sem@gmail.com" },
            { key: "Produto", value: produto.nome },
            { key: "Produto-ID", value: produto.id },
            { key: "Invoice", value: Date.now().toString() },
            { key: "Origin", value: "site" },
          ],
          payer: {
            name: nome,
            email: email || "",
            phone: telefone,
          },
        }),
      });

      const responseData = await response.json();
      console.log("Resposta OpenPix:", responseData);

      // Registro na tabela openpix_charges
      if (responseData.charge) {
        const charge = responseData.charge;
        await supabase.from("openpix_charges").insert([
          {
            correlation_id:
              charge.correlationID || charge.correlationId || null,
            payment_link_id:
              charge.paymentLinkID || charge.paymentLinkId || null,
            payment_link_url: charge.paymentLinkUrl || null,
            status: charge.status || null,
            comment: charge.comment || null,
            value: charge.value || null,
            fee: charge.fee || null,
            br_code: charge.brCode || null,
            qr_code_image: charge.qrCodeImage || null,
            expires_in: charge.expiresIn || null,
            expires_date: charge.expiresAt
              ? toBrTimestamp(charge.expiresAt)
              : toBrTimestamp(Date.now() + 2 * 60 * 60 * 1000),
            created_at: charge.createdAt
              ? toBrTimestamp(charge.createdAt)
              : toBrTimestamp(Date.now()),
            updated_at: charge.updatedAt
              ? toBrTimestamp(charge.updatedAt)
              : toBrTimestamp(Date.now()),
            customer: charge.customer || null,
            payment_methods: charge.paymentMethods || null,
            additional_info: charge.additionalInfo || null,
          },
        ]);
      }

      if (telefone) {
        await fetch(
          "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/103169/HwJWbNEvb3F4/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: nome,
              phone: telefone,
              produto: produto.nome,
              codigo: responseData.charge.brCode,
              message: `${nome}, seu acesso está quase liberado!
Para concluir seu pedido de IPTV, siga as instruções abaixo:

💳 Pagamento via PIX:
Acesse o link abaixo para efetuar o pagamento de forma rápida e segura:

🔗 LINK DE PAGAMENTO ${
                process.env.NEXT_PUBLIC_CHECKOUT +
                (responseData.charge?.correlationID ||
                  responseData.charge?.correlationId ||
                  "")
              }`,
              message2: `📋 Ou copie e cole o código abaixo no app do seu banco:

\
${responseData.charge?.brCode}
\
`,
            }),
          }
        );
        console.log("==========Notificação enviada para EVO============");
      }
      return reply.status(200).send(responseData);
    } catch (error) {
      console.error("Erro no processamento:", error);
      return reply.code(500).send({
        error: "Erro ao processar a requisição",
        details: String(error),
      });
    }
  });
}
