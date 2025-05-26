import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Telegraf } from "telegraf";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { telegramUsage } from "@/utils/telegram-usage"; // Certifique-se de que este caminho está correto

interface MessageButton {
  name: string;
  type: string;
  command: string;
}

interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  buttons?: MessageButton[];
  image?: string;
  created_at: string;
  status: "sent" | "failed" | "received";
  error?: string;
  chat_type?: string;
  chat_id?: string;
  username?: string;
}

// Inicializando o Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Inicializando o Bot do Telegram
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Função para enviar mensagem para o usuário (mantém a lógica existente)
const sendMessageToUser = async (
  userId: string,
  message: string,
  buttons: MessageButton[] = [],
  image?: string
) => {
  try {
    const { canSend, remaining } = await telegramUsage.checkAndUpdateUsage(
      userId
    );

    if (!canSend) {
      throw new Error(
        `Limite diário de mensagens atingido. Tente novamente amanhã.`
      );
    }

    const inlineKeyboard = buttons.map((button) => [
      {
        text: button.name,
        ...(button.type === "link"
          ? { url: button.command }
          : { callback_data: button.command }),
      },
    ]);

    const options = {
      reply_markup:
        inlineKeyboard.length > 0
          ? { inline_keyboard: inlineKeyboard }
          : undefined,
      parse_mode: "HTML" as const,
    };

    let result;

    if (image) {
      result = await bot.telegram.sendPhoto(userId, image, {
        caption: message,
        ...options,
      });
      console.log(`Message with photo sent to user ID: ${userId}`);
    } else {
      result = await bot.telegram.sendMessage(userId, message, options);
      console.log(`Text message sent to user ID: ${userId}`);
    }

    await telegramUsage.incrementUsage(userId);

    await saveMessage({
      user_id: userId,
      message,
      buttons,
      image,
      status: "sent",
    });

    return { success: true, messageId: result.message_id, remaining };
  } catch (error: any) {
    console.error(`Error sending message to user ${userId}:`, error.message);

    await saveMessage({
      user_id: userId,
      message,
      buttons,
      image,
      status: "failed",
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
      code: error.code || "UNKNOWN_ERROR",
      description: error.description || "An unknown error occurred",
    };
  }
};

// Função para salvar mensagem no Supabase (mantém a lógica existente)
const saveMessage = async (message: Omit<Message, "id" | "created_at">) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          ...message,
          id: randomUUID(),
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar mensagem:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao salvar mensagem:", error);
    return null;
  }
};

// Função para buscar mensagens do usuário (mantém a lógica existente)
const getUserMessages = async (userId: string, limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar mensagens:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return [];
  }
};

// Função para limpar mensagens do usuário (mantém a lógica existente)
const clearUserMessages = async (userId: string) => {
  try {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao limpar mensagens:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao limpar mensagens:", error);
    return false;
  }
};

// Configurar comandos do bot (mantém a lógica existente)
bot.command("start", async (ctx: any) => {
  ctx.reply("✨ Olá, seja Bem vindo ao canal de vendas da next recargas! ✨", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `Iniciar atendimento`,
            callback_data: `bemvindos`,
          },
        ],
      ],
    },
  });
});

