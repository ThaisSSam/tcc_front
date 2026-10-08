import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Autocomplete,
  Marker,
  InfoWindow,
  type Libraries,
} from "@react-google-maps/api";
import {
  buscarPrecosCombustivelAPI,
  type TipoCombustivel,
  type PrecoCombustivelDetectado,
} from "../../services/combustivelService";
import { veiculosEndpoints, type VeiculoDTO } from "../../services/endpoints/veiculos";
import { rotasEndpoints } from "../../services/endpoints/rotas";
import {
  MapPin,
  Fuel,
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  History,
  MousePointerClick,
  Trash2,
  BookmarkPlus,
  CheckCircle2,
  Calculator,
  X,
  Coins,
  Navigation,
} from "lucide-react";

export type TipoCombustivelEstendido = "gasolina" | "etanol" | "diesel";

export interface VeiculoAPI {
  id: string;
  apelido: string;
  marca: string;
  modelo: string;
  tipoPropulsao: "combustao" | "eletrico" | "hibrido";
  consumoKml?: number | null;
  consumoKwh100km?: number | null;
}

interface RotaHistorico {
  label: string;
  origem: string;
  destino: string;
}

export interface PontoPedagioOSM {
  id: string;
  nome: string;
  posicao: google.maps.LatLngLiteral;
  tarifa: number;
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

const centerDefault = {
  lat: -21.2889,
  lng: -50.3408,
};

const GOOGLE_MAPS_LIBRARIES: Libraries = ["places"];
const LIMITE_DIARIO_APP = 50;

const SUGESTOES_PADRAO: RotaHistorico[] = [
  { label: "Birigui → São Paulo", origem: "Birigui, SP", destino: "São Paulo, SP" },
  { label: "Campinas → Santos", origem: "Campinas, SP", destino: "Santos, SP" },
  { label: "Ribeirão Preto → SP", origem: "Ribeirão Preto, SP", destino: "São Paulo, SP" },
];

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#131b2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#131b2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7486a6" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#222f4c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1b253d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2b3b5e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#090d16" }] },
];

// Cálculo geodésico Haversine
function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pracaPertenceAoTrajeto(
  posPraca: { lat: number; lng: number },
  pontosDaRota: google.maps.LatLng[],
  toleranciaMetros: number = 250
): boolean {
  for (let i = 0; i < pontosDaRota.length - 1; i++) {
    const p1 = pontosDaRota[i];
    const p2 = pontosDaRota[i + 1];

    const d1 = calcularDistanciaMetros(posPraca.lat, posPraca.lng, p1.lat(), p1.lng());
    const d2 = calcularDistanciaMetros(posPraca.lat, posPraca.lng, p2.lat(), p2.lng());
    const compSegmento = calcularDistanciaMetros(p1.lat(), p1.lng(), p2.lat(), p2.lng());

    if (d1 <= toleranciaMetros || d2 <= toleranciaMetros) return true;

    if (compSegmento > 0) {
      const s = (d1 + d2 + compSegmento) / 2;
      const area = Math.sqrt(Math.max(0, s * (s - d1) * (s - d2) * (s - compSegmento)));
      const distanciaPerpendicular = (2 * area) / compSegmento;

      if (distanciaPerpendicular <= toleranciaMetros && d1 < compSegmento + 30 && d2 < compSegmento + 30) {
        return true;
      }
    }
  }
  return false;
}

// Extrai a tarifa real informada nas tags do OSM sem valores mockados
function extrairTarifaOSM(tags: any): number {
  if (!tags) return 0;
  const campos = [
    tags["charge"],
    tags["charge:motorcar"],
    tags["charge:car"],
    tags["toll:motorcar"],
    tags["toll:car"],
    tags["fee:conditional"],
    tags["toll:charge"],
  ];
  for (const c of campos) {
    if (!c) continue;
    const match = String(c).replace("R$", "").replace("BRL", "").replace(",", ".").match(/\d+(\.\d+)?/);
    if (match) {
      const val = parseFloat(match[0]);
      if (val > 0) return val;
    }
  }
  return 0;
}

