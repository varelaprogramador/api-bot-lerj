import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // CONFIG
  NODE_ENV: z.enum(["development", "production"]),
  PORT: z.string().trim().regex(/^\d+$/, "PORT deve ser um número."),

  // CLERK
  CLERK_SECRET_KEY: z.string().trim(),
  CLERK_PUBLISHABLE_KEY: z.string().trim(),

  // SUPABASE
  SUPABASE_URL: z.string().trim(),
  SUPABASE_KEY: z.string().trim(),

  // EVOLUTION
  EVOLUTION_INSTANCE_ID: z.string().trim(),
  EVOLUTION_API_KEY: z.string().trim(),
  EVOLUTION_API_URL: z.string().trim(),

  // OPENPIX
  OPENPIX_API_KEY: z.string().trim(),

  // TELEGRAM
  TELEGRAM_BOT_TOKEN: z.string().trim(),
  TELEGRAM_WEBHOOK_SECRET: z.string().trim(),

  // OTHERS
  API_URL: z.string().trim(),
  WHATSAPP_CHECKOUT: z.string().trim(),
  WHATSAPP_SUPPORT: z.string().trim(),
  TELEGRAM_CHECKOUT: z.string().trim(),
  TELEGRAM_SUPPORT: z.string().trim(),
  WEBHOOK_API_KEY: z.string().trim(),
  USER_WEBHOOK_API_KEY: z.string().trim(),
});

// Tipagem das variáveis de ambiente
type EnvSchema = z.infer<typeof envSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Record<keyof EnvSchema, string> {}
  }
}

// Validação das variáveis de ambiente
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Erro na validação das variáveis de ambiente:",
    parsedEnv.error.format()
  );
  process.exit(1);
}

process.env = { ...process.env, ...parsedEnv.data };

// Conversão de PORT para uso interno
export const PORT = parseInt(process.env.PORT, 10);