// Configurar handlers de callback_query (mantém a lógica existente)
bot.on("callback_query", async (ctx: any) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat?.id;
  const username = ctx.from.first_name;

  if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
    const callbackData = ctx.callbackQuery.data;
    if (callbackData === "bemvindos") {
      const { data, error } = await supabase
        .from("users")
        .select("id, saldo, saldo_indicacao")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        const { data: insertedData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              user_id: userId,
              username: username,
              saldo: 0.0,
              saldo_indicacao: 0.0,
            },
          ])
          .single();

        if (insertError) {
          console.error("Erro ao inserir usuário no Supabase:", insertError);
          return ctx.reply(
            "Desculpe, houve um erro ao registrar suas informações."
          );
        }
      }

      const { saldo, saldo_indicacao } = data || {};

      const message = `💟 Bem-vindo(a) à Recarga Next! 💟
✨ A melhor loja de streaming do Telegram! ✨

 🧾 Sua Ficha de Usuário:
 ├ 👤 Username: @${username}
 ├ 🆔 ID do usuário: ${userId}
 ├ 💵 Saldo disponível: R$${saldo.toFixed(2)}
 └ 🔘 Saldo de Indicação: R$${saldo_indicacao}

🎉 Explore nossas opções premium e aproveite o melhor do entretenimento com facilidade e segurança!`;

      ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💎 Contas Premium", callback_data: "premium" }],
            [
              { text: "💰 Saldo", callback_data: "saldo" },
              { text: "👤 Perfil", callback_data: "perfil" },
            ],
            [{ text: "🛠️ Suporte", url: "https://t.me/nextrecarga" }],
          ],
        },
      });
    }
    if (callbackData === "bemvindos-2") {
      await ctx.deleteMessage();
      const { data, error } = await supabase
        .from("users")
        .select("id, saldo, saldo_indicacao")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        const { data: insertedData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              user_id: userId,
              username: username,
              saldo: 0.0,
              saldo_indicacao: 0.0,
            },
          ])
          .single();

        if (insertError) {
          console.error("Erro ao inserir usuário no Supabase:", insertError);
          return ctx.reply(
            "Desculpe, houve um erro ao registrar suas informações."
          );
        }
      }

      const { saldo, saldo_indicacao } = data || {};

      const message = `💟 Bem-vindo(a) à Recarga Next! 💟
✨ A melhor loja de streaming do Telegram! ✨

 🧾 Sua Ficha de Usuário:
 ├ 👤 Username: @${username}
 ├ 🆔 ID do usuário: ${userId}
 ├ 💵 Saldo disponível: R$${saldo.toFixed(2)}
 └ 🔘 Saldo de Indicação: R$${saldo_indicacao}

🎉 Explore nossas opções premium e aproveite o melhor do entretenimento com facilidade e segurança!`;

      ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💎 Contas Premium", callback_data: "premium" }],
            [
              { text: "💰 Saldo", callback_data: "saldo" },
              { text: "👤 Perfil", callback_data: "perfil" },
            ],
            [{ text: "🛠️ Suporte", url: "https://t.me/nextrecarga" }],
          ],
        },
      });
    } else if (callbackData === "premium") {
      const mensagem = `
    🛍️ Escolha o que você deseja comprar no momento:
    
   🎁 Produtos

   🎉 Combos
   
   Estamos aqui para ajudar você a encontrar a melhor opção para suas necessidades! 😊
    `;
      await ctx.deleteMessage();
      const imageUrl = `${process.env.API_URL}public/images/bot/banner.jpg`;
      ctx.replyWithPhoto(imageUrl, {
        caption: mensagem,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Ver produtos |PREMIUM|",
                callback_data: "produtos",
              },
            ],
            [
              {
                text: "Ver combos |PREMIUM|",
                callback_data: "combos",
              },
            ],
            [{ text: "⬅ Voltar", callback_data: "bemvindos-2" }],
          ],
        },
      });
    } else if (callbackData === "produtos") {
      const { data: produtos, error } = await supabase
        .from("produtos")
        .select("*");

      console.log("ETAPA ", produtos);
      if (error) {
        ctx.reply(
          "❌ Não foi possível carregar os produtos. Tente novamente mais tarde."
        );
        return;
      }

      const produtosUnique = produtos.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.nome === item.nome)
      );

      const options = () => {
        return produtosUnique.map((item) => [
          {
            text: `${item.nome}`,
            callback_data: `confirma_produto_${item.nome}`,
          },
        ]);
      };

      const mensagem = `🎖️ PERFIL | PREMIUM 🎖️
      Escolha um produto para confirmar a compra:\n\n${produtosUnique
        .map((item) => `🔹 ${item.nome}`)
        .join("\n")}
      
      =====================
      
      🏷️ Garantia Total:
      Confiamos na qualidade dos nossos serviços e oferecemos garantia em todos eles.
      
      💎 Experiência Premium, feita para você!`;
      await ctx.deleteMessage();
      await ctx.reply(mensagem, {
        reply_markup: {
          inline_keyboard: [
            ...options(),
            [{ text: "⬅ Voltar", callback_data: "bemvindos" }],
          ],
        },
      });
    } else if (callbackData.startsWith("confirma_produto_")) {
      const produtoNome = callbackData.replace("confirma_produto_", "");

      const { data: produtos, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("nome", produtoNome);

      console.log("ETAPA ", produtos);
      if (error) {
        ctx.editMessageText(
          "❌ Não foi possível carregar os produtos. Tente novamente mais tarde."
        );
        return;
      }

      const options = () => {
        return produtos.map((item) => [
          {
            text: `${item.nome} - ${item.categoria} - (R$${item.valor})`,
            callback_data: `comprar_${item.id}`,
          },
        ]);
      };

      const mensagem = `🎖️ PRODUTOS | PREMIUM 🎖️
      Você selecionou o produto: ${produtoNome}\n\nEscolha a opção para compra:\n\n${produtos
        .map((item) => `🔹 ${item.nome} - ${item.categoria}`)
        .join("\n")}
      
      =====================
      
      🏷️ Garantia Total:
      Confiamos na qualidade dos nossos serviços e oferecemos garantia em todos eles.
      
      💎 Experiência Premium, feita para você!`;

      await ctx.editMessageText(mensagem, {
        reply_markup: {
          inline_keyboard: [
            ...options(),
            [{ text: "⬅ Voltar", callback_data: "bemvindos" }],
          ],
        },
      });
    } else if (callbackData === "combos") {
      const { data: combos, error } = await supabase.from("combos").select("*");

      console.log("ETAPA ", combos);
      if (error) {
        ctx.editMessageText(
          "❌ Não foi possível carregar os combos. Tente novamente mais tarde."
        );
        return;
      }

      const options = {
        reply_markup: {
          inline_keyboard: [
            ...combos.map((item) => [
              {
                text: `${item.nome} (R$${item.valor})`,
                callback_data: `2comprar_${item.id}`,
              },
            ]),
            [{ text: "⬅ Voltar", callback_data: "bemvindos-2" }],
          ],
        },
      };
      console.log(combos, "TESTE");

      const produtos = combos.flatMap((item) => {
        return item.produtos;
      });
      console.log(produtos);

      const mensagem = "Escolha um dos combos acima:";
      const imageUrl = `${process.env.API_URL}public/images/bot/banner.jpg`;
      await ctx.deleteMessage();
      ctx.replyWithPhoto(imageUrl, {
        caption: mensagem,
        ...options,
      });
    } else if (callbackData.startsWith("comprar_")) {
      const produtoId = callbackData.split("_")[1];
      console.log(produtoId);

      const { data: produto, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", produtoId)
        .single();

      if (error || !produto) {
        ctx.editMessageText(
          "❌ Não foi possível encontrar o produto. Tente novamente mais tarde."
        );
        return;
      }
      console.log(produto);

      const { data: codigos, error: codigosError } = await supabase
        .from("codigos")
        .select("*")
        .eq("id_produto", produtoId);

      if (codigosError) {
        ctx.editMessageText(
          "❌ Não foi possível verificar a disponibilidade de códigos. Tente novamente mais tarde."
        );
        return;
      }

      const codigosAtivos = codigos.filter(
        (codigo) => codigo.status.toLowerCase() === "ativo"
      );

      if (codigosAtivos.length <= 0) {
        ctx.editMessageText(
          "❌ Não há códigos ativos disponíveis para este produto no momento. Tente novamente mais tarde."
        );
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("saldo")
        .eq("user_id", userId)
        .single();

      if (userError || !userData) {
        ctx.editMessageText(
          "❌ Não foi possível recuperar suas informações. Tente novamente mais tarde."
        );
        return;
      }

      const saldoAtual = userData.saldo;
      const valorProduto = produto.valor;

      if (saldoAtual < valorProduto) {
        ctx.editMessageText(
          `⚠️ Saldo insuficiente! Você possui R$${saldoAtual}, mas o produto custa R$${valorProduto}.\n` +
            `💰 Recarregue seu saldo para continuar.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Clique aqui para adicionar saldo",
                    callback_data: "saldo",
                  },
                ],
                [{ text: "⬅ Voltar", callback_data: "bemvindos" }],
              ],
            },
          }
        );
        return;
      }

      const confirmacaoOptions = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `Confirmar compra de R$${valorProduto}`,
                callback_data: `confirmar_compra_${produtoId}`,
              },
            ],
            [{ text: "⬅ Voltar", callback_data: "bemvindos" }],
          ],
        },
      };

      ctx.editMessageText(
        `🛒 Você está prestes a adquirir o produto:\n\n` +
          `🔹 ${produto.nome}\n\n` +
          `💵 Preço: R$${valorProduto.toFixed(2)}\n` +
          `💰 Saldo atual: R$${saldoAtual.toFixed(2)}\n\n` +
          `Deseja confirmar a compra?`,
        confirmacaoOptions
      );
    } else if (callbackData.startsWith("2comprar_")) {
      ctx.deleteMessage();
      const produtoId = callbackData.split("_")[1];
      console.log(produtoId);

      const { data: combo, error } = await supabase
        .from("combos")
        .select("*")
        .eq("id", produtoId)
        .single();
      if (error || !combo) {
        ctx.reply(
          "❌ Não foi possível encontrar o produto. Tente novamente mais tarde."
        );
        return;
      }
      console.log(combo);

      const produtosCombo = combo.produtos;
      const codigosAtivos = [];

      for (const produto of produtosCombo) {
        const { data: codigos, error: codigosError } = await supabase
          .from("codigos")
          .select("*")
          .eq("id_produto", produto.id)
          .eq("status", "Ativo");

        if (codigosError || !codigos || codigos.length === 0) {
          ctx.reply(
            `❌ O produto ${produto.nome} não possui códigos ativos disponíveis. Tente novamente mais tarde.`
          );
          return;
        }

        codigosAtivos.push(codigos[0]);
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("saldo")
        .eq("user_id", userId)
        .single();

      if (userError || !userData) {
        ctx.reply(
          "❌ Não foi possível recuperar suas informações. Tente novamente mais tarde."
        );
        return;
      }

      const saldoAtual = userData.saldo;
      const valorProduto = combo.valor;

      if (saldoAtual < valorProduto) {
        ctx.reply(
          `⚠️ Saldo insuficiente! Você possui R$${saldoAtual}, mas o produto custa R$${valorProduto}.\n` +
            `💰 Recarregue seu saldo para continuar.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Clique aqui para adicionar saldo",
                    callback_data: "saldo",
                  },
                ],
                [{ text: "⬅ Voltar", callback_data: "bemvindos" }],
              ],
            },
          }
        );
        return;
      }

      const confirmacaoOptions = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `Confirmar compra de R$${valorProduto}`,
                callback_data: `2confirmar_compra_${produtoId}`,
              },
            ],
            [{ text: "⬅ Voltar", callback_data: "bemvindos" }],
          ],
        },
      };

      ctx.reply(
        `🛒 Você está prestes a adquirir o produto:\n\n` +
          `🔹 ${combo.nome}\n\n` +
          `💵 Preço: R$${valorProduto}\n` +
          `💰 Saldo atual: R$${saldoAtual.toFixed(2) || 0}\n\n` +
          `Deseja confirmar a compra?`,
        confirmacaoOptions
      );
    } else if (callbackData.startsWith("confirmar_compra_")) {
      const produtoId = callbackData.replace("confirmar_compra_", "");

      const { data: produto, error: produtoError } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", produtoId)
        .single();

      if (produtoError || !produto) {
        await ctx.editMessageText(
          "❌ Não foi possível encontrar o produto. Tente novamente mais tarde."
        );
        return;
      }

      const valorProduto = produto.valor;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("saldo")
        .eq("user_id", userId)
        .single();

      if (userError || !userData || userData.saldo < valorProduto) {
        await ctx.editMessageText(
          "❌ Saldo insuficiente ou erro ao validar a compra. Tente novamente."
        );
        return;
      }

      const novoSaldo = userData.saldo - valorProduto;
      const { error: updateError } = await supabase
        .from("users")
        .update({ saldo: novoSaldo })
        .eq("user_id", userId);

      if (updateError) {
        await ctx.editMessageText(
          "❌ Não foi possível processar sua compra. Tente novamente mais tarde.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Clique aqui para adicionar saldo",
                    callback_data: "saldo",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      const { data: codigos, error: codigoError } = await supabase
        .from("codigos")
        .select("*")
        .eq("id_produto", produtoId);

      const codigosAtivos = codigos?.filter(
        (codigo) => codigo.status.toLowerCase() === "ativo"
      );

      if (codigoError || !codigosAtivos || codigosAtivos.length === 0) {
        await ctx.editMessageText(
          "❌ Não foi possível processar o código do produto. Solicite um chamado e envie o seu id." +
            `\nSeu id: ${userId}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Clique aqui para chamar o suporte",
                    url: "https://t.me/nextrecarga",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      const codigoData = codigosAtivos[0];
      const { error: updateCodigoError } = await supabase
        .from("codigos")
        .update({ status: "Resgatado" })
        .eq("id_codigo", codigoData.id_codigo);

      if (updateCodigoError) {
        console.error(
          `Erro ao atualizar o código ${codigoData.codigo}:`,
          updateCodigoError
        );
      }

      await ctx.editMessageText(
        `🎉 Compra realizada com sucesso!\n` +
          `🔹 Produto: ${produto.nome}\n` +
          `💵 Preço: R$${valorProduto}\n` +
          `💰 Saldo restante: R$${novoSaldo.toFixed(2)}\n\n` +
          `Aproveite seu novo produto!`
      );

      await ctx.reply(`
🎉 PARABÉNS! SEU GIFT CARD ESTÁ PRONTO! 🎉
          
✨ Aproveite agora mesmo o seu presente exclusivo! ✨  
Copie o código abaixo e ative para desbloquear seu giftcard:
          
📜 Seu Código: ${codigoData.codigo}
          
🔗 Como ativar:  
  1️⃣ Copie o código acima.  
  2️⃣ Acesse o seu aplicativo.  
  3️⃣ Insira o código no campo de ativação.  
  4️⃣ Curta sua experiência ao máximo! 🎁
          
Se tiver dúvidas, estamos aqui para ajudar. 💬
        `);
    } else if (callbackData.startsWith("2confirmar_compra_")) {
      const produtoId = callbackData.replace("2confirmar_compra_", "");

      const { data: combo, error } = await supabase
        .from("combos")
        .select("*")
        .eq("id", produtoId)
        .single();

      if (error || !combo) {
        ctx.editMessageText(
          "❌ Não foi possível encontrar o combo. Tente novamente mais tarde."
        );
        return;
      }

      const valorProduto = combo.valor;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("saldo")
        .eq("user_id", userId)
        .single();

      if (userError || !userData || userData.saldo < valorProduto) {
        ctx.editMessageText(
          "❌ Saldo insuficiente ou erro ao validar a compra. Tente novamente."
        );
        return;
      }

      const novoSaldo = userData.saldo - valorProduto;
      const { error: updateError } = await supabase
        .from("users")
        .update({ saldo: novoSaldo })
        .eq("user_id", userId);

      if (updateError) {
        ctx.editMessageText(
          "❌ Não foi possível processar sua compra. Tente novamente mais tarde.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Clique aqui para adicionar saldo",
                    callback_data: "saldo",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      const produtosCombo = combo.produtos;
      const codigosAtivos = [];

      for (const produto of produtosCombo) {
        const { data: codigos, error: codigosError } = await supabase
          .from("codigos")
          .select("*")
          .eq("id_produto", produto.id);

        if (codigosError || !codigos || codigos.length === 0) {
          await ctx.editMessageText(
            `❌ O produto ${produto.nome} não possui códigos disponíveis. Tente novamente mais tarde.`
          );
          return;
        }

        const codigosAtivosFiltrados = codigos.filter(
          (codigo) => codigo.status.toLowerCase() === "ativo"
        );

        if (codigosAtivosFiltrados.length === 0) {
          await ctx.editMessageText(
            `❌ O produto ${produto.nome}não possui códigos ativos disponíveis. Tente novamente mais tarde.`
          );
          return;
        }

        codigosAtivos.push(codigosAtivosFiltrados[0]);
      }

      ctx.editMessageText(
        `🎉 Compra realizada com sucesso!\n` +
          `🔹 Combo: ${combo.nome}\n` +
          `💵 Preço: R$${valorProduto}\n` +
          `💰 Saldo restante: R$${novoSaldo.toFixed(2)}\n\n` +
          `Aproveite seu novo combo!`
      );

      const mensagensCodigos = codigosAtivos
        .map((codigo) => {
          const produto = produtosCombo.find(
            (item: { id: any }) => codigo.id_produto === item.id
          );
          return `📜 ${produto ? produto.nome : "Produto Desconhecido"}: ${
            codigo.codigo
          }`;
        })
        .join("\n");
      for (const codigo of codigosAtivos) {
        const { error: updateCodigoError } = await supabase
          .from("codigos")
          .update({ status: "Resgatado" })
          .eq("id_codigo", codigo.id_codigo);

        if (updateCodigoError) {
          console.error(
            `Erro ao atualizar o código ${codigo.codigo}:`,
            updateCodigoError
          );
        }
      }

      ctx.reply(`
      🎉 PARABÉNS! SEUS CÓDIGOS ESTÃO PRONTOS! 🎉
      
      ✨ Aproveite agora mesmo os seus presentes exclusivos! ✨  
      Copie os códigos abaixo e ative para desbloquear suas recompensas:
      
      ${mensagensCodigos}
      
      🔗 Como ativar:  
      1️⃣ Copie o código acima.  
      2️⃣ Acesse nosso site ou aplicativo.  
      3️⃣ Insira o código no campo de ativação.  
      4️⃣ Curta sua experiência ao máximo! 🎁
      
      ⏳ Não perca tempo! O código é válido por tempo limitado.  
      Se tiver dúvidas, estamos aqui para ajudar. 💬
    `);
    } else if (callbackData === "saldo") {
      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Gerar Pix 💠", callback_data: "gerar_pix" }],
            [{ text: "⬅ Voltar", callback_data: "bemvindos" }],
          ],
        },
      };

      ctx.editMessageText(
        "💰 Escolha o valor para recarregar seu saldo💰",
        options
      );
    } else if (callbackData === "gerar_pix") {
      ctx.editMessageText("Digite o valor da recarga (de R$1 a R$999):", {
        reply_markup: {
          inline_keyboard: [[{ text: "⬅ Voltar", callback_data: "bemvindos" }]],
        },
      });

      bot.on("text", async (messageCtx: any) => {
        const valorInput = parseFloat(messageCtx.message.text);
        if (isNaN(valorInput) || valorInput < 1 || valorInput > 999) {
          messageCtx.reply(
            "⚠️ Valor inválido. Por favor, insira um valor entre R$1 e R$999."
          );
          return;
        }

        const confirmationOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `Confirmar recargar de R$${valorInput.toFixed(2)}`,
                  callback_data: `confirmar_pix_${valorInput}`,
                },
              ],
              [{ text: "Cancelar", callback_data: "bemvindos" }],
            ],
          },
        };
        messageCtx.reply(
          `Você escolheu R$${valorInput.toFixed(
            2
          )}. Confirme o valor para gerar o link de pagamento:`,
          confirmationOptions
        );
      });
    } else if (callbackData.startsWith("confirmar_pix_")) {
      const rechargeAmount = parseFloat(callbackData.split("_")[2]);
      const id_transacao = randomUUID();
      const response = await fetch(
        "https://api.openpix.com.br/api/v1/charge?return_existing=true",
        {
          method: "POST",
          headers: {
            Authorization: `${process.env.OPENPIX_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correlationID: `${userId}-${id_transacao}`,
            value: rechargeAmount * 100,
            comment: "ADIÇÃO DE SALDOS - NEXT",
            additionalInfo: [
              { key: "UserID", value: userId },
              { key: "ID", value: id_transacao },
              { key: "Product", value: "Saldo" },
              { key: "Invoice", value: `${new Date().getTime()}` },
              { key: "Origin", value: `bot` },
            ],
            payer: {
              name: `telegram - ${userId}`,
              email: "",
              phone: "",
              correlationID: userId,
            },
          }),
        }
      );

      const data = await response.json();

      ctx.reply(
        `💳 Aqui está o link para recarregar R$${rechargeAmount.toFixed(
          2
        )} em seu saldo:\n\n${data.charge.paymentLinkUrl}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Clique aqui para pagar",
                  url: data.charge.paymentLinkUrl,
                },
              ],
            ],
          },
        }
      );
      const novaVenda = {
        id_cliente: userId,
        id_transacao: id_transacao,
        valor: rechargeAmount,
        status: "pendente",
        tipo_pagamento: "pix",
      };

      const { error: vendaError } = await supabase
        .from("vendas")
        .insert([novaVenda]);

      if (vendaError) {
        console.error("Erro ao inserir nova venda:", vendaError);
      }
    } else if (callbackData === "perfil") {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, saldo, saldo_indicacao, historico_produtos,historico_deposito, username"
        )
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        ctx.editMessageText(
          "Desculpe, houve um erro ao buscar suas informações de perfil."
        );
        return;
      }

      const {
        saldo = 0.0,
        saldo_indicacao = 0.0,
        historico_produtos,
        historico_deposito,
        username,
      } = data;

      const totalCompras = historico_produtos.length || 0;
      const totalGasto = historico_deposito.reduce(
        (total: number, deposito: any) => total + parseFloat(deposito.valor),
        0
      );

      const comprasList =
        historico_produtos
          .map(
            (produto: { nome: any; valor: any; data_compra: any }) =>
              `🔹 ${produto.nome} | R$${produto.valor} | ${produto.data_compra}`
          )
          .join("\n") || "Nenhuma compra realizada ainda.";
      const depositoList =
        historico_deposito
          .map(
            (deposito: { tipo: any; valor: any; data_compra: any }) =>
              `🔹 ${deposito.tipo} | R$${deposito.valor} | ${deposito.data_compra}`
          )
          .join("\n") || "Nenhuma deposito realizado ainda.";

      const message = `
💟 Bem-vindo(a) à Recarga Next! 💟  
✨ A melhor loja de streaming do Telegram! ✨

🧾 Sua Ficha de Usuário:
├ 👤 Username: @${username}
├ 🆔 ID do usuário: ${userId}
├ 💵 Saldo disponível: R$${saldo.toFixed(2)}
└ 🔘 Saldo de Indicação: R$${saldo_indicacao}

🛍 Compras
🛒 Total de Contas adquiridas: ${totalCompras}
💠 Total em depósitos: R$${totalGasto}

🛍 Histórico de Compras
${comprasList}

💠 Histórico de Deposito
${depositoList}

🎉 Explore nossas opções premium e aproveite o melhor do entretenimento com facilidade e segurança!
    `;

      ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: [[{ text: "⬅ Voltar", callback_data: "bemvindos" }]],
        },
      });
    }
  } else {
    console.error("CallbackQuery sem dados ou tipo inválido");
  }
});

// Função para registrar as rotas no Fastify
const telegramWebhookRoutes = async (fastify: FastifyInstance) => {
  // Rota GET para buscar mensagens do usuário
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.query as any).userId;
      const limit = parseInt((request.query as any).limit || "50");

      if (userId) {
        const messages = await getUserMessages(userId, limit);
        return reply.code(200).send({ messages });
      }

      return reply.code(400).send({ error: "ID do usuário não fornecido" });
    } catch (error) {
      console.error("Erro no GET /messages:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Rota POST para receber as atualizações do Telegram
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body;

      if (
        data &&
        (data as any).message?.from?.id &&
        (data as any).message?.chat?.type &&
        (data as any).message?.chat?.type !== "supergroup"
      ) {
        const messageData: Omit<Message, "id" | "created_at"> = {
          user_id: (data as any).message.from.id.toString(),
          message: (data as any).message.text || "",
          chat_type: (data as any).message.chat.type,
          chat_id: (data as any).message.chat.id.toString(),
          username:
            (data as any).message.from.username ||
            (data as any).message.from.first_name,
          status: "received" as const,
        };

        await saveMessage(messageData);
        console.log("Mensagem salva:", messageData);
      }

      if (data && (data as any).disparo) {
        const { userId, message, image, reply_markup } = data as any;

        if (reply_markup) {
          console.log("Reply markup recebido:", JSON.stringify(reply_markup));
        }

        // Se tiver reply_markup, enviar mensagem usando a API diretamente
        if (reply_markup && reply_markup.inline_keyboard) {
          try {
            const botResult = await bot.telegram.sendMessage(userId, message, {
              parse_mode: "HTML",
              reply_markup,
            });

            console.log(
              "Mensagem com botões enviada com sucesso:",
              botResult.message_id
            );

            await saveMessage({
              user_id: userId,
              message,
              status: "sent",
              buttons: reply_markup.inline_keyboard
                .flat()
                .map((btn: TelegramInlineButton) => ({
                  name: btn.text,
                  type: btn.url ? "link" : "command",
                  command: btn.url || btn.callback_data || "",
                })),
            });

            return reply.code(200).send({
              success: true,
              message: "Mensagem com botões enviada com sucesso!",
              messageId: botResult.message_id,
            });
          } catch (error) {
            console.error("Erro ao enviar mensagem com botões:", error);
            return reply.code(500).send({
              success: false,
              error: "Falha ao enviar mensagem com botões",
            });
          }
        }

        // Usar sendMessageToUser sem os botões formatados quando não forem enviados via reply_markup
        const result = await sendMessageToUser(userId, message, [], image);

        return reply.code(200).send({
          success: true,
          message: "Webhook POST disparo processado com sucesso!",
          result,
        });
      }

      // Passar a atualização para o Telegraf processar
      if (data) {
        await bot.handleUpdate(data as any);
      }

      return reply
        .code(200)
        .send({ message: "Webhook POST processado com sucesso!" });
    } catch (error) {
      console.error("Erro no POST /webhooks/telegram:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Rota DELETE para limpar mensagens
  fastify.delete("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.query as any).userId;

      if (!userId) {
        return reply.code(400).send({ error: "ID do usuário não fornecido" });
      }

      const success = await clearUserMessages(userId);

      if (success) {
        return reply
          .code(200)
          .send({ message: "Mensagens limpas com sucesso" });
      } else {
        return reply.code(500).send({ error: "Erro ao limpar mensagens" });
      }
    } catch (error) {
      console.error("Erro no DELETE /messages:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
};

export default telegramWebhookRoutes;