async function buscarPedagiosOSMNoTrajeto(
  rota: google.maps.DirectionsRoute
): Promise<PontoPedagioOSM[]> {
  try {
    if (!rota.bounds || !rota.overview_path) return [];

    const sw = rota.bounds.getSouthWest();
    const ne = rota.bounds.getNorthEast();

    const minLat = sw.lat() - 0.02;
    const minLon = sw.lng() - 0.02;
    const maxLat = ne.lat() + 0.02;
    const maxLon = ne.lng() + 0.02;

    const query = `
      [out:json][timeout:25];
      (
        node["barrier"="toll_booth"](${minLat},${minLon},${maxLat},${maxLon});
        node["highway"="toll_gantry"](${minLat},${minLon},${maxLat},${maxLon});
        way["barrier"="toll_booth"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out center tags;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.elements) return [];

    const caminhoGoogle = rota.overview_path;
    const pracasCandidatas: PontoPedagioOSM[] = [];

    data.elements.forEach((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) return;

      const pos = { lat, lng: lon };

      if (pracaPertenceAoTrajeto(pos, caminhoGoogle, 250)) {
        const tarifaFinal = extrairTarifaOSM(el.tags);
        const nomePraca = el.tags?.name || el.tags?.operator || "Praça de Pedágio";

        pracasCandidatas.push({
          id: `osm-${el.id}`,
          nome: nomePraca,
          posicao: pos,
          tarifa: tarifaFinal,
        });
      }
    });

    const pracasUnicas: PontoPedagioOSM[] = [];
    pracasCandidatas.forEach((p) => {
      const duplicada = pracasUnicas.some((existente) => {
        const dist = calcularDistanciaMetros(
          p.posicao.lat,
          p.posicao.lng,
          existente.posicao.lat,
          existente.posicao.lng
        );
        return dist < 1800;
      });

      if (!duplicada) {
        pracasUnicas.push(p);
      }
    });

    pracasUnicas.sort((a, b) => {
      const distA = calcularDistanciaMetros(a.posicao.lat, a.posicao.lng, caminhoGoogle[0].lat(), caminhoGoogle[0].lng());
      const distB = calcularDistanciaMetros(b.posicao.lat, b.posicao.lng, caminhoGoogle[0].lat(), caminhoGoogle[0].lng());
      return distA - distB;
    });

    return pracasUnicas.map((p, idx) => ({
      ...p,
      nome: p.nome.includes("km") || p.nome.includes("#") ? p.nome : `${p.nome} #${idx + 1}`,
    }));
  } catch (error) {
    console.warn("Aviso na consulta da Overpass API:", error);
    return [];
  }
}

