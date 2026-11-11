import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import loginEndpoints from "./services/endpoints/login";
import AppLoadingFallback from "./components/layout/AppLoadingFallback";
import AppLayout from "./components/layout/AppLayout";
import ConsultarRotasScreen from "./screens/rotas/consultarRotas";
import MapaRotasScreen from "./screens/mapa";
import GastosScreen from "./screens/gastos";

const LoginScreen = lazy(() => import("./screens/login/index"));
const ForgotPasswordScreen = lazy(() => import("./screens/login/esqueciSenha"));
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

  const handleLogout = async () => {
    await loginEndpoints.executarLogout();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setToken(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  if (!token) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginScreen onLoginSucesso={handleLoginSucesso} />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <Routes>
        <Route element={<AppLayout onLogout={handleLogout} />}>
          <Route path="/home" element={<DashboardScreen />} />
          
          <Route path="/veiculos" element={<ConsultarVeiculosScreen />} />
          <Route path="/veiculos/cadastro" element={<CadastrarVeiculoScreen />} />
          
          <Route path="/rotas" element={<ConsultarRotasScreen />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/mapa" element={<MapaRotasScreen />} />
          <Route path="/gastos" element={<GastosScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
