import axios, { AxiosError } from 'axios';
import api from '../config';

// Tipagem base de um veículo (alinhada com o modelo da API/MySQL)
export interface VeiculoDTO {
  id?: string;
  usuarioId?: string;
  usuario_id?: string;
  apelido: string;
  marca: string;
  modelo: string;
  anoFabricacao?: number;
  ano_fabricacao?: number;
  tipoPropulsao?: 'combustao' | 'eletrico' | 'hibrido';
  tipo_propulsao?: 'combustao' | 'eletrico' | 'hibrido';
  consumoKml?: number | null;
  consumo_kml?: number | null;
  consumoKwh100km?: number | null;
  consumo_kwh_100km?: number | null;
  capacidadeBateriaKwh?: number | null;
  capacidade_bateria_kwh?: number | null;
  autonomiaKm?: number | null;
  autonomia_km?: number | null;
  fonteConsumo?: string;
  fonte_consumo?: string;
  dataAtualizacao?: string;
  data_atualizacao?: string;
}

export interface ApiErrorResponse {
  errors?: string[] | Record<string, string[]>;
  mensagem?: string;
  message?: string;
}

export interface VeiculoEndpointResult<T> {
  data: T;
  success: boolean;
}

export interface AppHandledError extends Error {
  success: boolean;
}

const tratarErroRequisicao = (error: unknown, fallbackMessage: string): AppHandledError => {
  let mensagem = fallbackMessage;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const dadosErro = axiosError.response?.data;

    if (dadosErro?.mensagem) {
      mensagem = dadosErro.mensagem;
    } else if (dadosErro?.message) {
      mensagem = dadosErro.message;
    } else if (Array.isArray(dadosErro?.errors) && dadosErro.errors.length > 0) {
      mensagem = dadosErro.errors[0];
    } else if (dadosErro?.errors && typeof dadosErro.errors === 'object') {
      const primeiro = Object.values(dadosErro.errors)[0];
      if (Array.isArray(primeiro) && primeiro.length > 0) {
        mensagem = primeiro[0];
      }
    } else if (axiosError.message) {
      mensagem = axiosError.message;
    }
  } else if (error instanceof Error) {
    mensagem = error.message;
  }

  const erroTratado = new Error(mensagem) as AppHandledError;
  erroTratado.success = false;
  return erroTratado;
};

// Converte chaves em camelCase para snake_case exigido pelo Laravel
const normalizarPayloadLaravel = (veiculo: Partial<VeiculoDTO>) => ({
  apelido: veiculo.apelido,
  marca: veiculo.marca,
  modelo: veiculo.modelo,
  ano_fabricacao: veiculo.ano_fabricacao ?? veiculo.anoFabricacao,
  tipo_propulsao: veiculo.tipo_propulsao ?? veiculo.tipoPropulsao ?? 'combustao',
  consumo_kml: veiculo.consumo_kml ?? veiculo.consumoKml ?? null,
  consumo_kwh_100km: veiculo.consumo_kwh_100km ?? veiculo.consumoKwh100km ?? null,
  capacidade_bateria_kwh: veiculo.capacidade_bateria_kwh ?? veiculo.capacidadeBateriaKwh ?? null,
  autonomia_km: veiculo.autonomia_km ?? veiculo.autonomiaKm ?? null,
  fonte_consumo: veiculo.fonte_consumo ?? veiculo.fonteConsumo ?? 'manual',
});

export const veiculosEndpoints = {
  // GET /api/veiculos
  listar: async (): Promise<VeiculoEndpointResult<VeiculoDTO[]>> => {
    try {
      const response = await api.get<any>('/api/veiculos');
      // Desempacota { data: [...] } do Laravel Resource caso exista
      const lista: VeiculoDTO[] = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || []);
      return { data: lista, success: true };
    } catch (error: unknown) {
      throw tratarErroRequisicao(error, 'Erro ao carregar a lista de veículos.');
    }
  },

  // POST /api/veiculos
  cadastrar: async (veiculo: Partial<VeiculoDTO>): Promise<VeiculoEndpointResult<VeiculoDTO>> => {
    try {
      const payload = normalizarPayloadLaravel(veiculo);
      const response = await api.post<any>('/api/veiculos', payload);
      const item: VeiculoDTO = response.data?.data || response.data;
      return { data: item, success: true };
    } catch (error: unknown) {
      throw tratarErroRequisicao(error, 'Erro ao cadastrar o veículo.');
    }
  },

  // PUT /api/veiculos/{id}
  atualizar: async (id: string, veiculo: Partial<VeiculoDTO>): Promise<VeiculoEndpointResult<VeiculoDTO>> => {
    try {
      const payload = normalizarPayloadLaravel(veiculo);
      const response = await api.put<any>(`/api/veiculos/${id}`, payload);
      const item: VeiculoDTO = response.data?.data || response.data;
      return { data: item, success: true };
    } catch (error: unknown) {
      throw tratarErroRequisicao(error, 'Erro ao atualizar o veículo.');
    }
  },

  // DELETE /api/veiculos/{id}
  excluir: async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.delete(`/api/veiculos/${id}`);
      return { success: true, message: 'Veículo excluído com sucesso.' };
    } catch (error: unknown) {
      throw tratarErroRequisicao(error, 'Erro ao excluir o veículo.');
    }
  },
};

export default veiculosEndpoints;