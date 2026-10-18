import axios from 'axios';

// URL base da API utilizada (exemplo: BrasilAPI ou backend intermediário)
const fipeApi = axios.create({
  baseURL: 'https://brasilapi.com.br/api/fipe',
});

export type VehicleType = 'carros' | 'motos' | 'caminhoes';

export interface FipeMarca {
  nome: string;
  valor: number; // makerCode
}

export interface FipeModelo {
  modelo: string;
  valor: string; // modelCode
}

export interface FipeAno {
  nome: string; // Ex: "2023 Gasolina", "2024 Flex"
  valor: string; // Ex: "2023-1"
}

export const fipeService = {
  // Nível 1: Listar marcas por tipo de veículo
  listarMarcas: async (vehicleType: VehicleType): Promise<FipeMarca[]> => {
    const { data } = await fipeApi.get<FipeMarca[]>(`/marcas/v1/${vehicleType}`);
    return data;
  },

  // Nível 2: Listar modelos por marca
  listarModelos: async (vehicleType: VehicleType, makerCode: number): Promise<FipeModelo[]> => {
    const { data } = await fipeApi.get<FipeModelo[]>(`/veiculos/v1/${vehicleType}/${makerCode}`);
    return data;
  },

  // Nível 3: Listar anos e combustíveis por modelo
  listarAnos: async (
    vehicleType: VehicleType,
    makerCode: number,
    modelCode: string | number
  ): Promise<FipeAno[]> => {
    const { data } = await fipeApi.get<FipeAno[]>(`/anos/v1/${vehicleType}/${makerCode}/${modelCode}`);
    return data;
  },
};