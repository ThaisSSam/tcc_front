import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker, type Libraries } from "@react-google-maps/api";
import { Bell, Settings, Car, Route, UserIcon, ExternalLink, Navigation } from "lucide-react";
import { veiculosEndpoints } from "../services/endpoints/veiculos";
import { rotasEndpoints } from "../services/endpoints/rotas";

const GOOGLE_MAPS_LIBRARIES: Libraries = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "0.5rem",
};

// Localização padrão (Birigui - SP) caso o usuário não permita GPS
const localizacaoPadrao = {
  lat: -21.2889,
  lng: -50.3408,
};

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#131b2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#131b2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7486a6" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#222f4c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1b253d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2b3b5e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#090d16" }] },
];

export default function DashboardScreen() {
  const navigate = useNavigate();
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: "pt-BR",
    region: "BR",
  });

  const [posicaoAtual, setPosicaoAtual] = useState<{ lat: number; lng: number }>(localizacaoPadrao);
  const [gpsAtivo, setGpsAtivo] = useState(false);
  
  // Estados para os dados reais dos cards
  const [totalVeiculos, setTotalVeiculos] = useState<number | null>(null);
  const [totalRotas, setTotalRotas] = useState<number | null>(null);

  // Obtém a localização GPS em tempo real do navegador do usuário
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPosicaoAtual({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGpsAtivo(true);
        },
        () => {
          setGpsAtivo(false);
        }
      );
    }
  }, []);

  // Busca os totais reais no backend de forma independente
  useEffect(() => {
    const carregarTotais = async () => {
      const [resVeiculos, resRotas] = await Promise.allSettled([
        veiculosEndpoints.listar(),
        rotasEndpoints.listar(),
      ]);

      // Tratamento dos veículos
      if (resVeiculos.status === "fulfilled") {
        const payload: any = resVeiculos.value?.data;
        if (Array.isArray(payload)) {
          setTotalVeiculos(payload.length);
        } else if (Array.isArray(payload?.data)) {
          setTotalVeiculos(payload.data.length);
        } else {
          setTotalVeiculos(0);
        }
      } else {
        console.warn("Falha ao consultar veículos:", resVeiculos.reason);
        setTotalVeiculos(null);
      }

      // Tratamento das rotas
      if (resRotas.status === "fulfilled") {
        const payload: any = resRotas.value?.data;
        if (Array.isArray(payload)) {
          setTotalRotas(payload.length);
        } else if (Array.isArray(payload?.data)) {
          setTotalRotas(payload.data.length);
        } else {
          setTotalRotas(0);
        }
      } else {
        console.warn("Falha ao consultar rotas:", resRotas.reason);
        setTotalRotas(null);
      }
    };

    carregarTotais();
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-y-auto font-sans">
      <header className="flex justify-between items-center border-b border-slate-800 bg-[#0f172a] px-6 py-5 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-100">
          Calculadora de trajeto
        </h1>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Última atualização: agora mesmo</span>

          {/* BOTÃO DO PERFIL NO CABEÇALHO */}
          <button
            type="button"
            onClick={() => navigate("/perfil")}
            title="Meu Perfil"
            className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <UserIcon size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 bg-[#090d16]">
        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => navigate("/veiculos")}
            className="border border-slate-800 rounded-xl p-5 bg-[#131b2e] flex flex-col justify-between h-32 relative hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Veículos</span>
              <Car size={16} className="text-blue-600/60" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-100">
                {totalVeiculos !== null ? totalVeiculos : "..."}
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">Veículos cadastrados na garagem</p>
            </div>
          </div>

          <div 
            onClick={() => navigate("/rotas")}
            className="border border-slate-800 rounded-xl p-5 bg-[#131b2e] flex flex-col justify-between h-32 relative hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Rotas</span>
              <Route size={16} className="text-slate-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-emerald-400">
                {totalRotas !== null ? totalRotas : "..."}
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">Simulações realizadas</p>
            </div>
          </div>
        </div>

        {/* MAPA INTERATIVO NO DASHBOARD (CLICÁVEL) */}
        <div 
          onClick={() => navigate("/mapa")}
          className="border border-slate-800 rounded-xl p-5 bg-[#131b2e] hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mapa em Tempo Real
              </h3>
              {gpsAtivo && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                  <Navigation size={10} className="animate-pulse" /> Localização Atual
                </span>
              )}
            </div>
            <span className="text-xs text-blue-400 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-all font-medium">
              Abrir Comparador de Rotas <ExternalLink size={13} />
            </span>
          </div>

          <div className="w-full h-86 rounded-lg overflow-hidden relative border border-slate-800/80 pointer-events-none">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={posicaoAtual}
                zoom={13}
                options={{
                  styles: darkMapStyle,
                  disableDefaultUI: true,
                  zoomControl: false,
                  gestureHandling: "none",
                }}
              >
                <Marker
                  position={posicaoAtual}
                  icon={{
                    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  }}
                />
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-500 text-xs">
                Carregando mapa...
              </div>
            )}
            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-all" />
          </div>
        </div>
      </main>
    </div>
  );
}
