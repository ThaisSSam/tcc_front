import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, KeyRound, ArrowLeft, CheckCircle2, Calculator } from "lucide-react";
import CustomToast from "../../components/CustomToast";
import api from "../../services/config";

export default function RedefinirSenhaScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  // Captura os parâmetros ?token=...&email=... vindos do e-mail do backend
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
  }, [searchParams]);

  const handleRedefinir = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro("");

    if (!token.trim()) {
      setMensagemErro("Token de recuperação ausente ou inválido.");
      return;
    }

    if (senha.length < 8) {
      setMensagemErro("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagemErro("A confirmação da senha não confere.");
      return;
    }

    setCarregando(true);

    try {
      // POST para a rota canônica do Laravel (routes/api.php)
      const res = await api.post("/api/redefinir-senha", {
        email: email.trim().toLowerCase(),
        token: token.trim(),
        senha: senha,
        senha_confirmacao: confirmarSenha,
      });

      setMensagemSucesso(res.data?.mensagem || "Senha redefinida com sucesso!");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      const dados = err.response?.data;
      if (dados?.errors && typeof dados.errors === "object") {
        const primeiroErro = Object.values(dados.errors)[0];
        if (Array.isArray(primeiroErro) && primeiroErro.length > 0) {
          setMensagemErro(primeiroErro[0]);
          return;
        }
      }
      setMensagemErro(dados?.message || dados?.mensagem || "Link de recuperação inválido ou expirado.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-5 min-h-screen font-sans">
      <div className="hidden lg:flex lg:col-span-3 bg-[#0b1d45] flex-col justify-center items-center text-white">
        <img
          src="/imagens/login.png"
          alt="Banner"
          className="w-full h-full object-cover object-[45%_55%]"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

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
            <h1 className="text-xl font-bold text-slate-100">Definir Nova Senha</h1>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre sua nova senha de acesso à conta.
            </p>
          </div>

          {mensagemSucesso ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs space-y-3 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
              <p className="font-semibold text-sm">{mensagemSucesso}</p>
              <p className="text-slate-400">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleRedefinir} className="space-y-4" noValidate>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full p-2.5 bg-gray-800/20 border border-[#3a475c]/60 rounded-lg text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Nova Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-amber-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="w-full p-2.5 pl-10 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Confirmar Nova Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-amber-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full p-2.5 pl-10 bg-gray-800/40 border border-[#3a475c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-2.5 bg-[#2b71e3] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {carregando ? "Salvando..." : "Salvar Nova Senha"}
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

        {mensagemErro && (
          <div className="absolute bottom-4 right-4 z-50">
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out">
              <CustomToast
                title="Erro ao Redefinir"
                message={mensagemErro}
                onClose={() => setMensagemErro("")}
                type="error"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}