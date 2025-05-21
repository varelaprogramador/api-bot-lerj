export interface VendasProps {
  origin: string;
  uuid: string;
  id_produto?: string;
  nome_cliente?: string;
  id_cliente: string;
  created_at: string;
  valor: number;
  status: string;
  tipo_pagamento?: string;
}
