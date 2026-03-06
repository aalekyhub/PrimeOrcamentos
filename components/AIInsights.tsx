import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { ServiceOrder, Transaction } from '../types';
import { getFinancialInsights } from '../PrimeOrcamentos/services/geminiService';

interface AIInsightsProps {
  orders: ServiceOrder[];
  transactions: Transaction[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ orders, transactions }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchInsight = useCallback(async () => {
    if (loading) return;

    if (!orders.length && !transactions.length) {
      setInsight('Ainda não há dados suficientes para gerar insights.');
      return;
    }

    try {
      setLoading(true);
      const text = await getFinancialInsights(orders, transactions);
      setInsight(text || 'Nenhum insight disponível no momento.');
    } catch (error) {
      console.error('Erro ao buscar insight:', error);
      setInsight('Não foi possível carregar os insights agora.');
    } finally {
      setLoading(false);
    }
  }, [orders, transactions, loading]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!orders.length && !transactions.length) {
        if (isMounted) {
          setInsight('Ainda não há dados suficientes para gerar insights.');
        }
        return;
      }

      try {
        setLoading(true);
        const text = await getFinancialInsights(orders, transactions);

        if (isMounted) {
          setInsight(text || 'Nenhum insight disponível no momento.');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao buscar insight:', error);
          setInsight('Não foi possível carregar os insights agora.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [orders, transactions]);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl text-white shadow-xl shadow-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h4 className="font-bold uppercase tracking-wider text-xs opacity-90">
            Inteligência Gemini
          </h4>
        </div>

        <button
          onClick={fetchInsight}
          disabled={loading}
          title="Atualizar insights"
          aria-label="Atualizar insights"
          className="p-1 hover:bg-white/20 rounded-lg disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-3 bg-white/20 rounded-full w-full animate-pulse"></div>
          <div className="h-3 bg-white/20 rounded-full w-4/5 animate-pulse"></div>
        </div>
      ) : (
        <div className="text-sm leading-relaxed whitespace-pre-line opacity-95 italic">
          {insight || 'Carregando insights...'}
        </div>
      )}

      {!loading && (
        <button
          disabled
          className="mt-6 w-full py-2 bg-white/10 rounded-xl text-xs font-semibold border border-white/10 opacity-50 cursor-not-allowed"
        >
          Ver Relatório Estratégico
        </button>
      )}
    </div>
  );
};

export default AIInsights;