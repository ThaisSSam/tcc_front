import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, AlertCircle } from 'lucide-react';
import { VeiculoForm } from './veiculoForm';
import { veiculosEndpoints } from '../../../services/endpoints/veiculos';
import { type Veiculo } from '../consultarVeiculos/table/tableConfig';

export default function CadastrarVeiculoScreen() {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSalvar = async (dados: Omit<Veiculo, 'id'>) => {
    try {
      setSalvando(true);
      setErro(null);

      // Converte a tipagem do form para a tipagem esperada pela API .NET
      await veiculosEndpoints.cadastrar({
        apelido: dados.apelido,
        marca: dados.marca,
        modelo: dados.modelo,
        ano_fabricacao: dados.anoFabricacao,
        tipo_propulsao: dados.tipoPropulsao,
        consumo_kml: dados.tipoPropulsao === 'eletrico' ? null : dados.consumo,
        consumo_kwh_100km: dados.tipoPropulsao === 'eletrico' ? dados.consumo : null,
        capacidade_bateria_kwh: dados.capacidadeBateria,
        autonomia_km: dados.autonomiaKm,
        fonte_consumo: 'catalogo/manual',
      });

      navigate('/veiculos');
    } catch (err: any) {
      setErro(err.message || 'Erro ao persistir o veículo na garagem.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-y-auto bg-[#090d16] p-6 space-y-6">
      <header className="flex items-center gap-3 border-b border-slate-800 pb-5">
        <div className="w-10 h-10 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center border border-blue-500/20">
          <Car size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Cadastrar Novo Veículo</h1>
          <p className="text-xs text-slate-500">
            Adicione um carro à sua garagem com busca automática de consumo médio
          </p>
        </div>
      </header>

      {erro && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2 max-w-3xl">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <main>
        <VeiculoForm onSubmit={handleSalvar} salvando={salvando} />
      </main>
    </div>
  );
}