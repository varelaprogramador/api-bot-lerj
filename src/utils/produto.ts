export interface ProdutosProps {
  id?: string;
  nome: string;
  descricao: string;
  valor: number;
  categoria: string;
  created_at?: string;
  url_image: string;
}
export interface ProdutosLojaProps {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  categoria: string;
  created_at?: string;
  url_image: string;
  position: number;
  reviews: JSON;
}
