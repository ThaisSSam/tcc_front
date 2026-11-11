import React, { useState, useEffect } from "react";
import { User, Lock, Mail, Shield, CheckCircle2, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustomToast from "../../components/CustomToast";
import api from "../../services/config";

export default function PerfilUsuarioScreen() {
  const navigate = useNavigate();

  // Dados do usuário obtidos do storage
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  // Formulário de alteração de senha direta
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    const rawUser = localStorage.getItem("auth_user");
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setNome(u.nome || u.name || "Motorista");
        setEmail(u.email || "");
      } catch {
        setNome("Motorista");
      }
    }
  }, []);

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro("");
    setMensagemSucesso("");

    if (!senhaAtual) {
      setMensagemErro("Informe sua senha atual.");
      return;
    }

    if (novaSenha.length < 8) {
      setMensagemErro("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setMensagemErro("A confirmação da nova senha não confere.");
      return;
    }

    setCarregando(true);

    try {
      // Dispara a alteração autenticada (usando o Bearer Token do Sanctum)
      await api.put("/api/perfil/senha", {
        senha_atual: senhaAtual,
        senha: novaSenha,
        senha_confirmacao: confirmarNovaSenha,
      });

      setMensagemSucesso("Senha atualizada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (err: any) {
      const dados = err.response?.data;
      if (dados?.errors && typeof dados.errors === "object") {
        const primeiroErro = Object.values(dados.errors)[0];
        if (Array.isArray(primeiroErro) && primeiroErro.length > 0) {
          setMensagemErro(primeiroErro[0]);
          return;
        }
      }
      setMensagemErro(
        dados?.message ||
        dados?.mensagem ||
        "Não foi possível atualizar a senha. Verifique a senha atual."
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-full p-6 text-slate-100 font-sans max-w-4xl mx-auto space-y-6">
      {/* Botão de retorno e cabeçalho */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Voltar ao Painel
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30">
          Conta Ativa
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Meu Perfil</h1>
        <p className="text-xs text-slate-400 mt-1">
          Gerencie as informações da sua conta e credenciais de segurança.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão de identificação do Usuário */}
        <div className="md:col-span-1 bg-[#131b2e] border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/20">
            <User size={36} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{nome}</h2>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-1">
              <Mail size={13} className="text-slate-500" /> {email || "usuario@tcc.com"}
            </p>
          </div>
          <div className="w-full pt-4 border-t border-slate-800/80 text-left">
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
              <Shield size={16} />
              <span>Autenticação ativa via Sanctum</span>
            </div>
          </div>
        </div>

        {/* Formulário: Alterar Senha Sem Código */}
        <div className="md:col-span-2 bg-[#131b2e] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Alterar Senha</h3>
              <p className="text-[11px] text-slate-400">
                Altere sua senha de acesso sem a necessidade de código por e-mail.
              </p>
            </div>
          </div>

          {mensagemSucesso && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs">
              <CheckCircle2 size={16} />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          <form onSubmit={handleAlterarSenha} className="space-y-4" noValidate>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Senha Atual <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-500">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full pl-9 pr-3 py-2 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Nova Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-amber-500">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-9 pr-3 py-2 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Confirmar Nova Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-amber-500">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-3 py-2 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={carregando}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2b71e3] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save size={15} />
                {carregando ? "Salvando..." : "Salvar Nova Senha"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {mensagemErro && (
        <div className="fixed bottom-4 right-4 z-50">
          <CustomToast
            title="Erro na Alteração"
            message={mensagemErro}
            onClose={() => setMensagemErro("")}
            type="error"
          />
        </div>
      )}
    </div>
  );
}