import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "⚠️ Variáveis de ambiente do Supabase não estão configuradas corretamente!"
  );
  console.error(`URL: ${supabaseUrl ? "✔️" : "❌ NÃO CONFIGURADA"}`);
  console.error(`Key: ${supabaseKey ? "✔️" : "❌ NÃO CONFIGURADA"}`);
  throw new Error(
    "❌ Falha ao inicializar Supabase: Variáveis de ambiente ausentes."
  );
}

// Inicializa o cliente Supabase com tipagem padrão
export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Cliente Supabase inicializado com sucesso");
