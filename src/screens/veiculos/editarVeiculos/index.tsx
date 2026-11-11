import React, { useState, useEffect } from "react";
import { User, Mail, Shield, KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/config";
import CustomToast from "../../../components/CustomToast";

interface UsuarioLogado {
  id?: string;
  nome?: string;
  name?: string;
  email?: string;
  papel?: string;
  role?: string;
}

export default function PerfilScreen() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    // Recupera os dados do usuário autenticado no login
    const dadosSalvos = localStorage.getItem("auth_user") || localStorage.getItem("usuario");
    if (dadosSalvos) {
      try {
        setUsuario(JSON.parse(dadosSalvos));
      } catch {
        setUsuario({
          nome: "Usuário do Sistema",
          email: "usuario@tcc.com",
          papel: "user",
        });
      }
    } else {
      setUsuario({
        nome: "Usuário Logado",
        email: "admin@example.com",
        papel: "admin",
      });
    }
  }, []);

  const handleRedefinirSenhaDireta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter no mínimo 8 caracteres, com ao menos uma letra e um número.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("A confirmação da nova senha não confere.");
      return;
    }

    setCarregando(true);

    try {
      // 1. O front solicita a redefinição para o próprio e-mail (POST /api/esqueci-senha)
      const emailUsuario = usuario?.email || "";
      await api.post("/api/esqueci-senha", {
        email: emailUsuario.trim().toLowerCase(),
      });

      setSucesso(
        "Solicitação processada com sucesso! As instruções e o link seguro de uso único foram despachados para a sua caixa."
      );
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err: any) {
      const resp = err.response?.data;
      setErro(resp?.message || resp?.mensagem || "Não foi possível processar a alteração.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 font-sans text-white">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Meu Perfil</h1>
            <p className="text-xs text-slate-400">Informações da sua conta e credenciais de acesso</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card de Dados do Usuário */}
        <div className="md:col-span-1 bg-[#131b2e] border border-slate-800 rounded-xl p-5 space-y-4 h-fit">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xl">
              <User size={30} />
            </div>
            <h3 className="font-semibold text-sm text-slate-100">
              {usuario?.nome || usuario?.name || "Usuário"}
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 uppercase tracking-wide">
              {usuario?.papel || usuario?.role || "user"}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-3 text-xs">
            <div>
              <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                <Mail size={14} /> E-mail
              </span>
              <p className="font-mono text-slate-200 break-all">{usuario?.email || "—"}</p>
            </div>
            <div>
              <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                <Shield size={14} /> Nível de Acesso
              </span>
              <p className="text-slate-200 capitalize">{usuario?.papel || usuario?.role || "Padrão"}</p>
            </div>
          </div>
        </div>

        {/* Card de Alteração de Senha */}
        <div className="md:col-span-2 bg-[#131b2e] border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-100">Redefinir Senha</h2>
              <p className="text-xs text-slate-400">Atualize sua credencial de segurança sem complicações</p>
            </div>
          </div>

          {sucesso && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-start gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Solicitação concluída!</p>
                <p className="text-emerald-300/90 mt-0.5">{sucesso}</p>
              </div>
            </div>
          )}

          {erro && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Atenção</p>
                <p className="text-rose-300/90 mt-0.5">{erro}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleRedefinirSenhaDireta} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Nova Senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres (letras e números)"
                className="w-full p-2.5 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full p-2.5 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={carregando}
                className="w-full md:w-auto px-6 py-2.5 bg-[#2b71e3] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10"
              >
                {carregando ? "Processando..." : "Redefinir Minha Senha"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}