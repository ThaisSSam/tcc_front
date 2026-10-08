import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import {
  DollarSign,
  TrendingDown,
  Fuel,
  Coins,
  Calendar,
  Car,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { BaseDataTable } from "../../contexts/BaseDataTable";
import { gastosTableColumns, type RegistroGasto } from "./table/tableConfig";
import { rotasEndpoints } from "../../services/endpoints/rotas";

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function GastosScreen() {
  const [registros, setRegistros] = useState<RegistroGasto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const [filtroVeiculo, setFiltroVeiculo] = useState<string>("todos");
  const [sorting, setSorting] = useState<SortingState>([]);
  const carrosselRef = useRef<HTMLDivElement>(null);

  // Carrega histórico real salvo das rotas do backend
  const carregarDadosGastos = useCallback(async () => {
    try {
      setCarregando(true);
      setErroApi(null);
      const res = await rotasEndpoints.listar();
      if (res?.data) {
        // Mapeia os dados do banco para o contrato de RegistroGasto esperado pela tabela
        const dadosMapeados: RegistroGasto[] = res.data.map((item: any) => ({
          id: item.id,
          data: item.dataSimulacao || item.criadoEm || new Date().toISOString().split("T")[0],
          origem: item.origem,
          destino: item.destino,
          veiculoApelido: item.veiculoNome || item.veiculoApelido || "Veículo",
          tipoPropulsao: item.tipoPropulsao || "combustao",
          distanciaKm: Number(item.distanciaKm) || 0,
          custoCombustivel: Number(item.custoDeslocamento) || 0,
          custoPedagio: Number(item.custoPedagio) || 0,
          tipoRota: item.tipoRota || "principal",
          manutencaoNecessaria: false,
        }));
        setRegistros(dadosMapeados);
      }
    } catch (err: any) {
      setErroApi(err.message || "Erro ao carregar registros de gastos da API.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosGastos();
  }, [carregarDadosGastos]);

  // Períodos com lançamentos reais encontrados na base
  const periodosDisponiveis = useMemo(() => {
    const chavesUnicas = new Set<string>();

    registros.forEach((r) => {
      if (r.data) {
        const chave = r.data.substring(0, 7);
        chavesUnicas.add(chave);
      }
    });

    return Array.from(chavesUnicas)
      .sort((a, b) => b.localeCompare(a))
      .map((chave) => {
        const [ano, mesStr] = chave.split("-");
        const mesIndex = parseInt(mesStr, 10) - 1;
        const nomeMes = NOMES_MESES[mesIndex] || mesStr;
        const abrev = nomeMes.substring(0, 3);
        return {
          chave,
          ano,
          mes: mesStr,
          nomeCompleto: `${nomeMes} de ${ano}`,
          labelPill: `${abrev}/${ano}`,
        };
      });
  }, [registros]);

  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("");

  useEffect(() => {
    if (periodosDisponiveis.length > 0 && !periodoSelecionado) {
      setPeriodoSelecionado(periodosDisponiveis[0].chave);
    }
  }, [periodosDisponiveis, periodoSelecionado]);

  const listaVeiculosUnicos = useMemo(() => {
    return Array.from(new Set(registros.map((r) => r.veiculoApelido)));
  }, [registros]);

  // Métricas globais
  const metricasGlobais = useMemo(() => {
    let totalGasto = 0;
    let totalKm = 0;
    let totalEconomia = 0;

    registros.forEach((r) => {
      totalGasto += r.custoCombustivel + r.custoPedagio;
      totalKm += r.distanciaKm;
      if (r.tipoRota === "sem_pedagio" || r.tipoPropulsao === "eletrico") {
        totalEconomia += 65.0;
      }
    });

    const custoPorKm = totalKm > 0 ? totalGasto / totalKm : 0;
    return { totalGasto, totalKm, custoPorKm, totalEconomia };
  }, [registros]);

  // Registros do período selecionado
  const registrosDoPeriodo = useMemo(() => {
    return registros.filter((r) => {
      const matchPeriodo = periodoSelecionado ? r.data.startsWith(periodoSelecionado) : true;
      const matchVeiculo = filtroVeiculo === "todos" || r.veiculoApelido === filtroVeiculo;
      return matchPeriodo && matchVeiculo;
    });
  }, [registros, periodoSelecionado, filtroVeiculo]);

  const metricasDoPeriodo = useMemo(() => {
    let combustivel = 0;
    let pedagio = 0;
    let km = 0;

    registrosDoPeriodo.forEach((r) => {
      combustivel += r.custoCombustivel;
      pedagio += r.custoPedagio;
      km += r.distanciaKm;
    });

    const total = combustivel + pedagio;
    return { total, combustivel, pedagio, km };
  }, [registrosDoPeriodo]);

  const periodoAtualObj = useMemo(() => {
    return periodosDisponiveis.find((p) => p.chave === periodoSelecionado) || periodosDisponiveis[0];
  }, [periodosDisponiveis, periodoSelecionado]);

  const table = useReactTable({
    data: registrosDoPeriodo,
    columns: gastosTableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-y-auto font-sans bg-[#090d16] text-slate-200">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 bg-[#0f172a] px-6 py-4 sticky top-0 z-20 gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-md">
            <DollarSign size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 leading-tight">Painel de Gastos & Relatórios</h1>
            <p className="text-xs text-slate-500">Histórico real integrado ao banco de dados</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex items-center bg-[#131b2e] border border-slate-800 rounded-lg px-3 py-2 text-xs">
            <Car size={14} className="text-slate-400 mr-2 flex-shrink-0" />
            <select
              value={filtroVeiculo}
              onChange={(e) => setFiltroVeiculo(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs focus:outline-none cursor-pointer appearance-none pr-6 w-full font-medium"
            >
              <option value="todos" className="bg-[#0f172a] text-slate-200">
                Todos os Veículos
              </option>
              {listaVeiculosUnicos.map((apelido) => (
                <option key={apelido} value={apelido} className="bg-[#0f172a] text-slate-200">
                  {apelido}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6 flex-1">
        {erroApi && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{erroApi}</span>
            </div>
            <button onClick={carregarDadosGastos} className="underline cursor-pointer">
              Tentar novamente
            </button>
          </div>
        )}

        {/* CARDS KPIS GLOBAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Histórico</span>
            <div className="mt-2">
              <h2 className="text-2xl font-bold font-mono text-white">R$ {metricasGlobais.totalGasto.toFixed(2)}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{metricasGlobais.totalKm.toFixed(0)} km acumulados</p>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custo Médio / KM</span>
            <div className="mt-2">
              <h2 className="text-2xl font-bold font-mono text-blue-400">
                R$ {metricasGlobais.custoPorKm.toFixed(2)} <span className="text-xs text-slate-400">/km</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Combustível + pedágios</p>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Economia Total</span>
            <div className="mt-2">
              <h2 className="text-2xl font-bold font-mono text-emerald-400">
                R$ {metricasGlobais.totalEconomia.toFixed(2)}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Rotas sem pedágio e veículos elétricos</p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO HORIZONTAL DE PERÍODOS REAIS */}
        {periodosDisponiveis.length > 0 && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 shadow-md">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-400" /> Períodos Encontrados:
              </span>
              <span className="text-xs font-mono text-indigo-400 font-semibold">
                Exibindo: {periodoAtualObj?.nomeCompleto}
              </span>
            </div>

            <div className="relative flex items-center">
              <div
                ref={carrosselRef}
                className="flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth flex-1 py-1"
              >
                {periodosDisponiveis.map((p) => {
                  const isSelected = periodoSelecionado === p.chave;
                  return (
                    <button
                      key={p.chave}
                      type="button"
                      onClick={() => setPeriodoSelecionado(p.chave)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-md border border-blue-400"
                          : "bg-[#131b2e] text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {p.labelPill}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* RESUMO DO PERÍODO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total no Período</span>
              <span className="text-lg font-bold font-mono text-white">R$ {metricasDoPeriodo.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Fuel size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Combustível</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                R$ {metricasDoPeriodo.combustivel.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Coins size={20} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Pedágios</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                R$ {metricasDoPeriodo.pedagio.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* TABELA BASE CONECTADA AO BANCO */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#131b2e]/60">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Lançamentos ({registrosDoPeriodo.length})
              </h3>
            </div>
          </div>

          <div className="w-full">
            <BaseDataTable
              table={table}
              isLoading={carregando}
              enablePagination={true}
              enableColumnResizing={true}
              alturaAutomatica={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}