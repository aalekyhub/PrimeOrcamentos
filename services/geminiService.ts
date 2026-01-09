
import { GoogleGenAI, Type } from "@google/genai";
import { ServiceOrder, Transaction } from "../types";

// Função para inicializar o AI de forma segura
const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '') return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (e) {
    console.error("Erro ao inicializar GoogleGenAI:", e);
    return null;
  }
};

export const getFinancialInsights = async (
  orders: ServiceOrder[],
  transactions: Transaction[]
) => {
  const ai = getAI();
  if (!ai) return "Inteligência artificial desativada (Chave de API ausente).";

  const model = 'gemini-3-pro-preview';
  const prompt = `
    Analise os seguintes dados comerciais e forneça 3 insights estratégicos principais em Português Brasileiro.
    
    Ordens de Serviço: ${JSON.stringify(orders.slice(0, 10))}
    Transações Recentes: ${JSON.stringify(transactions.slice(0, 10))}
    
    Forneça insights sobre:
    1. Tendências de lucratividade.
    2. Eficiência operacional.
    3. Previsão de fluxo de caixa.
    Seja conciso e use um tom profissional.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro nos Insights do Gemini:", error);
    return "Não foi possível gerar insights no momento.";
  }
};

export const generateBudgetFromDescription = async (description: string): Promise<Partial<ServiceOrder>> => {
  const ai = getAI();
  if (!ai) throw new Error("Serviço de IA não disponível.");

  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model,
    contents: `Com base nesta solicitação de serviço: "${description}", gere uma lista estimada de itens e o preço total em Reais (BRL). Responda em Português Brasileiro e no formato JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                type: { type: Type.STRING }
              },
              required: ["description", "quantity", "unitPrice", "type"]
            }
          },
          totalAmount: { type: Type.NUMBER }
        },
        required: ["items", "totalAmount"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};
