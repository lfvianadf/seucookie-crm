export type PedidoStatus =
  | "novo"
  | "em_producao"
  | "pronto"
  | "saiu_entrega"
  | "entregue"
  | "cancelado";

export type PedidoOrigem = "site" | "manual";

export type UnidadeBase = "g" | "ml" | "un";

export type CategoriaInsumo =
  | "secos"
  | "molhados"
  | "cremes"
  | "chocolates"
  | "topping"
  | "embalagens"
  | "outros"
  | "custos";

export type NotaFiscalStatus =
  | "processando"
  | "aguardando_validacao"
  | "confirmada";

export type EntregaStatus = "pendente" | "saiu" | "entregue";

export type TipoProduto = "cookie" | "box";

export type OkrMetrica = "manual" | "vendas" | "cookies" | "pedidos" | "lucro";

export type TipoCusto = "unica" | "recorrente" | "parcelado";

export interface Database {
  public: {
    Tables: {
      produtos: {
        Row: {
          id: string;
          nome: string;
          numero_receita: number | null;
          descricao: string | null;
          preco: number;
          disponivel: boolean;
          qtd_estoque: number;
          tipo_produto: TipoProduto;
          qtd_cookies_box: number | null;
          acrescimo_box: number;
          capitulo: string | null;
          foto_url: string | null;
          receita_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          numero_receita?: number | null;
          descricao?: string | null;
          preco: number;
          disponivel?: boolean;
          qtd_estoque?: number;
          tipo_produto?: TipoProduto;
          qtd_cookies_box?: number | null;
          acrescimo_box?: number;
          capitulo?: string | null;
          foto_url?: string | null;
          receita_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["produtos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "produtos_receita_id_fkey";
            columns: ["receita_id"];
            isOneToOne: false;
            referencedRelation: "receitas";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          id: string;
          nome: string;
          telefone: string;
          endereco: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          telefone: string;
          endereco?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
        Relationships: [];
      };
      pedidos: {
        Row: {
          id: string;
          cliente_id: string;
          status: PedidoStatus;
          origem: PedidoOrigem;
          valor_total: number;
          observacoes: string | null;
          data_pedido: string;
          data_entrega_prevista: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          status?: PedidoStatus;
          origem?: PedidoOrigem;
          valor_total: number;
          observacoes?: string | null;
          data_pedido?: string;
          data_entrega_prevista?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pedidos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      pedido_itens: {
        Row: {
          id: string;
          pedido_id: string;
          produto_id: string;
          quantidade: number;
          preco_unitario: number;
        };
        Insert: {
          id?: string;
          pedido_id: string;
          produto_id: string;
          quantidade: number;
          preco_unitario: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["pedido_itens"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      produto_box_itens: {
        Row: {
          box_id: string;
          cookie_id: string;
        };
        Insert: {
          box_id: string;
          cookie_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["produto_box_itens"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "produto_box_itens_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "produto_box_itens_cookie_id_fkey";
            columns: ["cookie_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      pedido_item_composicao: {
        Row: {
          id: string;
          pedido_item_id: string;
          cookie_produto_id: string;
          quantidade: number;
        };
        Insert: {
          id?: string;
          pedido_item_id: string;
          cookie_produto_id: string;
          quantidade: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["pedido_item_composicao"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "pedido_item_composicao_pedido_item_id_fkey";
            columns: ["pedido_item_id"];
            isOneToOne: false;
            referencedRelation: "pedido_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_item_composicao_cookie_produto_id_fkey";
            columns: ["cookie_produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      insumos: {
        Row: {
          id: string;
          nome: string;
          unidade_base: UnidadeBase;
          categoria: CategoriaInsumo;
          estoque_atual: number;
          custo_medio_por_unidade: number;
          preco_atual: number;
          numero_compras: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          unidade_base: UnidadeBase;
          categoria?: CategoriaInsumo;
          estoque_atual?: number;
          custo_medio_por_unidade?: number;
          preco_atual?: number;
          numero_compras?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["insumos"]["Insert"]>;
        Relationships: [];
      };
      fidelidade_resgates: {
        Row: {
          id: string;
          cliente_id: string;
          cookies_usados: number;
          data: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          cookies_usados?: number;
          data?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["fidelidade_resgates"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "fidelidade_resgates_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      perdas: {
        Row: {
          id: string;
          produto_id: string;
          quantidade: number;
          custo_unitario: number;
          motivo: string | null;
          data: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          produto_id: string;
          quantidade: number;
          custo_unitario: number;
          motivo?: string | null;
          data?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["perdas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "perdas_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      custos_mensais: {
        Row: {
          id: string;
          descricao: string;
          valor: number;
          competencia: string;
          tipo: TipoCusto;
          parcelas: number | null;
          /** @deprecated substituído por `tipo` */
          recorrente: boolean;
          encerrado_em: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          descricao: string;
          valor: number;
          competencia: string;
          tipo?: TipoCusto;
          parcelas?: number | null;
          recorrente?: boolean;
          encerrado_em?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["custos_mensais"]["Insert"]
        >;
        Relationships: [];
      };
      okrs: {
        Row: {
          id: string;
          objetivo: string;
          competencia: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          objetivo: string;
          competencia: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["okrs"]["Insert"]>;
        Relationships: [];
      };
      okr_resultados: {
        Row: {
          id: string;
          okr_id: string;
          descricao: string;
          metrica: OkrMetrica;
          alvo: number;
          progresso_manual: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          okr_id: string;
          descricao: string;
          metrica?: OkrMetrica;
          alvo: number;
          progresso_manual?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["okr_resultados"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "okr_resultados_okr_id_fkey";
            columns: ["okr_id"];
            isOneToOne: false;
            referencedRelation: "okrs";
            referencedColumns: ["id"];
          },
        ];
      };
      insumo_lotes: {
        Row: {
          id: string;
          insumo_id: string;
          quantidade: number;
          quantidade_restante: number;
          preco_unitario: number;
          data: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          insumo_id: string;
          quantidade: number;
          quantidade_restante: number;
          preco_unitario: number;
          data?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["insumo_lotes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "insumo_lotes_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      producao_consumos: {
        Row: {
          id: string;
          producao_id: string;
          lote_id: string;
          quantidade: number;
        };
        Insert: {
          id?: string;
          producao_id: string;
          lote_id: string;
          quantidade: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["producao_consumos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "producao_consumos_producao_id_fkey";
            columns: ["producao_id"];
            isOneToOne: false;
            referencedRelation: "producoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_consumos_lote_id_fkey";
            columns: ["lote_id"];
            isOneToOne: false;
            referencedRelation: "insumo_lotes";
            referencedColumns: ["id"];
          },
        ];
      };
      insumo_apelidos: {
        Row: {
          id: string;
          insumo_id: string;
          texto_nota: string;
        };
        Insert: {
          id?: string;
          insumo_id: string;
          texto_nota: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["insumo_apelidos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "insumo_apelidos_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      receitas: {
        Row: {
          id: string;
          nome: string;
          rendimento_cookies: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          rendimento_cookies: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["receitas"]["Insert"]>;
        Relationships: [];
      };
      receita_insumos: {
        Row: {
          id: string;
          receita_id: string;
          insumo_id: string;
          quantidade: number;
        };
        Insert: {
          id?: string;
          receita_id: string;
          insumo_id: string;
          quantidade: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["receita_insumos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "receita_insumos_receita_id_fkey";
            columns: ["receita_id"];
            isOneToOne: false;
            referencedRelation: "receitas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receita_insumos_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      notas_fiscais: {
        Row: {
          id: string;
          foto_url: string | null;
          data_compra: string;
          valor_total: number;
          status: NotaFiscalStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          foto_url?: string | null;
          data_compra: string;
          valor_total: number;
          status?: NotaFiscalStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notas_fiscais"]["Insert"]
        >;
        Relationships: [];
      };
      nota_itens: {
        Row: {
          id: string;
          nota_id: string;
          texto_original: string;
          insumo_id: string | null;
          quantidade: number;
          valor: number;
          validado: boolean;
        };
        Insert: {
          id?: string;
          nota_id: string;
          texto_original: string;
          insumo_id?: string | null;
          quantidade: number;
          valor: number;
          validado?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["nota_itens"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "nota_itens_nota_id_fkey";
            columns: ["nota_id"];
            isOneToOne: false;
            referencedRelation: "notas_fiscais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_itens_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      producoes: {
        Row: {
          id: string;
          receita_id: string;
          produto_id: string;
          quantidade_produzida: number;
          data: string;
        };
        Insert: {
          id?: string;
          receita_id: string;
          produto_id: string;
          quantidade_produzida: number;
          data?: string;
        };
        Update: Partial<Database["public"]["Tables"]["producoes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "producoes_receita_id_fkey";
            columns: ["receita_id"];
            isOneToOne: false;
            referencedRelation: "receitas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producoes_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
      };
      entregas: {
        Row: {
          id: string;
          pedido_id: string;
          endereco: string;
          status: EntregaStatus;
          data_saida: string | null;
          data_entrega: string | null;
        };
        Insert: {
          id?: string;
          pedido_id: string;
          endereco: string;
          status?: EntregaStatus;
          data_saida?: string | null;
          data_entrega?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["entregas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "entregas_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      fidelidade_clientes: {
        Row: {
          cliente_id: string;
          nome: string;
          telefone: string;
          cookies_comprados: number;
          cookies_resgatados: number;
          cookies_no_cartao: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      registrar_producao: {
        Args: {
          p_receita_id: string;
          p_produto_id: string;
          p_quantidade: number;
          p_data?: string;
        };
        Returns: string;
      };
      atualizar_producao: {
        Args: {
          p_producao_id: string;
          p_receita_id: string;
          p_produto_id: string;
          p_quantidade: number;
          p_data?: string | null;
        };
        Returns: undefined;
      };
      registrar_entrada_insumo: {
        Args: {
          p_insumo_id: string;
          p_quantidade: number;
          p_valor_pago: number;
          p_data?: string | null;
        };
        Returns: string;
      };
      editar_lote_insumo: {
        Args: {
          p_lote_id: string;
          p_quantidade: number;
          p_valor_pago: number;
          p_data: string | null;
        };
        Returns: undefined;
      };
      excluir_lote_insumo: {
        Args: { p_lote_id: string };
        Returns: undefined;
      };
      estornar_producao: {
        Args: { p_producao_id: string };
        Returns: undefined;
      };
      buscar_cliente_por_telefone: {
        Args: { p_telefone: string };
        Returns: { id: string; nome: string; endereco: string | null }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
