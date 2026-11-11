import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound, Calculator, CheckCircle2 } from "lucide-react";
import CustomToast from "../../components/CustomToast";
import api from "../../services/config";

export default function EsqueciSenhaScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    try {
      const response = await api.post("/api/esqueci-senha", {
        email: email.trim().toLowerCase(),
      });

      setSucesso(true);
      setMensagem(response.data?.mensagem || "Instruções enviadas para o seu e-mail.");
    } catch (err: any) {
      const respostaErro = err.response?.data;
      setErro(
        respostaErro?.mensagem ||
        respostaErro?.message ||
        "Não foi possível processar a recuperação de senha."
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-5 min-h-screen font-sans">
      {/* Lado Esquerdo - Banner */}
      <div className="hidden lg:flex lg:col-span-3 bg-[#0b1d45] flex-col justify-center items-center text-white">
        <img
          src="/imagens/login.png"
          alt="Banner Recuperação de Senha"
          className="w-full h-full object-cover object-[45%_55%]"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Lado Direito - Formulário */}
      <div className="col-span-1 lg:col-span-2 flex flex-col justify-center items-center bg-[#0f172a] p-8 h-full relative">
        <div className="w-full max-w-xs space-y-6">
          <div className="text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Calculator size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-bold text-sm leading-none text-slate-100">Calculadora de Trajeto</h2>
              <p className="text-[10px] text-slate-500">Gestão de Atividades</p>
            </div>
          </div>

          <div>
            <div className="w-9 h-9 bg-blue-600/20 text-blue-500 rounded-lg flex items-center justify-center border border-blue-500/30 mb-3">
              <KeyRound size={18} />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Recuperar Senha</h1>
            <p className="text-xs text-slate-400 mt-1">
              Informe o e-mail cadastrado para enviarmos as instruções de redefinição de acesso.
            </p>
          </div>

          {sucesso ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <p className="font-medium">{mensagem}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  E-mail Cadastrado <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-2.5 bg-[#2b71e3] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {carregando ? "Enviando..." : "Enviar Instruções"}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Voltar para o Login
            </button>
          </div>
        </div>

        {erro && (
          <div className="absolute bottom-4 right-4 z-50">
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out">
              <CustomToast
                title="Falha na Recuperação"
                message={erro}
                onClose={() => setErro("")}
                type="error"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}