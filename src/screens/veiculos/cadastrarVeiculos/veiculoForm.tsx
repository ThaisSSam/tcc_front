import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Fuel,
  Zap,
  Leaf,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  Edit3,
  Flame,
  AlertTriangle,
  Lightbulb,
  Truck,
} from 'lucide-react';
import { type Veiculo } from '../consultarVeiculos/table/tableConfig';
import {
  fipeService,
  type VehicleType,
  type FipeMarcaItem,
  type FipeModeloItem,
  type FipeAnoItem,
} from '../../../services/endpoints/catalogoVeiculos';

interface VeiculoFormProps {
  initialData?: Partial<Veiculo> & { quantidadeEixos?: number; categoria?: string };
  isEditing?: boolean;
  onSubmit: (data: any) => void;
  salvando?: boolean;
}

export function VeiculoForm({
  initialData,
  isEditing = false,
  onSubmit,
  salvando = false,
}: VeiculoFormProps) {
  const navigate = useNavigate();

  // Categoria FIPE
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    (initialData?.categoria as VehicleType) || 'carros'
  );

  // Eixos do Caminhão (Padrão: 2 eixos)
  const [quantidadeEixos, setQuantidadeEixos] = useState<number>(
    initialData?.quantidadeEixos || 2
  );

  // Campos Principais
  const [apelido, setApelido] = useState(initialData?.apelido || '');
  const [marcaNome, setMarcaNome] = useState(initialData?.marca || '');
  const [marcaCodigo, setMarcaCodigo] = useState<number | null>(null);

  const [modeloNome, setModeloNome] = useState(initialData?.modelo || '');
  const [modeloCodigo, setModeloCodigo] = useState<string>('');

  const [anoDescricao, setAnoDescricao] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState(
    initialData?.anoFabricacao?.toString() || new Date().getFullYear().toString()
  );

  const [tipoPropulsao, setTipoPropulsao] = useState<'combustao' | 'eletrico' | 'hibrido'>(
    initialData?.tipoPropulsao || 'combustao'
  );
  const [combustivelEspecifico, setCombustivelEspecifico] = useState<string>('Flex');
  const [consumo, setConsumo] = useState(initialData?.consumo?.toString() || '12.0');

  // Listas da FIPE
  const [listaMarcas, setListaMarcas] = useState<FipeMarcaItem[]>([]);
  const [listaModelos, setListaModelos] = useState<FipeModeloItem[]>([]);
  const [listaAnos, setListaAnos] = useState<FipeAnoItem[]>([]);

  // Estados de Carregamento
  const [carregandoMarcas, setCarregandoMarcas] = useState(false);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [carregandoAnos, setCarregandoAnos] = useState(false);
  const [avisoFipeInstavel, setAvisoFipeInstavel] = useState(false);

  const [sugestaoConsumoAtiva, setSugestaoConsumoAtiva] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const dadosHidratadosRef = useRef(false);

  // 1. Carrega Marcas da categoria
  useEffect(() => {
    let ativo = true;
    async function carregarMarcas() {
      setCarregandoMarcas(true);
      try {
        const marcas = await fipeService.listarMarcas(vehicleType);
        if (ativo) setListaMarcas(marcas);
      } catch (err) {
        console.error('Erro ao carregar marcas:', err);
      } finally {
        if (ativo) setCarregandoMarcas(false);
      }
    }
    carregarMarcas();
    return () => {
      ativo = false;
    };
  }, [vehicleType]);

  // 2. Hidratação automática ao EDITAR veículo existente
  useEffect(() => {
    if (!isEditing || !initialData || listaMarcas.length === 0 || dadosHidratadosRef.current) {
      return;
    }

    const veiculo = initialData;

    async function hidratarEdicao() {
      try {
        const marcaAlvo = veiculo.marca?.trim().toLowerCase();
        if (!marcaAlvo) return;

        const marcaAchada = listaMarcas.find(
          (m) => m.nome.trim().toLowerCase() === marcaAlvo
        );

        if (!marcaAchada) return;

        setMarcaCodigo(marcaAchada.valor);
        setCarregandoModelos(true);

        const modelos = await fipeService.listarModelos(vehicleType, marcaAchada.valor);
        setListaModelos(modelos);
        setCarregandoModelos(false);

        const modeloAlvo = veiculo.modelo?.trim().toLowerCase();
        if (!modeloAlvo) return;

        const modeloAchado = modelos.find(
          (m) =>
            m.modelo.trim().toLowerCase() === modeloAlvo ||
            modeloAlvo.includes(m.modelo.trim().toLowerCase()) ||
            m.modelo.trim().toLowerCase().includes(modeloAlvo)
        );

        if (!modeloAchado) return;

        setModeloCodigo(modeloAchado.valor);
        setCarregandoAnos(true);

        const anosRes = await fipeService.listarAnos(vehicleType, marcaAchada.valor, modeloAchado.valor);
        let anosLista: FipeAnoItem[] = [];
        if (anosRes && 'itens' in anosRes) {
          anosLista = anosRes.itens;
          setAvisoFipeInstavel(Boolean(anosRes.emContingencia));
        } else if (Array.isArray(anosRes)) {
          anosLista = anosRes;
        }

        setListaAnos(anosLista);

        if (veiculo.anoFabricacao) {
          const anoEncontrado = anosLista.find((a) =>
            a.nome.includes(String(veiculo.anoFabricacao))
          );
          if (anoEncontrado) {
            setAnoDescricao(anoEncontrado.valor);
          }
        }

        dadosHidratadosRef.current = true;
      } catch (err) {
        console.error('Erro na hidratação de edição:', err);
      } finally {
        setCarregandoModelos(false);
        setCarregandoAnos(false);
      }
    }

    hidratarEdicao();
  }, [isEditing, initialData, listaMarcas, vehicleType]);

  // 3. Mudança de Marca
  const handleMarcaInputChange = async (valorDigitado: string) => {
    setMarcaNome(valorDigitado);
    setModeloNome('');
    setModeloCodigo('');
    setAnoDescricao('');
    setListaModelos([]);
    setListaAnos([]);
    setSugestaoConsumoAtiva(false);

    const marcaEncontrada = listaMarcas.find(
      (m) => m.nome.trim().toLowerCase() === valorDigitado.trim().toLowerCase()
    );

    if (marcaEncontrada) {
      setMarcaCodigo(marcaEncontrada.valor);
      setCarregandoModelos(true);
      try {
        const modelos = await fipeService.listarModelos(vehicleType, marcaEncontrada.valor);
        setListaModelos(modelos);
      } catch (err) {
        console.error('Erro ao carregar modelos:', err);
      } finally {
        setCarregandoModelos(false);
      }
    } else {
      setMarcaCodigo(null);
    }
  };

  // 4. Mudança de Modelo
  const handleModeloInputChange = async (valorDigitado: string) => {
    setModeloNome(valorDigitado);
    setAnoDescricao('');
    setListaAnos([]);
    setSugestaoConsumoAtiva(false);
    setAvisoFipeInstavel(false);

    const modeloEncontrado = listaModelos.find(
      (m) => m.modelo.trim().toLowerCase() === valorDigitado.trim().toLowerCase()
    );

    if (modeloEncontrado && marcaCodigo) {
      setModeloCodigo(modeloEncontrado.valor);
      setCarregandoAnos(true);
      try {
        const res = await fipeService.listarAnos(vehicleType, marcaCodigo, modeloEncontrado.valor);
        if (res && 'itens' in res) {
          setListaAnos(res.itens);
          setAvisoFipeInstavel(Boolean(res.emContingencia));
        } else if (Array.isArray(res)) {
          setListaAnos(res);
        }
      } catch (err) {
        console.error('Erro ao carregar anos:', err);
      } finally {
        setCarregandoAnos(false);
      }
    } else {
      setModeloCodigo('');
    }
  };

  // 5. Mudança de Ano / Combustível
  const handleAnoChange = (anoValorChave: string) => {
    setAnoDescricao(anoValorChave);
    if (!anoValorChave) return;

    const anoObj = listaAnos.find((a) => a.valor === anoValorChave);
    if (!anoObj) return;

    const matchAno = anoObj.nome.match(/\b(19\d\d|20\d\d)\b/);
    if (matchAno) {
      setAnoFabricacao(matchAno[1]);
    }

    const nomeLower = anoObj.nome.toLowerCase();
    let detectCombustivel = 'Flex';
    let propulsao: 'combustao' | 'eletrico' | 'hibrido' = 'combustao';

    if (vehicleType === 'caminhoes') {
      detectCombustivel = 'Diesel';
      propulsao = 'combustao';
      setConsumo('3.5');
    } else if (nomeLower.includes('elétr') || nomeLower.includes('eletric') || nomeLower.includes('ev')) {
      detectCombustivel = 'Elétrico';
      propulsao = 'eletrico';
      setConsumo('15.0');
    } else if (nomeLower.includes('híbr') || nomeLower.includes('hybrid') || nomeLower.includes('phev')) {
      detectCombustivel = 'Híbrido';
      propulsao = 'hibrido';
      setConsumo('17.5');
    } else if (nomeLower.includes('diesel')) {
      detectCombustivel = 'Diesel';
      propulsao = 'combustao';
      setConsumo('10.0');
    } else if (nomeLower.includes('gasolina')) {
      detectCombustivel = 'Gasolina';
      propulsao = 'combustao';
      setConsumo('12.5');
    } else {
      detectCombustivel = 'Flex';
      propulsao = 'combustao';
      setConsumo('12.0');
    }

    setCombustivelEspecifico(detectCombustivel);
    setTipoPropulsao(propulsao);
    setSugestaoConsumoAtiva(true);

    setErros((prev) => {
      const resto = { ...prev };
      delete resto.consumo;
      delete resto.anoFabricacao;
      return resto;
    });
  };

  const validarFormulario = () => {
    const novosErros: Record<string, string> = {};

    if (!apelido.trim()) novosErros.apelido = 'Informe um apelido para o veículo.';
    if (!marcaNome.trim()) novosErros.marca = 'Digite ou selecione uma marca.';
    if (!modeloNome.trim()) novosErros.modelo = 'Digite ou selecione um modelo.';

    const anoNum = parseInt(anoFabricacao, 10);
    if (!anoFabricacao || isNaN(anoNum) || anoNum < 1980) {
      novosErros.anoFabricacao = 'Selecione o ano e combustível do veículo.';
    }

    const consumoNum = parseFloat(consumo);
    if (!consumo || isNaN(consumoNum) || consumoNum <= 0) {
      novosErros.consumo = 'Informe um valor de consumo médio válido.';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    onSubmit({
      apelido: apelido.trim(),
      marca: marcaNome.trim(),
      modelo: modeloNome.trim(),
      anoFabricacao: parseInt(anoFabricacao, 10),
      tipoPropulsao,
      consumo: parseFloat(consumo),
      categoria: vehicleType,
      quantidadeEixos: vehicleType === 'caminhoes' ? Number(quantidadeEixos) : 2,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl">
      {/* CATEGORIA FIPE */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Categoria do Veículo:
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['carros', 'motos', 'caminhoes'] as VehicleType[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => {
                setVehicleType(tipo);
                setMarcaCodigo(null);
                setMarcaNome('');
                setModeloCodigo('');
                setModeloNome('');
                setAnoDescricao('');
                setListaModelos([]);
                setListaAnos([]);
                setAvisoFipeInstavel(false);
                dadosHidratadosRef.current = false;
                if (tipo === 'caminhoes') {
                  setConsumo('3.5');
                  setCombustivelEspecifico('Diesel');
                }
              }}
              className={`p-2.5 rounded-lg border text-xs font-semibold capitalize transition-all cursor-pointer ${
                vehicleType === tipo
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-[#131b2e] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {tipo === 'caminhoes' ? 'Caminhões' : tipo}
            </button>
          ))}
        </div>
      </div>

      {/* DADOS DO VEÍCULO */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          {vehicleType === 'caminhoes' ? <Truck size={16} className="text-blue-500" /> : <Car size={16} className="text-blue-500" />}
          Dados do Veículo (Consulta FIPE)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* APELIDO */}
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">
              Apelido do Veículo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Scania R450, Carreta Graneleira, Meu Caminhão"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all ${
                erros.apelido ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
              }`}
            />
            {erros.apelido && <p className="text-[11px] text-rose-400 mt-1">{erros.apelido}</p>}
          </div>

          {/* QUANTIDADE DE EIXOS (EXCLUSIVO PARA CAMINHÕES) */}
          {vehicleType === 'caminhoes' && (
            <div className="sm:col-span-2 p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-blue-300 flex items-center gap-2">
                  <Truck size={16} className="text-blue-400" /> Quantidade de Eixos do Caminhão:
                </label>
                <span className="text-[11px] font-mono font-bold text-amber-400">
                  Multiplicador Tarifário: {quantidadeEixos}x
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                A tarifa de pedágio em rodovias estaduais e federais é multiplicada pelo total de eixos do caminhão.
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                {[2, 3, 4, 5, 6, 7, 8, 9].map((eixo) => (
                  <button
                    key={eixo}
                    type="button"
                    onClick={() => setQuantidadeEixos(eixo)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      quantidadeEixos === eixo
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20'
                        : 'bg-[#131b2e] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {eixo} Eixos
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MARCA */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">
              Marca / Fabricante <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="lista-marcas-fipe"
                placeholder="Digite ou escolha a marca..."
                value={marcaNome}
                onChange={(e) => handleMarcaInputChange(e.target.value)}
                disabled={carregandoMarcas}
                className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all ${
                  erros.marca ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              <datalist id="lista-marcas-fipe">
                {listaMarcas.map((m) => (
                  <option key={m.valor} value={m.nome} />
                ))}
              </datalist>
              {carregandoMarcas && (
                <Loader2 size={14} className="animate-spin text-blue-400 absolute right-3 top-3" />
              )}
            </div>
            {erros.marca && <p className="text-[11px] text-rose-400 mt-1">{erros.marca}</p>}
          </div>

          {/* MODELO */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">
              Modelo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="lista-modelos-fipe"
                placeholder={
                  carregandoModelos
                    ? 'Carregando modelos...'
                    : marcaCodigo
                    ? 'Digite ou escolha o modelo...'
                    : 'Escolha a marca primeiro'
                }
                value={modeloNome}
                onChange={(e) => handleModeloInputChange(e.target.value)}
                disabled={!marcaCodigo || carregandoModelos}
                className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  erros.modelo ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              <datalist id="lista-modelos-fipe">
                {listaModelos.map((mod) => (
                  <option key={mod.valor} value={mod.modelo} />
                ))}
              </datalist>
              {carregandoModelos && (
                <Loader2 size={14} className="animate-spin text-blue-400 absolute right-3 top-3" />
              )}
            </div>
            {erros.modelo && <p className="text-[11px] text-rose-400 mt-1">{erros.modelo}</p>}
          </div>

          {/* ANO E COMBUSTÍVEL */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 font-medium">
                Ano e Combustível (FIPE) <span className="text-rose-500">*</span>
              </label>
              {anoFabricacao && (
                <span className="text-[11px] font-mono text-slate-400">
                  Ano detectado: <strong className="text-slate-200">{anoFabricacao}</strong>
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={anoDescricao}
                onChange={(e) => handleAnoChange(e.target.value)}
                disabled={!modeloCodigo || carregandoAnos}
                className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 focus:outline-none transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  erros.anoFabricacao ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              >
                <option value="">
                  {carregandoAnos
                    ? 'Buscando anos...'
                    : modeloCodigo
                    ? 'Selecione o Ano e Versão...'
                    : 'Selecione o modelo primeiro'}
                </option>
                {listaAnos.map((item) => (
                  <option key={item.valor} value={item.valor} className="bg-[#131b2e] text-slate-200">
                    {item.nome}
                  </option>
                ))}
              </select>
              {carregandoAnos && (
                <Loader2 size={14} className="animate-spin text-blue-400 absolute right-3 top-3" />
              )}
            </div>
            {erros.anoFabricacao && (
              <p className="text-[11px] text-rose-400 mt-1">{erros.anoFabricacao}</p>
            )}

            {avisoFipeInstavel && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-[11px] text-amber-300">
                <AlertTriangle size={14} className="flex-shrink-0 text-amber-400" />
                <span>
                  Tabela FIPE em contingência. Lista de anos carregada em modo de segurança.
                </span>
              </div>
            )}

            {/* FLAGS DE PROPULSÃO */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tipo de Propulsão / Motorização:
                </span>
                {combustivelEspecifico && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Flame size={11} className="text-amber-400" />
                    Combustível: <strong>{combustivelEspecifico}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pointer-events-none select-none">
                <div
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    tipoPropulsao === 'combustao'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold shadow-sm shadow-amber-500/10'
                      : 'bg-[#131b2e]/60 border-slate-800/60 text-slate-500 opacity-60'
                  }`}
                >
                  <Fuel size={14} className={tipoPropulsao === 'combustao' ? 'text-amber-400' : 'text-slate-600'} />
                  <span>Combustão</span>
                </div>

                <div
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    tipoPropulsao === 'hibrido'
                      ? 'bg-blue-500/15 border-blue-500 text-blue-300 font-semibold shadow-sm shadow-blue-500/10'
                      : 'bg-[#131b2e]/60 border-slate-800/60 text-slate-500 opacity-60'
                  }`}
                >
                  <Leaf size={14} className={tipoPropulsao === 'hibrido' ? 'text-blue-400' : 'text-slate-600'} />
                  <span>Híbrido</span>
                </div>

                <div
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    tipoPropulsao === 'eletrico'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                      : 'bg-[#131b2e]/60 border-slate-800/60 text-slate-500 opacity-60'
                  }`}
                >
                  <Zap size={14} className={tipoPropulsao === 'eletrico' ? 'text-emerald-400' : 'text-slate-600'} />
                  <span>100% Elétrico</span>
                </div>
              </div>
            </div>
          </div>

          {/* CONSUMO MÉDIO */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 font-medium">
                {tipoPropulsao === 'eletrico' ? 'Consumo Médio (kWh/100km)' : 'Consumo Médio (km/l)'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              {sugestaoConsumoAtiva && (
                <span className="text-[10px] text-blue-400 flex items-center gap-1 font-mono">
                  <Edit3 size={11} /> Ajustável pelo condutor
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder={vehicleType === 'caminhoes' ? 'Ex: 3.5' : tipoPropulsao === 'eletrico' ? 'Ex: 14.2' : 'Ex: 13.5'}
                value={consumo}
                onChange={(e) => setConsumo(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 font-mono focus:outline-none transition-all ${
                  erros.consumo ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              {sugestaoConsumoAtiva && (
                <span className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle2 size={13} /> Média Sugerida
                </span>
              )}
            </div>

            {erros.consumo && <p className="text-[11px] text-rose-400 mt-1">{erros.consumo}</p>}

            {sugestaoConsumoAtiva && (
              <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2 text-[11px] text-blue-300">
                <Lightbulb size={14} className="flex-shrink-0 mt-0.5 text-blue-400" />
                <p>
                  Propulsão identificada como <strong>{combustivelEspecifico}</strong> ({tipoPropulsao}). A taxa de consumo foi estimada e pode ser editada livremente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/veiculos')}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <button
          type="submit"
          disabled={salvando}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo'}
        </button>
      </div>
    </form>
  );
}