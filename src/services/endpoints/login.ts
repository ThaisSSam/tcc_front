import axios, { AxiosError } from 'axios';
import api from '../config';

export interface LoginRequestData {
  email: string;
  senha: string;
  lembrarAcesso?: boolean;
}

export interface LoginResponseSuccess {
  mensagem?: string;
  message?: string;
  token: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface ApiErrorResponse {
  errors?: string[] | Record<string, string[]>;
  mensagem?: string;
  message?: string;
}

export interface LoginEndpointResult {
  data: LoginResponseSuccess;
  success: boolean;
}

export interface RecoveryEndpointResult {
  success: boolean;
  message: string;
}

export interface AppHandledError extends Error {
  success: boolean;
}

export const loginEndpoints = {
  executarLogin: async (corpoRequest: LoginRequestData): Promise<LoginEndpointResult> => {
    try {
      const response = await api.post<LoginResponseSuccess>('/api/login', {
        email: corpoRequest.email,
        senha: corpoRequest.senha,
      });

      return { data: response.data, success: true };
    } catch (error: unknown) {
      let mensagem = 'Erro ao tentar realizar o login.';

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        const dadosErro = axiosError.response?.data;

        if (dadosErro?.mensagem) {
          mensagem = dadosErro.mensagem;
        } else if (dadosErro?.message) {
          mensagem = dadosErro.message;
        } else if (Array.isArray(dadosErro?.errors) && dadosErro.errors.length > 0) {
          mensagem = dadosErro.errors[0];
        } else if (axiosError.message) {
          mensagem = axiosError.message;
        }
      } else if (error instanceof Error) {
        mensagem = error.message;
      }

      const erroTratado = new Error(mensagem) as AppHandledError;
      erroTratado.success = false;
      throw erroTratado;
    }
  },

  solicitarRecuperacao: async (login: string): Promise<RecoveryEndpointResult> => {
    try {
      const response = await api.post<{ success?: boolean; message?: string }>('/api/esqueci-senha', {
        email: login.trim(),
      });
      return {
        success: response.data?.success ?? true,
        message: response.data?.message || 'Link de recuperação enviado com sucesso.',
      };
    } catch (error: unknown) {
      let mensagem = 'Erro ao solicitar recuperação.';

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        mensagem = axiosError.response?.data?.message || axiosError.message;
      } else if (error instanceof Error) {
        mensagem = error.message;
      }

      throw new Error(mensagem);
    }
  },

  executarLogout: async (): Promise<{ success: boolean }> => {
    try {
      await api.post('/api/logout');
      return { success: true };
    } catch {
      return { success: false };
    }
  },
};

export default loginEndpoints;
