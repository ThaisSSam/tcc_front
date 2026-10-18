import axios from 'axios';

const fipeClient = axios.create({
  baseURL: 'https://brasilapi.com.br/api/fipe',
  timeout: 8000,
});

export type VehicleType = 'carros' | 'motos' | 'caminhoes';

export interface FipeMarcaItem {
  nome: string;
  valor: number;
}

export interface FipeModeloItem {
  modelo: string;
  valor: string;
}

export interface FipeAnoItem {
  nome: string;  // Ex: "2023 Gasolina"
  valor: string; // Ex: "2023-1"
}

// Gera anos padrão caso a FIPE retorne 429/500
function gerarAnosFallback(): FipeAnoItem[] {
  const anoAtual = new Date().getFullYear();
  const anos: FipeAnoItem[] = [];

  for (let ano = anoAtual; ano >= 2010; ano--) {
    anos.push({ nome: `${ano} Flex`, valor: `${ano}-1` });
    anos.push({ nome: `${ano} Gasolina`, valor: `${ano}-2` });
  }
  return anos;
}

export const fipeService = {
  listarMarcas: async (vehicleType: VehicleType = 'carros'): Promise<FipeMarcaItem[]> => {
    try {
      const response = await fipeClient.get<FipeMarcaItem[]>(`/marcas/v1/${vehicleType}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar marcas FIPE:', error);
      return [];
    }
  },

  listarModelos: async (vehicleType: VehicleType, makerCode: number): Promise<FipeModeloItem[]> => {
    try {
      const response = await fipeClient.get<FipeModeloItem[]>(`/veiculos/v1/${vehicleType}/${makerCode}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar veículos/modelos FIPE:', error);
      return [];
    }
  },

  // 3. Anos com retry e contingência automática
  listarAnos: async (
    vehicleType: VehicleType,
    makerCode: number,
    modelCode: string | number
  ): Promise<{ itens: FipeAnoItem[]; emContingencia: boolean }> => {
    const url = `/anos/v1/${vehicleType}/${makerCode}/${modelCode}`;

    // Tentativa 1
    try {
      const response = await fipeClient.get<FipeAnoItem[]>(url);
      if (Array.isArray(response.data) && response.data.length > 0) {
        return { itens: response.data, emContingencia: false };
      }
    } catch (err) {
      console.warn('Tentativa 1 falhou na FIPE (429/500), aguardando retentativa...', err);
    }

    // Aguarda 1,2s e tenta novamente (para contornar o rate limit 429)
    await new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      const retryResponse = await fipeClient.get<FipeAnoItem[]>(url);
      if (Array.isArray(retryResponse.data) && retryResponse.data.length > 0) {
        return { itens: retryResponse.data, emContingencia: false };
      }
    } catch (err) {
      console.warn('Tentativa 2 falhou. Ativando anos padrão de contingência.', err);
    }

    // Se a FIPE continuar bloqueando, entrega os anos gerados para não travar o cadastro
    return { itens: gerarAnosFallback(), emContingencia: true };
  },
};