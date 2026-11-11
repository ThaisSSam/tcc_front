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
    papel?: string;
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

export interface AppHandledError extends Error {
  success: boolean;
}

export const loginEndpoints = {
  executarLogin: async (corpoRequest: LoginRequestData): Promise<LoginEndpointResult> => {
    try {
      // POST estrito para a rota do Laravel
      const response = await api.post<LoginResponseSuccess>('/api/login', {
        email: corpoRequest.email.trim(),
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
        } else if (dadosErro?.errors) {
          if (Array.isArray(dadosErro.errors) && dadosErro.errors.length > 0) {
            mensagem = dadosErro.errors[0];
          } else if (typeof dadosErro.errors === 'object') {
            const primeiroCampo = Object.values(dadosErro.errors)[0];
            if (Array.isArray(primeiroCampo) && primeiroCampo.length > 0) {
              mensagem = primeiroCampo[0];
            }
          }
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
