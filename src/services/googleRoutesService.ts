import { ResultadoRotaRealGoogle } from "../screens/mapa";

export async function consultarRotaGoogleAPI(
  origem: string,
  destino: string,
  evitarPedagios: boolean,
  chaveApi?: string
): Promise<ResultadoRotaRealGoogle> {
  const apiKey = chaveApi || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    throw new Error("A variável VITE_GOOGLE_MAPS_API_KEY não foi encontrada.");
  }

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const requestBody = {
    origin: { address: origem },
    destination: { address: destino },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    routeModifiers: {
      avoidTolls: evitarPedagios,
      vehicleInfo: {
        emissionType: "GASOLINE",
      },
      tollPasses: [
        "BR_SEM_PARAR",
        "BR_CONECTCAR",
        "BR_VELOE",
        "BR_MOVE_MAIS",
        "BR_TAGGY",
        "BR_AUTO_EXPRESO"
      ],
    },
    extraComputations: ["TOLLS"],
    languageCode: "pt-BR",
    units: "METRIC",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo,routes.legs.travelAdvisory.tollInfo",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Erro status ${response.status}`);
  }

  const rota = data.routes?.[0];
  if (!rota) {
    throw new Error("Nenhuma rota retornada.");
  }

  const duracaoSegundos = parseInt((rota.duration || "0s").replace("s", ""), 10);
  const horas = Math.floor(duracaoSegundos / 3600);
  const minutos = Math.floor((duracaoSegundos % 3600) / 60);
  const duracaoTexto = horas > 0 ? `${horas}h ${minutos} min` : `${minutos} min`;

  const distanciaMetros = rota.distanceMeters || 0;
  const distanciaKm = Math.round((distanciaMetros / 1000) * 10) / 10;

  // Extração do valor real calculado pelo Google
  let custoTotalPedagio = 0;
  let moeda = "BRL";
  const tollData = rota.travelAdvisory?.tollInfo || rota.legs?.[0]?.travelAdvisory?.tollInfo;

  if (tollData?.estimatedPrice && tollData.estimatedPrice.length > 0) {
    const precoObj = tollData.estimatedPrice[0];
    const units = parseInt(precoObj.units || "0", 10);
    const nanos = (precoObj.nanos || 0) / 1e9;
    custoTotalPedagio = units + nanos;
    moeda = precoObj.currencyCode || "BRL";
  }

  return {
    distanciaMetros,
    duracaoSegundos,
    duracaoTexto,
    distanciaKm,
    tollInfo: {
      temPedagio: custoTotalPedagio > 0,
      custoTotalPedagio: Math.round(custoTotalPedagio * 100) / 100,
      moeda,
    },
    pracasPedagio: [],
    polylineEncoded: rota.polyline?.encodedPolyline || "",
  };
}