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
  Plus,
  X,
  PlusCircle,
} from 'lucide-react';
import { type Veiculo } from '../consultarVeiculos/table/tableConfig';
import { catalogoVeiculosService, type VersaoCatalogoDTO } from '../../../services/endpoints/catalogoVeiculos';

interface VeiculoFormProps {
  initialData?: Partial<Veiculo>;
  isEditing?: boolean;
  onSubmit: (data: Omit<Veiculo, 'id'>) => void;
  salvando?: boolean;
}

type TipoModal = 'marca' | 'modelo' | 'versao' | null;

export function VeiculoForm({
  initialData,
  isEditing = false,
  onSubmit,
  salvando = false,
}: VeiculoFormProps) {
  const navigate = useNavigate();

  // Estados dos Campos Principais
  const [apelido, setApelido] = useState(initialData?.apelido || '');
  const [marca, setMarca] = useState(initialData?.marca || '');
  const [modelo, setModelo] = useState(initialData?.modelo || '');
  const [versaoSelecionada, setVersaoSelecionada] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState(
    initialData?.anoFabricacao?.toString() || new Date().getFullYear().toString()
  );
  const [tipoPropulsao, setTipoPropulsao] = useState<'combustao' | 'eletrico' | 'hibrido'>(
    initialData?.tipoPropulsao || 'combustao'
  );
  const [combustivelEspecifico, setCombustivelEspecifico] = useState<string>('Flex');

  const [consumo, setConsumo] = useState(initialData?.consumo?.toString() || '');
  const [capacidadeBateria, setCapacidadeBateria] = useState(
    initialData?.capacidadeBateria?.toString() || ''
  );
  const [autonomiaKm, setAutonomiaKm] = useState(
    initialData?.autonomiaKm?.toString() || ''
  );

  // Listas dos Selects
  const [listaMarcas, setListaMarcas] = useState<string[]>([]);
  const [listaModelos, setListaModelos] = useState<string[]>([]);
  const [listaVersoes, setListaVersoes] = useState<VersaoCatalogoDTO[]>([]);

  // Estados de Loading
  const [carregandoMarcas, setCarregandoMarcas] = useState(false);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [carregandoVersoes, setCarregandoVersoes] = useState(false);

  // Informação do consumo sugerido
  const [consumoSugerido, setConsumoSugerido] = useState<{
    valorOriginal: number;
    fonte: string;
    cidade?: number;
    estrada?: number;
    combustivelTexto?: string;
  } | null>(null);

  const [erros, setErros] = useState<Record<string, string>>({});

  // Estados do Modal Popup (+)
  const [modalAberto, setModalAberto] = useState<TipoModal>(null);
  const [salvandoModal, setSalvandoModal] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Campos do Modal
  const [modalNovaMarca, setModalNovaMarca] = useState('');
  const [modalNovoModelo, setModalNovoModelo] = useState('');
  const [modalNovaVersao, setModalNovaVersao] = useState('');
  const [modalNovoAno, setModalNovoAno] = useState(new Date().getFullYear().toString());
  const [modalNovoCombustivel, setModalNovoCombustivel] = useState('Flex');
  const [modalNovoConsumoCidade, setModalNovoConsumoCidade] = useState('');
  const [modalNovoConsumoEstrada, setModalNovoConsumoEstrada] = useState('');
  const [modalNovoConsumoMedio, setModalNovoConsumoMedio] = useState('');
  const [modalNovoTanque, setModalNovoTanque] = useState('50');

  // 1. Carrega Marcas
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregandoMarcas(true);
      try {
        const marcas = await catalogoVeiculosService.listarMarcas();
        if (ativo) setListaMarcas(marcas);
      } catch (e) {
        console.error(e);
      } finally {
        if (ativo) setCarregandoMarcas(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  // 2. Mudança de Marca
  const handleMarcaChange = async (novaMarca: string) => {
    setMarca(novaMarca);
    setModelo('');
    setVersaoSelecionada('');
    setListaModelos([]);
    setListaVersoes([]);
    setConsumoSugerido(null);

    if (!novaMarca) return;

    setCarregandoModelos(true);
    try {
      const modelos = await catalogoVeiculosService.listarModelos(novaMarca);
      setListaModelos(modelos);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoModelos(false);
    }
  };

  // 3. Mudança de Modelo
  const handleModeloChange = async (novoModelo: string) => {
    setModelo(novoModelo);
    setVersaoSelecionada('');
    setListaVersoes([]);
    setConsumoSugerido(null);

    if (!novoModelo) return;

    setCarregandoVersoes(true);
    try {
      const versoes = await catalogoVeiculosService.listarVersoes(marca, novoModelo);
      setListaVersoes(versoes);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoVersoes(false);
    }
  };

  // 4. Mudança de Versão
  const handleVersaoChange = (chave: string) => {
    setVersaoSelecionada(chave);
    if (!chave) return;

    const item = listaVersoes.find(
      (v) => `${v.versao || 'Padrão'}-${v.anoFabricacao}` === chave
    );

    if (item) {
      setAnoFabricacao(item.anoFabricacao.toString());
      setConsumo(item.consumoMedioKml.toString());

      const comb = item.tipoCombustivel || 'Flex';
      setCombustivelEspecifico(comb);

      const combLower = comb.toLowerCase();
      const versaoLower = (item.versao || '').toLowerCase();

      if (combLower.includes('elétr') || combLower.includes('eletric') || versaoLower.includes('ev') || versaoLower.includes('electric')) {
        setTipoPropulsao('eletrico');
      } else if (combLower.includes('híbr') || combLower.includes('hybrid') || versaoLower.includes('hybrid') || versaoLower.includes('phev')) {
        setTipoPropulsao('hibrido');
      } else {
        setTipoPropulsao('combustao');
      }

      setConsumoSugerido({
        valorOriginal: item.consumoMedioKml,
        fonte: item.fonte || 'combustivel.app',
        cidade: item.consumoCidadeKml,
        estrada: item.consumoEstradaKml,
        combustivelTexto: comb,
      });

      setErros((prev) => {
        const resto = { ...prev };
        delete resto.consumo;
        return resto;
      });
    }
  };

  // Abre Modal configurando os dados de contexto
  const abrirModal = (tipo: TipoModal) => {
    setErroModal(null);
    setModalAberto(tipo);
    if (tipo === 'marca') {
      setModalNovaMarca('');
    } else if (tipo === 'modelo') {
      setModalNovoModelo('');
    } else if (tipo === 'versao') {
      setModalNovaVersao('');
      setModalNovoAno(new Date().getFullYear().toString());
      setModalNovoCombustivel('Flex');
      setModalNovoConsumoCidade('');
      setModalNovoConsumoEstrada('');
      setModalNovoConsumoMedio('12.0');
      setModalNovoTanque('50');
    }
  };

  // Salvar item via Modal
  const handleSalvarModal = async () => {
    setErroModal(null);

    try {
      setSalvandoModal(true);

      if (modalAberto === 'marca') {
        if (!modalNovaMarca.trim()) {
          setErroModal('Informe o nome da marca.');
          return;
        }

        await catalogoVeiculosService.cadastrarItemManual({
          tipoItem: 'marca',
          marca: modalNovaMarca.trim(),
          modelo: 'Geral',
          versao: 'Padrão',
          anoFabricacao: new Date().getFullYear(),
          tipoCombustivel: 'Flex',
          consumoMedioKml: 12.0,
        });

        const marcasAtualizadas = await catalogoVeiculosService.listarMarcas();
        setListaMarcas(marcasAtualizadas);
        setMarca(modalNovaMarca.trim());
        setModalAberto(null);
        await handleMarcaChange(modalNovaMarca.trim());
      } 
      else if (modalAberto === 'modelo') {
        if (!marca) {
          setErroModal('Selecione uma marca primeiro.');
          return;
        }
        if (!modalNovoModelo.trim()) {
          setErroModal('Informe o nome do modelo.');
          return;
        }

        await catalogoVeiculosService.cadastrarItemManual({
          tipoItem: 'modelo',
          marca,
          modelo: modalNovoModelo.trim(),
          versao: 'Padrão',
          anoFabricacao: new Date().getFullYear(),
          tipoCombustivel: 'Flex',
          consumoMedioKml: 12.0,
        });

        const modelosAtualizados = await catalogoVeiculosService.listarModelos(marca);
        setListaModelos(modelosAtualizados);
        setModelo(modalNovoModelo.trim());
        setModalAberto(null);
        await handleModeloChange(modalNovoModelo.trim());
      } 
      else if (modalAberto === 'versao') {
        if (!marca || !modelo) {
          setErroModal('Selecione a marca e o modelo antes de adicionar a versão.');
          return;
        }
        if (!modalNovaVersao.trim()) {
          setErroModal('Informe o nome da versão.');
          return;
        }

        const anoNum = parseInt(modalNovoAno, 10);
        const consumoMedioNum = parseFloat(modalNovoConsumoMedio) || 12.0;

        const novoItem = await catalogoVeiculosService.cadastrarItemManual({
          tipoItem: 'versao',
          marca,
          modelo,
          versao: modalNovaVersao.trim(),
          anoFabricacao: isNaN(anoNum) ? new Date().getFullYear() : anoNum,
          tipoCombustivel: modalNovoCombustivel,
          consumoCidadeKml: modalNovoConsumoCidade ? parseFloat(modalNovoConsumoCidade) : undefined,
          consumoEstradaKml: modalNovoConsumoEstrada ? parseFloat(modalNovoConsumoEstrada) : undefined,
          consumoMedioKml: consumoMedioNum,
          capacidadeTanqueLitros: modalNovoTanque ? parseFloat(modalNovoTanque) : 50,
        });

        const versoesAtualizadas = await catalogoVeiculosService.listarVersoes(marca, modelo);
        setListaVersoes(versoesAtualizadas);

        const chaveCriada = `${novoItem.versao || modalNovaVersao.trim()}-${novoItem.anoFabricacao || anoNum}`;
        setModalAberto(null);
        handleVersaoChange(chaveCriada);
      }
    } catch (err: any) {
      setErroModal(err.message || 'Erro ao persistir no catálogo.');
    } finally {
      setSalvandoModal(false);
    }
  };

  const validarFormulario = () => {
    const novosErros: Record<string, string> = {};

    if (!apelido.trim()) novosErros.apelido = 'Informe um apelido ou identificação.';
    if (!marca.trim()) novosErros.marca = 'Selecione ou adicione uma marca.';
    if (!modelo.trim()) novosErros.modelo = 'Selecione ou adicione um modelo.';

    const anoNum = parseInt(anoFabricacao, 10);
    if (!anoFabricacao || isNaN(anoNum) || anoNum < 1980) {
      novosErros.anoFabricacao = 'Informe um ano de fabricação válido.';
    }

    const consumoNum = parseFloat(consumo);
    if (!consumo || isNaN(consumoNum) || consumoNum <= 0) {
      novosErros.consumo = 'Informe um valor de consumo médio válido.';
    }

    if (tipoPropulsao === 'eletrico') {
      const autNum = parseFloat(autonomiaKm);
      if (!autonomiaKm || isNaN(autNum) || autNum <= 0) {
        novosErros.autonomiaKm = 'Informe a autonomia estimada para o veículo elétrico.';
      }
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const versaoTexto = versaoSelecionada ? ` - ${versaoSelecionada.split('-')[0]}` : '';

    onSubmit({
      apelido: apelido.trim(),
      marca: marca.trim(),
      modelo: `${modelo.trim()}${versaoTexto}`,
      anoFabricacao: parseInt(anoFabricacao, 10),
      tipoPropulsao,
      consumo: parseFloat(consumo),
      capacidadeBateria: capacidadeBateria ? parseFloat(capacidadeBateria) : undefined,
      autonomiaKm: autonomiaKm ? parseFloat(autonomiaKm) : undefined,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
        {/* TIPO DE PROPULSÃO */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Tipo de Motorização / Propulsão:
            </label>
            {combustivelEspecifico && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Flame size={12} className="text-amber-400" />
                Alimentação: <strong>{combustivelEspecifico}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTipoPropulsao('combustao')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                tipoPropulsao === 'combustao'
                  ? 'bg-amber-500/10 border-amber-500/80 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-[#131b2e] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  tipoPropulsao === 'combustao' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Fuel size={18} />
              </div>
              <div>
                <span className="block font-semibold text-xs text-slate-200">Combustão</span>
                <span className="text-[10px] text-slate-400">Gasolina, Etanol ou Diesel</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipoPropulsao('hibrido')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                tipoPropulsao === 'hibrido'
                  ? 'bg-blue-500/10 border-blue-500/80 text-blue-300 shadow-md shadow-blue-500/10'
                  : 'bg-[#131b2e] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  tipoPropulsao === 'hibrido' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Leaf size={18} />
              </div>
              <div>
                <span className="block font-semibold text-xs text-slate-200">Híbrido</span>
                <span className="text-[10px] text-slate-400">Combustão + Elétrico</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTipoPropulsao('eletrico');
                setConsumoSugerido(null);
              }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                tipoPropulsao === 'eletrico'
                  ? 'bg-emerald-500/10 border-emerald-500/80 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-[#131b2e] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  tipoPropulsao === 'eletrico' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Zap size={18} />
              </div>
              <div>
                <span className="block font-semibold text-xs text-slate-200">100% Elétrico</span>
                <span className="text-[10px] text-slate-400">Bateria & Recarga kWh</span>
              </div>
            </button>
          </div>
        </div>

        {/* DADOS DO VEÍCULO COM OS BOTÕES + */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Car size={16} className="text-blue-500" />
            Dados do Veículo
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

            {/* MARCA + BOTÃO [+] */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Marca / Fabricante <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => abrirModal('marca')}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  title="Cadastrar nova marca no catálogo"
                >
                  <Plus size={13} className="text-blue-500" /> Nova Marca
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={marca}
                    onChange={(e) => handleMarcaChange(e.target.value)}
                    disabled={carregandoMarcas}
                    className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 focus:outline-none transition-all cursor-pointer ${
                      erros.marca ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Selecione a Marca...</option>
                    {listaMarcas.map((m) => (
                      <option key={m} value={m} className="bg-[#131b2e] text-slate-200">
                        {m}
                      </option>
                    ))}
                  </select>
                  {carregandoMarcas && (
                    <Loader2 size={14} className="animate-spin text-blue-400 absolute right-3 top-3" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => abrirModal('marca')}
                  className="px-3 bg-[#131b2e] border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  title="Adicionar Marca"
                >
                  <Plus size={15} />
                </button>
              </div>
              {erros.marca && <p className="text-[11px] text-rose-400 mt-1">{erros.marca}</p>}
            </div>

            {/* MODELO + BOTÃO [+] */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Modelo <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => abrirModal('modelo')}
                  disabled={!marca}
                  className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  title="Cadastrar novo modelo no catálogo"
                >
                  <Plus size={13} className="text-blue-500" /> Novo Modelo
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={modelo}
                    onChange={(e) => handleModeloChange(e.target.value)}
                    disabled={!marca || carregandoModelos}
                    className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 focus:outline-none transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      erros.modelo ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                    }`}
                  >
                    <option value="">{marca ? 'Selecione o Modelo...' : 'Escolha a marca primeiro'}</option>
                    {listaModelos.map((mod) => (
                      <option key={mod} value={mod} className="bg-[#131b2e] text-slate-200">
                        {mod}
                      </option>
                    ))}
                  </select>
                  {carregandoModelos && (
                    <Loader2 size={14} className="animate-spin text-blue-400 absolute right-3 top-3" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => abrirModal('modelo')}
                  disabled={!marca}
                  className="px-3 bg-[#131b2e] border border-slate-800 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  title="Adicionar Modelo"
                >
                  <Plus size={15} />
                </button>
              </div>
              {erros.modelo && <p className="text-[11px] text-rose-400 mt-1">{erros.modelo}</p>}
            </div>

            {/* VERSÃO, ANO E COMBUSTÍVEL + BOTÃO [+] */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Versão, Ano e Combustível (Origem do Consumo Médio)
                </label>
                <button
                  type="button"
                  onClick={() => abrirModal('versao')}
                  disabled={!modelo}
                  className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  title="Cadastrar nova versão com motorização e consumo"
                >
                  <Plus size={13} className="text-blue-500" /> Nova Versão / Ano
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={versaoSelecionada}
                    onChange={(e) => handleVersaoChange(e.target.value)}
                    disabled={!modelo || carregandoVersoes}
                    className="w-full px-3.5 py-2.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {modelo ? 'Selecione a Versão para preencher consumo...' : 'Escolha o modelo primeiro'}
                    </option>
                    {listaVersoes.map((item) => {
                      const chave = `${item.versao || 'Padrão'}-${item.anoFabricacao}`;
                      return (
                        <option key={chave} value={chave} className="bg-[#131b2e] text-slate-200">
                          {item.versao || 'Padrão'} ({item.anoFabricacao}) - [{item.tipoCombustivel || 'Flex'}] - Média: {item.consumoMedioKml} km/l
                        </option>
                      );
                    })}
                  </select>
                  {carregandoVersoes && (
                    <Loader2 size={14} className="animate-spin text-blue-400 absolute right-3 top-3" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => abrirModal('versao')}
                  disabled={!modelo}
                  className="px-3 bg-[#131b2e] border border-slate-800 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  title="Adicionar Versão"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {/* ANO DE FABRICAÇÃO */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                Ano de Fabricação <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1980"
                max={new Date().getFullYear() + 1}
                value={anoFabricacao}
                onChange={(e) => setAnoFabricacao(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-[#131b2e] border rounded-lg text-xs text-slate-200 font-mono focus:outline-none transition-all ${
                  erros.anoFabricacao ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
              {erros.anoFabricacao && <p className="text-[11px] text-rose-400 mt-1">{erros.anoFabricacao}</p>}
            </div>

            {/* CONSUMO MÉDIO (EDITÁVEL) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  {tipoPropulsao === 'eletrico' ? 'Consumo Médio (kWh/100km)' : 'Consumo Médio (km/l)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                {consumoSugerido && (
                  <span className="text-[10px] text-blue-400 flex items-center gap-1 font-mono">
                    <Edit3 size={11} /> Editável pelo motorista
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
                {consumoSugerido && (
                  <span className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <CheckCircle2 size={13} /> Sugestão Aplicada
                  </span>
                )}
              </div>

              {erros.consumo && <p className="text-[11px] text-rose-400 mt-1">{erros.consumo}</p>}

              {consumoSugerido && (
                <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2 text-[11px] text-blue-300">
                  <Sparkles size={14} className="flex-shrink-0 mt-0.5 text-blue-400" />
                  <div className="space-y-0.5">
                    <p>
                      Veículo <strong>{consumoSugerido.combustivelTexto}</strong> cadastrado no catálogo (<strong>{consumoSugerido.fonte}</strong>).
                    </p>
                    {consumoSugerido.cidade && consumoSugerido.estrada && (
                      <span className="block text-[10px] text-blue-400/80 font-mono pt-0.5">
                        Cidade: {consumoSugerido.cidade} km/l | Estrada: {consumoSugerido.estrada} km/l
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CAMPOS DE BATERIA / AUTONOMIA */}
          {(tipoPropulsao === 'eletrico' || tipoPropulsao === 'hibrido') && (
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  Capacidade da Bateria (kWh) {tipoPropulsao === 'hibrido' ? '(Opcional)' : ''}
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 44.9"
                  value={capacidadeBateria}
                  onChange={(e) => setCapacidadeBateria(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  Autonomia Estimada (km){' '}
                  {tipoPropulsao === 'eletrico' && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="number"
                  placeholder="Ex: 290"
                  value={autonomiaKm}
                  onChange={(e) => setAutonomiaKm(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
                {erros.autonomiaKm && <p className="text-[11px] text-rose-400 mt-1">{erros.autonomiaKm}</p>}
              </div>
            </div>
          )}
        </div>

        {/* BOTÕES */}
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

      {/* MODAL POPUP PARA ADICIONAR NOVO ITEM AO CATÁLOGO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <PlusCircle size={18} className="text-blue-500" />
                {modalAberto === 'marca' && 'Cadastrar Nova Marca'}
                {modalAberto === 'modelo' && `Novo Modelo para ${marca}`}
                {modalAberto === 'versao' && `Nova Versão para ${marca} ${modelo}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalAberto(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {erroModal && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                {erroModal}
              </div>
            )}

            {/* FORMULÁRIO DO MODAL - MARCA */}
            {modalAberto === 'marca' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Nome da Marca / Fabricante</label>
                <input
                  type="text"
                  placeholder="Ex: Haval, GWM, BYD, Ferrari"
                  value={modalNovaMarca}
                  onChange={(e) => setModalNovaMarca(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* FORMULÁRIO DO MODAL - MODELO */}
            {modalAberto === 'modelo' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Nome do Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: H6, Dolphin, Song Plus, Onix"
                  value={modalNovoModelo}
                  onChange={(e) => setModalNovoModelo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* FORMULÁRIO DO MODAL - VERSÃO / ANO / COMBUSTÍVEL */}
            {modalAberto === 'versao' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Nome da Versão / Motorização</label>
                  <input
                    type="text"
                    placeholder="Ex: 1.0 Turbo MT, 2.0 Hybrid, Long Range"
                    value={modalNovaVersao}
                    onChange={(e) => setModalNovaVersao(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-medium">Ano</label>
                    <input
                      type="number"
                      value={modalNovoAno}
                      onChange={(e) => setModalNovoAno(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-medium">Combustível</label>
                    <select
                      value={modalNovoCombustivel}
                      onChange={(e) => setModalNovoCombustivel(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Flex">Flex</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Elétrico">Elétrico</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Cidade km/l</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="11.5"
                      value={modalNovoConsumoCidade}
                      onChange={(e) => setModalNovoConsumoCidade(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Estrada km/l</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="14.0"
                      value={modalNovoConsumoEstrada}
                      onChange={(e) => setModalNovoConsumoEstrada(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Média km/l</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="12.75"
                      value={modalNovoConsumoMedio}
                      onChange={(e) => setModalNovoConsumoMedio(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Capacidade do Tanque (Litros)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="50"
                    value={modalNovoTanque}
                    onChange={(e) => setModalNovoTanque(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalAberto(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoModal}
                onClick={handleSalvarModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                {salvandoModal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar no Catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}