import React, { useState, Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLoadingFallback from "./components/layout/AppLoadingFallback";
import AppLayout from "./components/layout/AppLayout";
import ConsultarRotasScreen from "./screens/rotas/consultarRotas";
import MapaRotasScreen from "./screens/mapa";
import GastosScreen from "./screens/gastos";

// Telas públicas (Autenticação)
const LoginScreen = lazy(() => import("./screens/login/index"));
const ForgotPasswordScreen = lazy(() => import("./screens/login/esqueciSenha"));
const ResetPasswordScreen = lazy(() => import("./screens/login/redefinirSenha"));
const PerfilUsuarioScreen = lazy(() => import("./screens/perfil/index"));

// Telas autenticadas
const DashboardScreen = lazy(() => import("./screens/dashboard"));
const ConsultarVeiculosScreen = lazy(() => import("./screens/veiculos/consultarVeiculos/index"));
const CadastrarVeiculoScreen = lazy(() => import("./screens/veiculos/cadastrarVeiculos/index"));

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("auth_token") || localStorage.getItem("token");
  });

  const handleLoginSucesso = (novoToken: string) => {
    localStorage.setItem("auth_token", novoToken);
    setToken(novoToken);
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
  };

  // Se NÃO estiver logado: rotas públicas disponíveis
  if (!token) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginScreen onLoginSucesso={handleLoginSucesso} />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          
          {/* Rota que casa exatamente com a URL enviada no e-mail pelo seu backend */}
          <Route path="/redefinir-senha" element={<ResetPasswordScreen />} />

          {/* Qualquer outra rota vai para /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Se ESTIVER logado: rotas do painel
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <Routes>
        <Route element={<AppLayout onLogout={handleLogout} />}>
          <Route path="/home" element={<DashboardScreen />} />
          <Route path="/perfil" element={<PerfilUsuarioScreen />} />
          <Route path="/veiculos" element={<ConsultarVeiculosScreen onLogout={handleLogout} />} />
          <Route path="/veiculos/cadastro" element={<CadastrarVeiculoScreen />} />
          <Route path="/rotas" element={<ConsultarRotasScreen />} />
          <Route path="/mapa" element={<MapaRotasScreen />} />
          <Route path="/gastos" element={<GastosScreen />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}