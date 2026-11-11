import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Calculator, ArrowLeft, CheckCircle2 } from "lucide-react";
import CustomToast from "../../components/CustomToast";
import api from "../../services/config";

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro("");

    if (senha !== confirmarSenha) {
      setMensagemErro("As senhas digitadas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setMensagemErro("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setCarregando(true);

    try {
      // POST para a rota configurada no routes/api.php
      await api.post("/api/usuarios", {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senha,
      });

      setSucesso(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      const respostaErro = error.response?.data;
      const erroTratado =
        respostaErro?.mensagem ||
        respostaErro?.message ||
        (Array.isArray(respostaErro?.errors) ? respostaErro.errors[0] : null) ||
        (typeof respostaErro?.errors === "object" ? Object.values(respostaErro.errors)[0] : null) ||
        "Não foi possível concluir o cadastro. Verifique os dados.";

      setMensagemErro(Array.isArray(erroTratado) ? erroTratado[0] : erroTratado);
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
          alt="Banner Calculadora de Trajeto"
          className="w-full h-full object-cover object-[45%_55%]"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Lado Direito - Formulário */}
      <div className="col-span-1 lg:col-span-2 flex flex-col justify-center items-center bg-[#0f172a] p-8 h-full relative">
        <div className="w-full max-w-xs">
          <div className="mb-6 text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Calculator size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-bold text-sm leading-none text-slate-100">Calculadora de Trajeto</h2>
              <p className="text-[10px] text-slate-500">Gestão de Atividades</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Criar Conta</h2>
            <p className="text-xs text-gray-500 mt-1">Preencha os campos para iniciar suas simulações</p>
          </div>

          {sucesso ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs space-y-2 text-center animate-in fade-in">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="font-semibold text-sm">Conta cadastrada com sucesso!</p>
              <p className="text-slate-400">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleCadastrar} className="flex flex-col gap-3.5" noValidate>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full p-2.5 pl-10 border border-[#3a475c] rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-800/40 text-white text-xs transition-all placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full p-2.5 pl-10 border border-[#3a475c] rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-800/40 text-white text-xs transition-all placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Senha <span className="text-red-500">*</span>
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
                    placeholder="Mínimo de 6 dígitos"
                    className="w-full p-2.5 pl-10 border border-[#3a475c] rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-800/40 text-white text-xs transition-all placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Confirmar Senha <span className="text-red-500">*</span>
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
                    placeholder="Repita a senha"
                    className="w-full p-2.5 pl-10 border border-[#3a475c] rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-800/40 text-white text-xs transition-all placeholder-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-[#2b71e3] hover:bg-blue-600 text-white p-2.5 rounded-lg font-semibold text-xs transition-colors mt-2 cursor-pointer disabled:opacity-50"
              >
                {carregando ? "Cadastrando..." : "Criar Minha Conta"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              Já possui uma conta? Faça Login
            </button>
          </div>
        </div>

        {mensagemErro && (
          <div className="absolute bottom-4 right-4 z-50">
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out">
              <CustomToast
                title="Erro no Cadastro"
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