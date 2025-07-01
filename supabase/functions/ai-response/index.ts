import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AITrainingData {
  category: string;
  question: string;
  answer: string;
  context?: string;
}

interface AIResponse {
  content: string;
  confidence: number;
  category?: string;
  shouldEscalate: boolean;
}

class OpenAIService {
  private systemPrompt = `
    Você é um assistente de atendimento ao cliente inteligente e prestativo. 
    Suas responsabilidades incluem:
    
    1. Responder perguntas dos clientes de forma clara e útil
    2. Manter um tom profissional e amigável
    3. Usar as informações de treinamento fornecidas para dar respostas precisas
    4. Identificar quando uma conversa precisa ser escalada para um agente humano
    5. Sempre responder em português brasileiro
    
    Se você não souber a resposta para algo, seja honesto e sugira escalar para um agente humano.
    Se a pergunta for muito complexa ou sensível, recomende falar com um agente.
  `;

  async generateResponse(
    customerMessage: string,
    trainingData: AITrainingData[],
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<AIResponse> {
    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      // Create context from training data
      const context = trainingData.map(data => 
        `Categoria: ${data.category}\nPergunta: ${data.question}\nResposta: ${data.answer}`
      ).join('\n\n');

      const messages = [
        {
          role: 'system',
          content: `${this.systemPrompt}\n\nInformações de treinamento:\n${context}`
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: customerMessage
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.7,
          max_tokens: 500,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const completion = await response.json();
      const responseContent = completion.choices[0]?.message?.content || '';
      
      // Calculate confidence based on response characteristics
      const confidence = this.calculateConfidence(responseContent, trainingData, customerMessage);
      
      // Determine if escalation is needed
      const shouldEscalate = this.shouldEscalateToHuman(customerMessage, responseContent, confidence);

      return {
        content: responseContent,
        confidence,
        shouldEscalate
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Falha ao gerar resposta da IA');
    }
  }

  // Calculate response confidence
  private calculateConfidence(
    response: string,
    trainingData: AITrainingData[],
    customerMessage: string
  ): number {
    // Simple confidence calculation based on response length and training data relevance
    let confidence = 0.5;

    // Increase confidence if response is detailed
    if (response.length > 50) confidence += 0.2;
    if (response.length > 100) confidence += 0.1;

    // Increase confidence if training data contains similar questions
    const similarQuestions = trainingData.filter(data =>
      this.calculateSimilarity(data.question, customerMessage) > 0.7
    );
    
    if (similarQuestions.length > 0) confidence += 0.2;
    if (similarQuestions.length > 2) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  // Determine if conversation should be escalated to human
  private shouldEscalateToHuman(
    customerMessage: string,
    aiResponse: string,
    confidence: number
  ): boolean {
    // Escalate if confidence is too low
    if (confidence < 0.6) return true;

    // Escalate if customer is asking for human agent
    const escalationKeywords = [
      'falar com atendente',
      'quero falar com humano',
      'transferir para pessoa',
      'não entendi',
      'isso não resolve',
      'quero cancelar',
      'problema urgente'
    ];

    const messageText = customerMessage.toLowerCase();
    if (escalationKeywords.some(keyword => messageText.includes(keyword))) {
      return true;
    }

    // Escalate if AI response indicates uncertainty
    const uncertaintyIndicators = [
      'não tenho certeza',
      'não sei',
      'talvez',
      'possivelmente',
      'recomendo falar com'
    ];

    const responseText = aiResponse.toLowerCase();
    if (uncertaintyIndicators.some(indicator => responseText.includes(indicator))) {
      return true;
    }

    return false;
  }

  // Calculate similarity between two strings (simple implementation)
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(' ');
    const words2 = str2.toLowerCase().split(' ');
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const supabaseClient = createClient(
      'https://gzlxgqcoodjioxnipzrc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHhncWNvb2RqaW94bmlwenJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk1MTE5MiwiZXhwIjoyMDYzNTI3MTkyfQ.Bi4NvoOLiWa5bMMWSuMoTaKO0uoQ327kCROfi6_7g6c'
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Verify the user session
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const { customerMessage, trainingData, conversationHistory } = await req.json();

    if (!customerMessage) {
      return new Response('Missing customerMessage', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const openAIService = new OpenAIService();
    const aiResponse = await openAIService.generateResponse(
      customerMessage,
      trainingData || [],
      conversationHistory || []
    );

    return new Response(JSON.stringify(aiResponse), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('AI Response Function Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), 
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});