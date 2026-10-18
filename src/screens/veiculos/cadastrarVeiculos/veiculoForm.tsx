import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Fuel,
  Zap,
  Leaf,
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  CheckCircle2,
  Edit3,
  Flame,
  AlertTriangle,
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
  initialData?: Partial<Veiculo>;
  isEditing?: boolean;
  onSubmit: (data: Omit<Veiculo, 'id'>) => void;
  salvando?: boolean;
}

export function VeiculoForm({
  initialData,
  isEditing = false,
  onSubmit,
  salvando = false,
}: VeiculoFormProps) {
  const navigate = useNavigate();

  // Tipo FIPE (carros, motos, caminhoes)
  const [vehicleType, setVehicleType] = useState<VehicleType>('carros');

  // Estados dos Campos Principais
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

  // Listas vindas da FIPE
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

  // 2. Mudança de Marca (pelo input digitável com datalist)
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

  // 3. Mudança de Modelo (pelo input digitável com datalist)
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

  // 4. Mudança de Ano / Combustível -> define automaticamente a propulsão e o consumo
  const handleAnoChange = (anoValorChave: string) => {
    setAnoDescricao(anoValorChave);
    if (!anoValorChave) return;

    const anoObj = listaAnos.find((a) => a.valor === anoValorChave);
    if (!anoObj) return;

    // Extrai o ano numérico inicial
    const matchAno = anoObj.nome.match(/\b(19\d\d|20\d\d)\b/);
    if (matchAno) {
      setAnoFabricacao(matchAno[1]);
    }

    const nomeLower = anoObj.nome.toLowerCase();
    let detectCombustivel = 'Flex';
    let propulsao: 'combustao' | 'eletrico' | 'hibrido' = 'combustao';

    if (nomeLower.includes('elétr') || nomeLower.includes('eletric') || nomeLower.includes('ev')) {
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
      setConsumo('11.0');
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
      capacidadeBateria: undefined,
      autonomiaKm: undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
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
          <Car size={16} className="text-blue-500" />
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
              placeholder="Ex: Meu Onix, Carro de Viagem, Trabalho"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all ${
                erros.apelido ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
              }`}
            />
            {erros.apelido && <p className="text-[11px] text-rose-400 mt-1">{erros.apelido}</p>}
          </div>

          {/* MARCA DIGITÁVEL COM AUTOCOMPLETE */}
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

          {/* MODELO DIGITÁVEL COM AUTOCOMPLETE */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">
              Modelo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="lista-modelos-fipe"
                placeholder={marcaCodigo ? 'Digite ou escolha o modelo...' : 'Escolha a marca primeiro'}
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

          {/* ANO E COMBUSTÍVEL + FLAGS APENAS VISUAIS */}
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
                  {modeloCodigo ? 'Selecione o Ano e Versão...' : 'Selecione o modelo primeiro'}
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
            {erros.anoFabricacao && <p className="text-[11px] text-rose-400 mt-1">{erros.anoFabricacao}</p>}

            {/* AVISO DE RATE LIMIT / FALLBACK */}
            {avisoFipeInstavel && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-[11px] text-amber-300">
                <AlertTriangle size={14} className="flex-shrink-0 text-amber-400" />
                <span>
                  Tabela FIPE em limite temporário de requisições. Lista carregada em modo de contingência.
                </span>
              </div>
            )}

            {/* FLAGS APENAS VISUAIS DE PROPULSÃO / MOTORIZAÇÃO */}
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

              {/* CONTAINER COM POINTER-EVENTS-NONE (NÃO EDITÁVEL) */}
              <div className="grid grid-cols-3 gap-2 pointer-events-none select-none">
                {/* FLAG COMBUSTÃO */}
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

                {/* FLAG HÍBRIDO */}
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

                {/* FLAG ELÉTRICO */}
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

          {/* CONSUMO MÉDIO (EDITÁVEL) */}
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
                placeholder={tipoPropulsao === 'eletrico' ? 'Ex: 14.2' : 'Ex: 13.5'}
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
                <Sparkles size={14} className="flex-shrink-0 mt-0.5 text-blue-400" />
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