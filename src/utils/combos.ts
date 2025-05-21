import { ProdutosProps } from "./produto";

export interface CombosProps{
    id?:string;
    nome:string;
    produtos:ProdutosProps[];
    descricao:string;
    status:string;
    created_at?:string;
    valor:number;
}