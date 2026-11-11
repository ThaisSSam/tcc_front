import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Calculator } from "lucide-react";
import CustomToast from "../../components/CustomToast";
import { loginEndpoints } from "../../services/endpoints/login";

interface LoginScreenProps {
  onLoginSucesso: (novoToken: string) => void;
}

export default function LoginScreen({ onLoginSucesso }: LoginScreenProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [senha, setSenha] = useState("");
  const [lembrarAcesso, setLembrarAcesso] = useState(false);
  const [statusLogin, setStatusLogin] = useState("");
  const [erroLogin, setErroLogin] = useState("");

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin("");
    setStatusLogin("Conectando...");

    try {
      // API CHAMA AQUI (Porta 8000)
      const resultado = await loginEndpoints.executarLogin({
        email: email,
        senha: senha,
        lembrarAcesso: lembrarAcesso,
      });

      setStatusLogin("Logado com sucesso!");

      if (resultado.data?.token) {
        onLoginSucesso(resultado.data.token);
      }

      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 500);
    } catch (error: unknown) {
      setStatusLogin("");
      if (error instanceof Error) {
        setErroLogin(error.message);
      } else {
        setErroLogin("E-mail ou senha incorretos.");
      }
    }
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-5 min-h-screen font-sans">
      <div className="hidden lg:flex lg:col-span-3 bg-[#0b1d45] flex-col justify-center items-center text-white">
        <img
          src="/imagens/login.png"
          alt="Imagem de login"
          className="w-full h-full object-cover object-[45%_55%]"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      <div className="col-span-1 lg:col-span-2 flex flex-col justify-center items-center bg-[#0f172a] p-8 h-full relative">
        <div className="w-full max-w-xs">
          <div className="mb-10 text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Calculator size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-bold text-sm leading-none text-slate-100">
                Calculadora de Trajeto
              </h2>
              <p className="text-[10px] text-slate-500">Gestão de Atividades</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Bem-vindo de volta</h2>
            <p className="text-xs text-gray-500 mt-1">
              Insira suas credenciais para continuar
            </p>
          </div>

          <form
            onSubmit={handleSubmeter}
            className="flex flex-col gap-4"
            noValidate
          >
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                Usuário / E-mail <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="text"
                  className="w-full p-2.5 pl-10 border border-[#3a475c] rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-800/40 text-white text-sm transition-all placeholder-slate-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-amber-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  className="w-full p-2.5 pl-10 border border-[#3a475c] rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-800/40 text-white text-sm transition-all placeholder-slate-600"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={lembrarAcesso}
                  onChange={(e) => setLembrarAcesso(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-blue-500 cursor-pointer"
                />
                Lembrar acesso
              </label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-blue-500 hover:underline cursor-pointer font-medium"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={!!statusLogin && statusLogin !== "Logado com sucesso!"}
              className="w-full bg-[#2b71e3] hover:bg-blue-600 text-white p-2.5 rounded-lg font-semibold text-sm transition-colors mt-2 cursor-pointer disabled:opacity-50"
            >
              {statusLogin ? statusLogin : "Entrar"}
            </button>
            {/* Adicione este bloco antes do fechamento da div do formulário no seu LoginScreen */}
            <div className="mt-8">
              <hr className="border-slate-800/60" />
              <div className="flex flex-row justify-center items-center text-xs text-slate-500 gap-1 mt-6">
                <p>Não tem uma conta?</p>
                <button
                  type="button"
                  onClick={() => navigate("/cadastro")}
                  className="text-blue-500 hover:text-blue-400 font-medium transition-colors cursor-pointer"
                >
                  Cadastre-se
                </button>
              </div>
            </div>
          </form>
        </div>

        {erroLogin && (
          <div className="absolute bottom-4 right-4 z-50">
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out">
              <CustomToast
                title="Falha no Acesso"
                message={erroLogin}
                onClose={() => setErroLogin("")}
                type="error"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
