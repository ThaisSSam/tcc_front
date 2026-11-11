import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { Route as RouteIcon, Search, Star, X, Trash2, Map, AlertCircle } from 'lucide-react';
import { BaseDataTable } from '../../../contexts/BaseDataTable';
import { createRotaColumns, type SimulacaoRota } from './table/tableConfig';
import { rotasEndpoints } from '../../../services/endpoints/rotas';
import { favoritosEndpoints } from '../../../services/endpoints/favoritos';

export default function ConsultarRotasScreen() {
  const navigate = useNavigate();

  const [rotas, setRotas] = useState<SimulacaoRota[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'principal' | 'sem_pedagio'>('todos');
  const [filtroFavoritos, setFiltroFavoritos] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [rotaSelecionada, setRotaSelecionada] = useState<SimulacaoRota | null>(null);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);

  // Busca do histórico do banco
  const carregarRotas = useCallback(async () => {
    try {
      setCarregando(true);
      setErroApi(null);
      const res = await rotasEndpoints.listar();
      if (res?.data) {
        setRotas(res.data);
      }
    } catch (err: any) {
      setErroApi(err.message || 'Erro ao carregar simulações de rotas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarRotas();
  }, [carregarRotas]);

  // Filtros locais sobre a lista carregada
  const rotasFiltradas = useMemo(() => {
    return rotas.filter((r) => {
      const matchBusca =
        r.origem.toLowerCase().includes(busca.toLowerCase()) ||
        r.destino.toLowerCase().includes(busca.toLowerCase()) ||
        (r.apelido && r.apelido.toLowerCase().includes(busca.toLowerCase())) ||
        r.veiculoNome.toLowerCase().includes(busca.toLowerCase());

      const matchTipo = filtroTipo === 'todos' ? true : r.tipoRota === filtroTipo;
      const matchFav = filtroFavoritos ? r.isFavorita : true;

      return matchBusca && matchTipo && matchFav;
    });
  }, [rotas, busca, filtroTipo, filtroFavoritos]);

  // Alternar Favorito integrado com o banco
  const handleToggleFavorito = async (id: string) => {
    const rotaAlvo = rotas.find((r) => r.id === id);
    if (!rotaAlvo) return;

    const novoStatus = !rotaAlvo.isFavorita;

    // Atualização otimista na interface
    setRotas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorita: novoStatus } : r))
    );

    try {
      if (novoStatus) {
        await favoritosEndpoints.favoritarRota({
          simulacao_id: id,
          apelido_rota: rotaAlvo.apelido || undefined,
        });
      } else {
        await favoritosEndpoints.removerFavorito(id);
      }
    } catch (err: any) {
      // Rollback visual em caso de erro na requisição
      setRotas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isFavorita: !novoStatus } : r))
      );
      alert(err.message || 'Não foi possível atualizar o favorito.');
    }
  };

  const handleVisualizar = (rota: SimulacaoRota) => {
    setRotaSelecionada(rota);
    setModalVisualizarAberto(true);
  };

  const handleExcluir = (rota: SimulacaoRota) => {
    setRotaSelecionada(rota);
    setModalExcluirAberto(true);
  };

  const confirmarExclusao = async () => {
    if (!rotaSelecionada) return;
    try {
      await rotasEndpoints.excluir(rotaSelecionada.id);
      setRotas((prev) => prev.filter((r) => r.id !== rotaSelecionada.id));
      setModalExcluirAberto(false);
      setRotaSelecionada(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir a rota no banco de dados.');
    }
  };

  const columns = useMemo(
    () => createRotaColumns(handleToggleFavorito, handleVisualizar, handleExcluir),
    [rotas]
  );

  const table = useReactTable({
    data: rotasFiltradas,
    columns,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      {/* HEADER */}
      <header className="flex justify-between items-center border-b border-slate-800 bg-[#0f172a] px-6 py-5 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20">
            <RouteIcon size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 leading-tight">Simulações de Rotas</h1>
            <p className="text-xs text-slate-500">Histórico de trajetos e comparativos de custos</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/mapa')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs shadow-lg shadow-blue-500/10 transition-colors cursor-pointer"
        >
          <Map size={16} />
          Mapa
        </button>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-h-0 p-6 bg-[#090d16] space-y-4 overflow-hidden">
        {/* {erroApi && (
          <div className="flex items-center justify-between p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{erroApi}</span>
            </div>
            <button
              onClick={carregarRotas}
              className="underline font-semibold hover:text-rose-300 cursor-pointer"
            >
              Recarregar
            </button>
          </div>
        )} */}

        {/* FILTROS */}
        <div className="flex flex-wrap gap-3 items-center justify-between flex-shrink-0">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por origem, destino, apelido ou veículo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#131b2e] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#131b2e] border border-slate-800 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setFiltroTipo('todos')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filtroTipo === 'todos' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('principal')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filtroTipo === 'principal' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Com Pedágio
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('sem_pedagio')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filtroTipo === 'sem_pedagio' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sem Pedágio
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFiltroFavoritos((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-colors cursor-pointer ${
                filtroFavoritos
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-medium'
                  : 'bg-[#131b2e] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star size={13} className={filtroFavoritos ? 'fill-amber-400' : ''} />
              Favoritas
            </button>
          </div>

          {(busca || filtroTipo !== 'todos' || filtroFavoritos) && (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setFiltroTipo('todos');
                setFiltroFavoritos(false);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* TABELA BASE COM DADOS DO BANCO */}
        <div className="rounded-xl border border-slate-800 bg-[#131b2e] flex-1 min-h-0 overflow-hidden">
          <BaseDataTable
            table={table}
            isLoading={carregando}
            enablePagination={true}
            enableColumnResizing={true}
            alturaAutomatica={false}
            rolagemHorizontalExterna={false}
          />
        </div>
      </main>

      {/* MODAL VISUALIZAR */}
      {modalVisualizarAberto && rotaSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <RouteIcon size={18} className="text-blue-500" />
                Resumo da Simulação
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Origem:</span>
                <span className="font-semibold text-slate-100">{rotaSelecionada.origem}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Destino:</span>
                <span className="font-semibold text-slate-100">{rotaSelecionada.destino}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Veículo:</span>
                <span className="font-semibold text-slate-100">{rotaSelecionada.veiculoNome}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Distância:</span>
                <span className="font-mono text-slate-100">{rotaSelecionada.distanciaKm} km</span>
              </div>
              <div className="flex justify-between py-2 bg-blue-600/10 px-2 rounded-lg border border-blue-500/20">
                <span className="font-bold text-blue-400">Custo Total Previsto:</span>
                <span className="font-mono font-bold text-blue-300 text-sm">
                  R$ {Number(rotaSelecionada.custoTotal).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalVisualizarAberto(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {modalExcluirAberto && rotaSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 text-rose-500">
              <Trash2 size={18} />
              Excluir Simulação
            </h3>
            <p className="text-xs text-slate-400">
              Deseja remover a rota <strong>{rotaSelecionada.origem} → {rotaSelecionada.destino}</strong> do histórico no banco?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setModalExcluirAberto(false); setRotaSelecionada(null); }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}