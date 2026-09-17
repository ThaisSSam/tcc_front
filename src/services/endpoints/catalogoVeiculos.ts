import api from "../config";

export interface VersaoCatalogoDTO {
  id?: number;
  versao: string;
  anoFabricacao: number;
  tipoCombustivel?: string;
  consumoMedioKml: number;
  consumoCidadeKml?: number;
  consumoEstradaKml?: number;
  capacidadeTanqueLitros?: number;
  fonte: string;
}

export interface NovoItemManualPayload {
  tipoItem: "marca" | "modelo" | "versao";
  marca: string;
  modelo?: string;
  versao?: string;
  anoFabricacao?: number;
  tipoCombustivel?: string;
  consumoMedioKml?: number;
  consumoCidadeKml?: number;
  consumoEstradaKml?: number;
  capacidadeTanqueLitros?: number;
}

export const catalogoVeiculosService = {
  listarMarcas: async (): Promise<string[]> => {
    try {
      const res = await api.get<string[]>("/api/catalogoveiculos/marcas");
      return res.data;
    } catch (error: any) {
      const msg =
        error.response?.data?.mensagem ||
        error.message ||
        "Erro ao conectar com a API de marcas.";
      throw new Error(msg);
    }
  },

  listarModelos: async (marca: string): Promise<string[]> => {
    try {
      const res = await api.get<string[]>("/api/catalogoveiculos/modelos", {
        params: { marca },
      });
      return res.data;
    } catch (error: any) {
      const msg =
        error.response?.data?.mensagem ||
        error.message ||
        `Erro ao carregar modelos da marca ${marca}.`;
      throw new Error(msg);
    }
  },

  listarVersoes: async (
    marca: string,
    modelo: string,
  ): Promise<VersaoCatalogoDTO[]> => {
    try {
      const res = await api.get<VersaoCatalogoDTO[]>(
        "/api/catalogoveiculos/versoes",
        {
          params: { marca, modelo },
        },
      );
      return res.data;
    } catch (error: any) {
      const msg =
        error.response?.data?.mensagem ||
        error.message ||
        `Erro ao buscar dados técnicos de ${modelo}.`;
      throw new Error(msg);
    }
  },

  cadastrarManual: async (dados: {
    marca: string;
    modelo: string;
    versao?: string;
    anoFabricacao: number;
    tipoCombustivel?: string;
    consumoMedioKml: number;
    consumoCidadeKml?: number;
    consumoEstradaKml?: number;
    capacidadeTanqueLitros?: number;
  }): Promise<VersaoCatalogoDTO> => {
    const res = await api.post<VersaoCatalogoDTO>(
      "/api/catalogoveiculos/manual",
      dados,
    );
    return res.data;
  },

  cadastrarItemManual: async (
    payload: NovoItemManualPayload,
  ): Promise<VersaoCatalogoDTO> => {
    const res = await api.post<VersaoCatalogoDTO>(
      "/api/catalogoveiculos/manual",
      payload,
    );
    return res.data;
  },
};
