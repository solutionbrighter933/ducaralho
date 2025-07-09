import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type: string;
}

interface WhatsAppWebhookPayload {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      'https://gzlxgqcoodjioxnipzrc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHhncWNvb2RqaW94bmlwenJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk1MTE5MiwiZXhwIjoyMDYzNTI3MTkyfQ.Bi4NvoOLiWa5bMMWSuMoTaKO0uoQ327kCROfi6_7g6c'
    );

    if (req.method === 'GET') {
      // WhatsApp webhook verification
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
        return new Response(challenge, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }

      return new Response('Forbidden', { status: 403 });
    }

    if (req.method === 'POST') {
      const payload: WhatsAppWebhookPayload = await req.json();

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const { value } = change;
            const phoneNumberId = value.metadata.phone_number_id;

            // Find the WhatsApp number in our database
            const { data: whatsappNumber } = await supabaseClient
              .from('whatsapp_numbers')
              .select('*')
              .eq('phone_number', value.metadata.display_phone_number)
              .single();

            if (!whatsappNumber) {
              console.log('WhatsApp number not found in database');
              continue;
            }

            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await processIncomingMessage(supabaseClient, whatsappNumber, message);
              }
            }

            // Process message statuses
            if (value.statuses) {
              for (const status of value.statuses) {
                await processMessageStatus(supabaseClient, status);
              }
            }
          }
        }
      }

      return new Response('OK', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

async function processIncomingMessage(
  supabaseClient: any,
  whatsappNumber: any,
  message: WhatsAppMessage
) {
  try {
    // Find or create contact
    let { data: contact } = await supabaseClient
      .from('contacts')
      .select('*')
      .eq('phone_number', message.from)
      .eq('organization_id', whatsappNumber.organization_id)
      .single();

    if (!contact) {
      const { data: newContact } = await supabaseClient
        .from('contacts')
        .insert({
          organization_id: whatsappNumber.organization_id,
          phone_number: message.from,
          name: message.from,
          status: 'active',
          last_contact: new Date().toISOString(),
        })
        .select()
        .single();
      
      contact = newContact;
    } else {
      // Update last contact time
      await supabaseClient
        .from('contacts')
        .update({ last_contact: new Date().toISOString() })
        .eq('id', contact.id);
    }

    // Find or create conversation
    let { data: conversation } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('whatsapp_number_id', whatsappNumber.id)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      const { data: newConversation } = await supabaseClient
        .from('conversations')
        .insert({
          organization_id: whatsappNumber.organization_id,
          whatsapp_number_id: whatsappNumber.id,
          contact_id: contact.id,
          status: 'active',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      conversation = newConversation;
    }

    // Save message
    const messageContent = message.text?.body || '';
    await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'customer',
        sender_id: message.from,
        content: messageContent,
        message_type: message.type,
        metadata: {
          whatsapp_message_id: message.id,
          timestamp: message.timestamp,
        },
      });

    // Update conversation last message time
    await supabaseClient
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Trigger AI response if enabled
    await triggerAIResponse(supabaseClient, conversation, messageContent);

  } catch (error) {
    console.error('Error processing message:', error);
  }
}

async function processMessageStatus(supabaseClient: any, status: any) {
  try {
    // Update message status in database
    await supabaseClient
      .from('messages')
      .update({
        metadata: {
          status: status.status,
          status_timestamp: status.timestamp,
        }
      })
      .eq('metadata->whatsapp_message_id', status.id);
  } catch (error) {
    console.error('Error processing message status:', error);
  }
}

async function triggerAIResponse(
  supabaseClient: any,
  conversation: any,
  messageContent: string
) {
  try {
    // Get AI training data for the organization
    const { data: trainingData } = await supabaseClient
      .from('ai_training_data')
      .select('*')
      .eq('organization_id', conversation.organization_id)
      .eq('is_active', true);

    // Get conversation history
    const { data: messageHistory } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(10);

    // Call AI service to generate response
    const aiResponse = await generateAIResponse(messageContent, trainingData, messageHistory);

    if (aiResponse && !aiResponse.shouldEscalate) {
      // Save AI response to database
      await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'ai',
          content: aiResponse.content,
          message_type: 'text',
          is_ai_generated: true,
          ai_confidence: aiResponse.confidence,
        });

      // Send response via WhatsApp API
      await sendWhatsAppMessage(conversation.whatsapp_number_id, conversation.contact_id, aiResponse.content);
    } else {
      // Mark conversation for human escalation
      await supabaseClient
        .from('conversations')
        .update({ 
          status: 'pending',
          metadata: { escalation_reason: 'ai_confidence_low' }
        })
        .eq('id', conversation.id);
    }
  } catch (error) {
    console.error('Error triggering AI response:', error);
  }
}

async function generateAIResponse(
  messageContent: string,
  trainingData: any[],
  messageHistory: any[]
): Promise<any> {
  // This would integrate with OpenAI API
  // For now, return a simple response
  return {
    content: 'Obrigado pela sua mensagem! Em breve um de nossos atendentes entrará em contato.',
    confidence: 0.8,
    shouldEscalate: false
  };
}

async function sendWhatsAppMessage(
  whatsappNumberId: string,
  contactId: string,
  message: string
) {
  // This would integrate with WhatsApp Business API
  // Implementation depends on your WhatsApp provider (Twilio, Meta, etc.)
  console.log('Sending WhatsApp message:', { whatsappNumberId, contactId, message });
}