export default function MapaRotasScreen() {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: "pt-BR",
    region: "BR",
  });

  const [veiculos, setVeiculos] = useState<VeiculoAPI[]>([]);
  const [carregandoVeiculos, setCarregandoVeiculos] = useState(true);
  const [veiculoId, setVeiculoId] = useState<string>("");

  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [origemCoords, setOrigemCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<google.maps.LatLngLiteral | null>(null);

  // Tipos de combustível suportados
  const [tipoCombustivel, setTipoCombustivel] = useState<TipoCombustivelEstendido>("gasolina");
  const [precoCombustivel, setPrecoCombustivel] = useState<number>(0);
  const [precoEnergia, setPrecoEnergia] = useState<number>(0);
  const [consumoManual, setConsumoManual] = useState<number>(0);
  const [infoPreco, setInfoPreco] = useState<PrecoCombustivelDetectado | null>(null);
  const [carregandoPrecoAPI, setCarregandoPrecoAPI] = useState<boolean>(false);

  const [rotasRecentes, setRotasRecentes] = useState<RotaHistorico[]>([]);

  const [rotaPrincipalResponse, setRotaPrincipalResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [rotaSemPedagioResponse, setRotaSemPedagioResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [rotaSelecionadaExibicao, setRotaSelecionadaExibicao] = useState<"principal" | "sem_pedagio">("principal");

  const [pontosPedagio, setPontosPedagio] = useState<PontoPedagioOSM[]>([]);
  const [pedagioSelecionado, setPedagioSelecionado] = useState<PontoPedagioOSM | null>(null);

  const [carregando, setCarregando] = useState(false);
  const [erroRota, setErroRota] = useState<string | null>(null);
  const [salvandoRota, setSalvandoRota] = useState(false);
  const [sucessoSalvar, setSucessoSalvar] = useState<string | null>(null);
  const [modalCalculoAberto, setModalCalculoAberto] = useState(false);
  const [requisicoesHoje, setRequisicoesHoje] = useState<number>(0);

  const autocompleteOrigemRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteDestinoRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Carrega veículos salvos no perfil/backend (UC01)
  useEffect(() => {
    async function carregarListaVeiculos() {
      try {
        setCarregandoVeiculos(true);
        const res = await veiculosEndpoints.listar();
        if (res?.data && res.data.length > 0) {
          const veiculosFormatados: VeiculoAPI[] = res.data
            .filter((item: VeiculoDTO): item is VeiculoDTO & { id: string } => Boolean(item.id))
            .map((item: any) => ({
              id: String(item.id),
              apelido: item.apelido || `${item.marca} ${item.modelo}`,
              marca: item.marca,
              modelo: item.modelo,
              tipoPropulsao: (item.tipoPropulsao ?? item.tipo_propulsao ?? "combustao") as "combustao" | "eletrico" | "hibrido",
              consumoKml: item.consumoKml ?? item.consumo_kml ?? null,
              consumoKwh100km: item.consumoKwh100km ?? item.consumo_kwh_100km ?? null,
            }));

          setVeiculos(veiculosFormatados);
          if (veiculosFormatados.length > 0) {
            setVeiculoId(veiculosFormatados[0].id);
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar veículos:", err);
      } finally {
        setCarregandoVeiculos(false);
      }
    }

    carregarListaVeiculos();
  }, []);

  const veiculoAtual = useMemo(() => {
    return veiculos.find((v) => v.id === veiculoId) || null;
  }, [veiculos, veiculoId]);

  const extrairUF = (textoEndereco: string): string => {
    if (!textoEndereco) return "sp";
    const match = textoEndereco.match(/\b([A-Za-z]{2})\b(?=[^A-Za-z]*$|[,\s]+Brasil)/i);
    return match ? match[1].toLowerCase() : "sp";
  };

  // Atualização automática via API de combustíveis (UC03)
  const sincronizarPrecoCombustivel = useCallback(
    async (tipo: TipoCombustivelEstendido) => {
      setCarregandoPrecoAPI(true);
      const uf = extrairUF(origem);
      try {
        const resultado = await buscarPrecosCombustivelAPI(uf, tipo === "etanol" ? ("etanol" as any) : tipo);
        if (resultado && resultado.preco > 0) {
          setInfoPreco(resultado);
          setPrecoCombustivel(resultado.preco);
        }
      } catch (err) {
        console.warn("Falha na sincronização via API de combustível:", err);
      } finally {
        setCarregandoPrecoAPI(false);
      }
    },
    [origem]
  );

  useEffect(() => {
    if (!veiculoAtual || veiculoAtual.tipoPropulsao === "combustao" || veiculoAtual.tipoPropulsao === "hibrido") {
      sincronizarPrecoCombustivel(tipoCombustivel);
    }
  }, [tipoCombustivel, veiculoAtual, sincronizarPrecoCombustivel]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !window.google) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        let enderecoFormatado = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
          enderecoFormatado = results[0].formatted_address;
        }

        if (!origem.trim()) {
          setOrigem(enderecoFormatado);
          setOrigemCoords({ lat, lng });
        } else {
          setDestino(enderecoFormatado);
          setDestinoCoords({ lat, lng });
        }
      });
    },
    [origem]
  );

  const limparPontos = () => {
    setOrigem("");
    setDestino("");
    setOrigemCoords(null);
    setDestinoCoords(null);
    setRotaPrincipalResponse(null);
    setRotaSemPedagioResponse(null);
    setPontosPedagio([]);
    setErroRota(null);
    setSucessoSalvar(null);
  };

  // Cálculo matemático: Cd (deslocamento) + Cp (pedágios) = Ct
  const calcularCustoRota = useCallback(
    (distanciaMetros: number, pracas: PontoPedagioOSM[], ehComPedagio: boolean) => {
      const distanciaKm = distanciaMetros / 1000;
      let consumoTotalUnidades = 0;
      let custoDeslocamento = 0;

      const consumoAplicado = veiculoAtual
        ? (veiculoAtual.tipoPropulsao === "eletrico"
            ? Number(veiculoAtual.consumoKwh100km) || 0
            : Number(veiculoAtual.consumoKml) || 0)
        : consumoManual;

      if (consumoAplicado > 0) {
        if (!veiculoAtual || veiculoAtual.tipoPropulsao === "combustao" || veiculoAtual.tipoPropulsao === "hibrido") {
          consumoTotalUnidades = distanciaKm / consumoAplicado;
          custoDeslocamento = consumoTotalUnidades * precoCombustivel;
        } else {
          consumoTotalUnidades = (distanciaKm * consumoAplicado) / 100;
          custoDeslocamento = consumoTotalUnidades * precoEnergia;
        }
      }

      const totalPedagios = ehComPedagio
        ? pracas.reduce((acc, p) => acc + p.tarifa, 0)
        : 0;

      const custoTotal = custoDeslocamento + totalPedagios;

      return {
        distanciaKm,
        consumoTotalUnidades,
        custoDeslocamento,
        pedagioEstimado: totalPedagios,
        custoTotal,
      };
    },
    [veiculoAtual, consumoManual, precoCombustivel, precoEnergia]
  );

  const handleTracarRotasComPontos = useCallback(
    async (pontoOrigem: string, pontoDestino: string) => {
      if (!pontoOrigem.trim() || !pontoDestino.trim() || !isLoaded || !window.google) return;

      setCarregando(true);
      setErroRota(null);
      setSucessoSalvar(null);

      const directionsService = new window.google.maps.DirectionsService();

      const reqPrincipal: google.maps.DirectionsRequest = {
        origin: pontoOrigem,
        destination: pontoDestino,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        avoidTolls: false,
      };

      const reqSemPedagio: google.maps.DirectionsRequest = {
        origin: pontoOrigem,
        destination: pontoDestino,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        avoidTolls: true,
      };

      try {
        const [resPrincipal, resSemPedagio] = await Promise.all([
          directionsService.route(reqPrincipal).catch(() => null),
          directionsService.route(reqSemPedagio).catch(() => null),
        ]);

        if (!resPrincipal || !resPrincipal.routes.length) {
          setErroRota("Não foi possível encontrar uma rota no Google Maps.");
          return;
        }

        const rota = resPrincipal.routes[0];
        let pracasOSM: PontoPedagioOSM[] = [];

        if (rota) {
          pracasOSM = await buscarPedagiosOSMNoTrajeto(rota);
        }

        setRotaPrincipalResponse(resPrincipal);
        setRotaSemPedagioResponse(resSemPedagio);
        setPontosPedagio(pracasOSM);
        setRotaSelecionadaExibicao("principal");
      } catch (err: any) {
        setErroRota(err.message || "Erro na consulta integrada de rotas.");
      } finally {
        setCarregando(false);
      }
    },
    [isLoaded]
  );

  const handleTracarRotas = () => {
    handleTracarRotasComPontos(origem, destino);
  };

  const onOrigemPlaceChanged = () => {
    if (autocompleteOrigemRef.current) {
      const place = autocompleteOrigemRef.current.getPlace();
      setOrigem(place.formatted_address || place.name || "");
      if (place.geometry?.location) {
        setOrigemCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    }
  };

  const onDestinoPlaceChanged = () => {
    if (autocompleteDestinoRef.current) {
      const place = autocompleteDestinoRef.current.getPlace();
      setDestino(place.formatted_address || place.name || "");
      if (place.geometry?.location) {
        setDestinoCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    }
  };

  const dadosRotaPrincipal = useMemo(() => {
    if (!rotaPrincipalResponse?.routes[0]?.legs[0]) return null;
    const leg = rotaPrincipalResponse.routes[0].legs[0];
    const calculos = calcularCustoRota(leg.distance?.value || 0, pontosPedagio, true);
    return {
      duracao: leg.duration?.text || "",
      ...calculos,
    };
  }, [rotaPrincipalResponse, pontosPedagio, calcularCustoRota]);

  const dadosRotaSemPedagio = useMemo(() => {
    if (!rotaSemPedagioResponse?.routes[0]?.legs[0]) return null;
    const leg = rotaSemPedagioResponse.routes[0].legs[0];
    const calculos = calcularCustoRota(leg.distance?.value || 0, [], false);
    return {
      duracao: leg.duration?.text || "",
      ...calculos,
    };
  }, [rotaSemPedagioResponse, calcularCustoRota]);

  const rotaAtivaCalculada = useMemo(() => {
    return rotaSelecionadaExibicao === "principal" ? dadosRotaPrincipal : dadosRotaSemPedagio;
  }, [rotaSelecionadaExibicao, dadosRotaPrincipal, dadosRotaSemPedagio]);

  const comparativo = useMemo(() => {
    if (!dadosRotaPrincipal || !dadosRotaSemPedagio) return null;
    const diferencaTotal = dadosRotaPrincipal.custoTotal - dadosRotaSemPedagio.custoTotal;
    const maisEconomica = diferencaTotal >= 0 ? "sem_pedagio" : "principal";
    const valorEconomizado = Math.abs(diferencaTotal);

    return { maisEconomica, valorEconomizado };
  }, [dadosRotaPrincipal, dadosRotaSemPedagio]);

  const converterDuracaoParaSegundos = (duracaoTexto: string): number => {
    let totalSegundos = 0;
    const horasMatch = duracaoTexto.match(/(\d+)\s*(?:h|hora|horas)/i);
    const minutosMatch = duracaoTexto.match(/(\d+)\s*(?:m|min|minuto|minutos)/i);
    if (horasMatch) totalSegundos += parseInt(horasMatch[1], 10) * 3600;
    if (minutosMatch) totalSegundos += parseInt(minutosMatch[1], 10) * 60;
    return totalSegundos || 3600;
  };

  const handleSalvarRota = async () => {
    if (!rotaAtivaCalculada || !origem.trim() || !destino.trim()) return;

    try {
      setSalvandoRota(true);
      const duracaoSegundos = converterDuracaoParaSegundos(rotaAtivaCalculada.duracao);
      const precoRef = (!veiculoAtual || veiculoAtual.tipoPropulsao === "combustao") ? precoCombustivel : precoEnergia;

      await rotasEndpoints.salvarSimulacao({
        veiculo_id: veiculoAtual?.id || "",
        origem_endereco: origem,
        destino_endereco: destino,
        distancia_km: Number(rotaAtivaCalculada.distanciaKm.toFixed(2)),
        duracao_segundos: duracaoSegundos,
        preco_referencia: Number(precoRef.toFixed(2)),
        custo_energia_combustivel: Number(rotaAtivaCalculada.custoDeslocamento.toFixed(2)),
        custo_pedagio: Number(rotaAtivaCalculada.pedagioEstimado.toFixed(2)),
        custo_total: Number(rotaAtivaCalculada.custoTotal.toFixed(2)),
        tipo_rota: rotaSelecionadaExibicao,
        provedor_rota: "Google Maps + OpenStreetMap",
        dados_rota_json: {
          origemCoords,
          destinoCoords,
          tipoPropulsao: veiculoAtual?.tipoPropulsao || "combustao",
          pracasPedagio: rotaSelecionadaExibicao === "principal" ? pontosPedagio : [],
        },
      });

      setSucessoSalvar(`Rota salva com sucesso no banco de dados!`);
      setTimeout(() => setSucessoSalvar(null), 4000);
    } catch (err: any) {
      setErroRota(err.message || "Erro ao salvar a rota no banco de dados.");
    } finally {
      setSalvandoRota(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-8 text-center text-rose-400 bg-[#0f172a] h-full flex flex-col items-center justify-center">
        <p className="font-bold text-lg">Erro ao carregar o Google Maps</p>
        <p className="text-xs text-slate-400 mt-1">Verifique a chave de API e a conexão.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full w-full min-h-0 font-sans bg-[#090d16] overflow-y-auto lg:overflow-hidden relative">
      {/* HEADER */}
      <header className="flex justify-between items-center border-b border-slate-800 bg-[#0f172a] px-6 py-3.5 sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-md">
            <MapPin size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg text-slate-100 leading-tight">
              Mapa & Comparador de Rotas
            </h1>
            <p className="text-[11px] text-slate-500">
              Roteamento Google Maps com detecção de pedágios OpenStreetMap
            </p>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* PAINEL LATERAL ESQUERDO */}
        <div className="w-full lg:w-[440px] bg-[#0f172a] border-r border-slate-800 flex flex-col overflow-y-auto max-h-[50vh] lg:max-h-full p-5 space-y-4 flex-shrink-0 z-10 shadow-2xl">
          <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-xl space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Trajeto
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                  <MousePointerClick size={11} /> Clique no mapa
                </span>
                {(origem || destino) && (
                  <button
                    type="button"
                    onClick={limparPontos}
                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 size={11} /> Limpar
                  </button>
                )}
              </div>
            </div>

            {/* INPUTS AUTOCOMPLETE */}
            <div className="space-y-2 pt-1">
              <div className="relative">
                <span className="absolute left-3 top-3 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 z-10" />
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      autocomplete.setComponentRestrictions({ country: "br" });
                      autocompleteOrigemRef.current = autocomplete;
                    }}
                    onPlaceChanged={onOrigemPlaceChanged}
                  >
                    <input
                      type="text"
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value)}
                      placeholder="Origem (ou clique no mapa)..."
                      className="w-full pl-8 pr-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    placeholder="Cidade de origem..."
                    className="w-full pl-8 pr-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-3 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 z-10" />
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      autocomplete.setComponentRestrictions({ country: "br" });
                      autocompleteDestinoRef.current = autocomplete;
                    }}
                    onPlaceChanged={onDestinoPlaceChanged}
                  >
                    <input
                      type="text"
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      placeholder="Destino (ou clique no mapa)..."
                      className="w-full pl-8 pr-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Cidade de destino..."
                    className="w-full pl-8 pr-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                )}
              </div>
            </div>

            {/* SELEÇÃO DO VEÍCULO DA GARAGEM (UC01) */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Veículo da Garagem
              </label>
              {carregandoVeiculos ? (
                <div className="text-xs text-slate-500 py-1">Carregando veículos cadastrados...</div>
              ) : veiculos.length === 0 ? (
                <div className="space-y-1.5 py-1">
                  <div className="text-[11px] text-slate-500">Nenhum veículo cadastrado na garagem.</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Consumo Médio (km/l):</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 12.0"
                      value={consumoManual || ""}
                      onChange={(e) => setConsumoManual(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-[#090d16] border border-slate-800 rounded text-right font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                  {veiculos.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVeiculoId(v.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                        veiculoId === v.id
                          ? "bg-blue-600/10 border-blue-500 text-blue-300 font-semibold"
                          : "bg-[#090d16] border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {v.tipoPropulsao === "combustao" ? (
                          <Fuel size={14} className="text-amber-400" />
                        ) : (
                          <Zap size={14} className="text-emerald-400" />
                        )}
                        <span>{v.apelido}</span>
                      </div>
                      <span className="font-mono text-[11px]">
                        {v.tipoPropulsao === "combustao"
                          ? `${v.consumoKml ?? 0} km/l`
                          : `${v.consumoKwh100km ?? 0} kWh/100km`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SELEÇÃO DO TIPO DE PROPULSÃO / COMBUSTÍVEL */}
            {(!veiculoAtual || veiculoAtual.tipoPropulsao === "combustao" || veiculoAtual.tipoPropulsao === "hibrido") ? (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Fuel size={12} className="text-amber-400" /> Preço do Combustível
                  </label>
                  {carregandoPrecoAPI ? (
                    <span className="text-[10px] text-blue-400 flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" /> Atualizando...
                    </span>
                  ) : infoPreco ? (
                    <span className="text-[9px] text-emerald-400 font-mono truncate max-w-[170px]">
                      {infoPreco.postoNome} ({infoPreco.dataAtualizacao})
                    </span>
                  ) : null}
                </div>

                {/* Seletores: Gasolina, Etanol (Álcool), Diesel */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(["gasolina", "etanol", "diesel"] as TipoCombustivelEstendido[]).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoCombustivel(tipo)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold uppercase transition-all cursor-pointer border ${
                        tipoCombustivel === tipo
                          ? "bg-amber-500/10 border-amber-500 text-amber-300"
                          : "bg-[#090d16] border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {tipo === "etanol" ? "Álcool" : tipo}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">Preço / Litro:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={precoCombustivel || ""}
                      onChange={(e) => setPrecoCombustivel(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-[#090d16] border border-slate-800 rounded text-right font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={12} className="text-emerald-400" /> Tarifa de Eletricidade
                  </label>
                  <span className="text-[9px] text-emerald-400 font-mono">Distribuidora Local</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Preço da Recarga (R$/kWh):</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={precoEnergia || ""}
                      onChange={(e) => setPrecoEnergia(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-[#090d16] border border-slate-800 rounded text-right font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleTracarRotas}
              disabled={carregando || !origem.trim() || !destino.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer mt-2"
            >
              {carregando ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Calcular & Comparar Trajetos
            </button>
          </div>

          {erroRota && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{erroRota}</span>
            </div>
          )}

          {sucessoSalvar && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              <span>{sucessoSalvar}</span>
            </div>
          )}

          {/* LISTAGEM DOS PEDÁGIOS DETECTADOS */}
          {rotaSelecionadaExibicao === "principal" && pontosPedagio.length > 0 && (
            <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} /> Pedágios OSM ({pontosPedagio.length})
                </span>
                <span className="text-xs font-mono font-bold text-slate-100">
                  Total: R$ {dadosRotaPrincipal?.pedagioEstimado.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {pontosPedagio.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => setPedagioSelecionado(p)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between ${
                      pedagioSelecionado?.id === p.id
                        ? "bg-amber-950/30 border-amber-500"
                        : "bg-[#090d16] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <strong className="text-slate-100 font-semibold">{p.nome}</strong>
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Navigation size={10} className="text-slate-500" />
                        {p.posicao.lat.toFixed(4)}, {p.posicao.lng.toFixed(4)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      R$ {p.tarifa.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEMORIAL E COMPARATIVO (UC04) */}
          {dadosRotaPrincipal && (
            <div className="space-y-2.5 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Alternativas de Trajeto
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalCalculoAberto(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    <Calculator size={13} />
                    <span>Memorial</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSalvarRota}
                    disabled={salvandoRota}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    <BookmarkPlus size={13} />
                    <span>{salvandoRota ? "Salvando..." : "Salvar"}</span>
                  </button>
                </div>
              </div>

              {/* ROTA PRINCIPAL */}
              <div
                onClick={() => setRotaSelecionadaExibicao("principal")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  rotaSelecionadaExibicao === "principal"
                    ? "bg-blue-950/30 border-blue-500 shadow-md shadow-blue-500/10"
                    : "bg-[#131b2e] border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-100">Rota Principal (Com Pedágio)</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {dadosRotaPrincipal.duracao} • {dadosRotaPrincipal.distanciaKm.toFixed(1)} km
                    </p>
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-100">
                    R$ {dadosRotaPrincipal.custoTotal.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80 font-mono text-slate-400">
                  <div className="text-emerald-400">
                    Deslocamento: R$ {dadosRotaPrincipal.custoDeslocamento.toFixed(2)}
                  </div>
                  <div className="text-right text-amber-400">
                    Pedágios ({pontosPedagio.length}): R$ {dadosRotaPrincipal.pedagioEstimado.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* ROTA SEM PEDÁGIO */}
              {dadosRotaSemPedagio && (
                <div
                  onClick={() => setRotaSelecionadaExibicao("sem_pedagio")}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    rotaSelecionadaExibicao === "sem_pedagio"
                      ? "bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-500/10"
                      : "bg-[#131b2e] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-100">Rota Alternativa (Sem Pedágio)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {dadosRotaSemPedagio.duracao} • {dadosRotaSemPedagio.distanciaKm.toFixed(1)} km
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-100">
                      R$ {dadosRotaSemPedagio.custoTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80 font-mono text-slate-400">
                    <div className="text-emerald-400">
                      Deslocamento: R$ {dadosRotaSemPedagio.custoDeslocamento.toFixed(2)}
                    </div>
                    <div className="text-right text-slate-500 font-sans font-semibold">
                      Pedágio: Isento
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MAPA GOOGLE */}
        <div className="flex-1 h-[450px] lg:h-full min-h-[400px] relative bg-[#090d16]">
          {isLoaded ? (
            <GoogleMap
              onClick={handleMapClick}
              mapContainerStyle={containerStyle}
              center={centerDefault}
              zoom={8}
              options={{
                styles: darkMapStyle,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                draggableCursor: "crosshair",
              }}
            >
              {rotaSelecionadaExibicao === "principal" && rotaPrincipalResponse && (
                <DirectionsRenderer
                  directions={rotaPrincipalResponse}
                  routeIndex={0}
                  options={{
                    suppressMarkers: false,
                    polylineOptions: {
                      strokeColor: "#3b82f6",
                      strokeWeight: 6,
                      strokeOpacity: 0.9,
                      zIndex: 10,
                    },
                  }}
                />
              )}

              {rotaSelecionadaExibicao === "sem_pedagio" && rotaSemPedagioResponse && (
                <DirectionsRenderer
                  directions={rotaSemPedagioResponse}
                  routeIndex={0}
                  options={{
                    suppressMarkers: false,
                    polylineOptions: {
                      strokeColor: "#10b981",
                      strokeWeight: 6,
                      strokeOpacity: 0.9,
                      zIndex: 10,
                    },
                  }}
                />
              )}

              {/* MARCADORES DE PEDÁGIO */}
              {rotaSelecionadaExibicao === "principal" &&
                pontosPedagio.map((pedagio) => (
                  <Marker
                    key={pedagio.id}
                    position={pedagio.posicao}
                    onClick={() => setPedagioSelecionado(pedagio)}
                    icon={{
                      url: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
                    }}
                  />
                ))}

              {pedagioSelecionado && (
                <InfoWindow
                  position={pedagioSelecionado.posicao}
                  onCloseClick={() => setPedagioSelecionado(null)}
                >
                  <div className="p-2.5 text-slate-900 text-xs min-w-[190px]">
                    <strong className="block font-bold text-slate-950 text-xs">{pedagioSelecionado.nome}</strong>
                    <span className="text-[10px] text-slate-600 block mt-0.5">
                      Coord: {pedagioSelecionado.posicao.lat.toFixed(4)}, {pedagioSelecionado.posicao.lng.toFixed(4)}
                    </span>
                    <span className="text-amber-800 font-bold font-mono text-sm mt-1.5 block">
                      Tarifa: R$ {pedagioSelecionado.tarifa.toFixed(2)}
                    </span>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-500 text-xs gap-2">
              <RefreshCw size={16} className="animate-spin text-blue-500" />
              Carregando Google Maps...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}