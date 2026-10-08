export interface PontoPedagioOSM {
  id: string;
  nome: string;
  posicao: [number, number]; // [lat, lng]
}

export interface ResultadoRotaOSM {
  distanciaKm: number;
  duracaoMin: number;
  duracaoTexto: string;
  coordinates: [number, number][];
  pracasPedagio: PontoPedagioOSM[];
  totalPedagioEstimado: number;
}

// 1. Converte endereço em coordenadas via Nominatim
export async function geocodeEnderecoOSM(endereco: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&countrycodes=br&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TCC-PlanejadorViagens/1.0' } });
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch {
    return null;
  }
}

// 2. Busca praças de pedágio dentro de uma caixa delimitadora (bounding box) da rota no OSM
export async function buscarPedagiosOverpass(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
): Promise<PontoPedagioOSM[]> {
  try {
    // Consulta nós marcados como barrier=toll_booth no OpenStreetMap
    const query = `
      [out:json][timeout:15];
      node["barrier"="toll_booth"](${minLat},${minLon},${maxLat},${maxLon});
      out body;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.elements) return [];

    return data.elements.map((el: any, index: number) => ({
      id: String(el.id || index),
      nome: el.tags?.name || el.tags?.operator || `Praça de Pedágio #${index + 1}`,
      posicao: [el.lat, el.lon],
    }));
  } catch (error) {
    console.warn('Erro ao consultar Overpass API:', error);
    return [];
  }
}

// 3. Traça a rota pelo OSRM e cruza com os pedágios
export async function consultarRotaOSM(
  origem: string,
  destino: string
): Promise<ResultadoRotaOSM> {
  const coordOrigem = await geocodeEnderecoOSM(origem);
  const coordDestino = await geocodeEnderecoOSM(destino);

  if (!coordOrigem || !coordDestino) {
    throw new Error('Não foi possível geocodificar as cidades informadas.');
  }

  // OSRM espera formato: longitude,latitude
  const urlOSRM = `https://router.project-osrm.org/route/v1/driving/${coordOrigem[1]},${coordOrigem[0]};${coordDestino[1]},${coordDestino[0]}?overview=full&geometries=geojson`;
  const resOSRM = await fetch(urlOSRM);
  const dataOSRM = await resOSRM.json();

  if (!dataOSRM.routes || dataOSRM.routes.length === 0) {
    throw new Error('Nenhuma rota encontrada para estes pontos no OpenStreetMap.');
  }

  const rota = dataOSRM.routes[0];
  const coordinates: [number, number][] = rota.geometry.coordinates.map(
    ([lon, lat]: [number, number]) => [lat, lon]
  );

  const distanciaKm = Math.round((rota.distance / 1000) * 10) / 10;
  const duracaoMin = Math.round(rota.duration / 60);
  const horas = Math.floor(duracaoMin / 60);
  const mins = duracaoMin % 60;
  const duracaoTexto = horas > 0 ? `${horas}h ${mins} min` : `${mins} min`;

  // Calcula limites geográficos (bounding box) com margem de 0.1 graus
  const lats = coordinates.map((c) => c[0]);
  const lons = coordinates.map((c) => c[1]);
  const minLat = Math.min(...lats) - 0.05;
  const maxLat = Math.max(...lats) + 0.05;
  const minLon = Math.min(...lons) - 0.05;
  const maxLon = Math.max(...lons) + 0.05;

  // Busca as praças de pedágio do OpenStreetMap na área da viagem
  const pracas = await buscarPedagiosOverpass(minLat, minLon, maxLat, maxLon);

  return {
    distanciaKm,
    duracaoMin,
    duracaoTexto,
    coordinates,
    pracasPedagio: pracas,
    totalPedagioEstimado: 0,
  };
}