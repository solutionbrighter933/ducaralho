// Z-API Service - Comunicação completa com a API da Z-API conforme documentação oficial
export interface ZAPIConfig {
  instanceId: string;
  token: string;
  clientToken: string;
  webhookUrl?: string;
}

export interface ZAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface SendMessagePayload {
  phone: string;
  message: string;
}

export interface Contact {
  name: string;
  phone: string;
  notify: string;
  short: string;
  imgUrl: string;
}

export interface Chat {
  id: string;
  name: string;
  image: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage: {
    content: string;
    timestamp: number;
    fromMe: boolean;
  };
}

export interface ChatMetadata {
  id: string;
  name: string;
  image: string;
  isGroup: boolean;
  unreadCount: number;
  messages: Array<{
    id: string;
    content: string;
    timestamp: number;
    fromMe: boolean;
    type: string;
  }>;
}

export interface DeviceInfo {
  connected: boolean;
  phone?: string;
  name?: string;
  id?: string;
  status?: string;
}

export class ZAPIService {
  private config: ZAPIConfig;
  private baseURL: string;

  constructor() {
    this.config = {
      instanceId: import.meta.env.VITE_ZAPI_INSTANCE_ID || '3E34EADF8CD1007B145E2A88B4975A95',
      token: import.meta.env.VITE_ZAPI_TOKEN || '7C19DEAA164FD4EF8312E717',
      clientToken: 'F4a554efd9a4b4e51903dda0db517ffcaS', // Client-Token fixo conforme documentação
      webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL,
    };

    // URL conforme documentação oficial: /instances/{instance}/token/{token}/
    this.baseURL = `https://api.z-api.io/instances/${this.config.instanceId}/token/${this.config.token}`;
    
    console.log('🔧 Z-API Service initialized:', {
      instanceId: this.config.instanceId ? 'Configured ✅' : 'Missing ❌',
      token: this.config.token ? 'Configured ✅' : 'Missing ❌',
      clientToken: this.config.clientToken ? 'Configured ✅' : 'Missing ❌',
      webhookUrl: this.config.webhookUrl ? 'Configured ✅' : 'Missing ❌',
      baseURL: this.baseURL
    });
  }

  // Verificar se as credenciais estão configuradas
  private checkCredentials(): boolean {
    if (!this.config.instanceId || !this.config.token || !this.config.clientToken) {
      throw new Error('Credenciais da Z-API não configuradas completamente');
    }
    return true;
  }

  // Fazer requisição para a Z-API conforme documentação oficial
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<ZAPIResponse> {
    this.checkCredentials();

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      console.log(`🔄 Z-API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.config.clientToken, // Header conforme documentação
          ...options.headers,
        },
      });

      console.log(`📡 Z-API Response Status: ${response.status} ${response.statusText}`);

      // Para endpoints de QR Code, tratar diferentes tipos de resposta
      if (endpoint === '/qr-code/image' || endpoint === '/qr-code') {
        return await this.handleQRCodeResponse(response, endpoint);
      }

      // Para outros endpoints, processar normalmente
      const responseText = await response.text();
      console.log(`📄 Z-API Response Body: ${responseText.substring(0, 200)}...`);

      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.warn('⚠️ Failed to parse Z-API response as JSON:', responseText);
        data = { message: responseText };
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || data.description || responseText || `HTTP ${response.status}: ${response.statusText}`;
        
        console.error('❌ Z-API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          responseBody: data,
          errorMessage
        });

        // Verificar se o erro é "You need to be connected" - isso é esperado quando não está conectado
        if (errorMessage.includes('You need to be connected')) {
          console.log('ℹ️ Device not connected yet - this is expected before QR scan');
          return {
            success: false,
            error: 'Dispositivo não conectado. Escaneie o QR Code para conectar.',
            data: { connected: false }
          };
        }

        return {
          success: false,
          error: `Z-API Error (${response.status}): ${errorMessage}`,
          data
        };
      }

      // Para o endpoint /status, sempre tratar resposta 200 como sucesso
      // O campo "error" na resposta é apenas informativo sobre o status da conexão
      if (endpoint === '/status' && response.ok) {
        console.log('✅ Z-API Status response received successfully');
        
        // Verificar múltiplas formas de indicar conexão
        const isConnected = data.connected === true || 
                           data.status === 'CONNECTED' ||
                           data.status === 'connected' ||
                           (data.error && (
                             data.error.includes('already connected') ||
                             data.error.includes('You are already connected') ||
                             data.error.includes('connected')
                           ));
        
        if (isConnected) {
          console.log('✅ Status indicates device is connected');
          return {
            success: true,
            data: {
              ...data,
              connected: true,
              status: 'CONNECTED'
            },
            message: 'Status retrieved successfully - device is connected'
          };
        }
        
        return {
          success: true,
          data,
          message: data.message || 'Status retrieved successfully'
        };
      }

      // Para outros endpoints, verificar se há erro no JSON mesmo com status 200
      if (data.error && !endpoint.includes('/status')) {
        console.error('❌ Z-API returned error in response body:', {
          status: response.status,
          url: url,
          error: data.error,
          message: data.message,
          fullResponse: data
        });

        const errorMessage = data.message || data.error || 'Erro desconhecido da Z-API';
        
        return {
          success: false,
          error: `Z-API Error: ${errorMessage}`,
          data
        };
      }

      return {
        success: true,
        data,
        message: data.message
      };
    } catch (error) {
      console.error('❌ Z-API Request Error:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Erro de conexão: Não foi possível conectar à Z-API. Verifique sua conexão com a internet.'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão com Z-API'
      };
    }
  }

  // Tratar resposta específica dos endpoints de QR Code
  private async handleQRCodeResponse(response: Response, endpoint: string): Promise<ZAPIResponse> {
    try {
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Z-API QR Code Error (${endpoint}):`, response.status, errorText);
        
        // Check if the error indicates the instance is already connected
        if (response.status === 400 || response.status === 409) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.connected === true || errorText.includes('already connected')) {
              console.log('✅ Instance already connected - no QR code needed');
              return {
                success: true,
                data: {
                  alreadyConnected: true,
                  message: 'WhatsApp já está conectado'
                }
              };
            }
          } catch (parseError) {
            // If we can't parse the error, continue with normal error handling
          }
        }
        
        return {
          success: false,
          error: `Z-API Error (${response.status}): ${errorText || response.statusText}`,
          data: { status: response.status, statusText: response.statusText }
        };
      }

      const contentType = response.headers.get('content-type') || '';
      console.log(`📄 Z-API QR Code Response Content-Type: ${contentType}`);

      // Se for uma imagem binária (endpoint /qr-code/image pode retornar imagem direta)
      if (contentType.includes('image/')) {
        console.log('📸 Processing binary image response...');
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        return {
          success: true,
          data: {
            qrCode: dataUrl,
            type: 'binary_image',
            contentType,
            endpoint
          }
        };
      }

      // Se for texto/JSON
      const responseText = await response.text();
      console.log(`📄 Z-API QR Code Response Text: ${responseText.substring(0, 200)}...`);

      // Tentar fazer parse como JSON primeiro
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log('📋 Parsed as JSON successfully');
        
        // Check if the response indicates the instance is already connected
        if (data.connected === true) {
          console.log('✅ Instance already connected - no QR code needed');
          return {
            success: true,
            data: {
              alreadyConnected: true,
              message: 'WhatsApp já está conectado'
            }
          };
        }
      } catch (parseError) {
        console.log('📝 Response is not JSON, treating as raw data');
        
        // Se não conseguir fazer parse, assumir que é base64 direto ou outro formato
        if (responseText.length > 100 && !responseText.includes('{')) {
          // Provavelmente é base64 direto
          const qrCode = responseText.startsWith('data:') ? responseText : `data:image/png;base64,${responseText}`;
          return {
            success: true,
            data: {
              qrCode,
              type: 'raw_base64',
              endpoint
            }
          };
        }
        
        return {
          success: false,
          error: `Resposta inválida do endpoint ${endpoint}: ${responseText.substring(0, 100)}...`
        };
      }

      // Se conseguiu fazer parse do JSON, extrair QR Code
      if (data) {
        const qrCodeValue = data.qrcode || data.qr_code || data.value || data.image || data.data;
        
        if (qrCodeValue) {
          let qrCode: string;
          
          if (typeof qrCodeValue === 'string') {
            qrCode = qrCodeValue.startsWith('data:') ? qrCodeValue : `data:image/png;base64,${qrCodeValue}`;
          } else {
            console.warn('⚠️ QR Code value is not a string:', typeof qrCodeValue);
            qrCode = String(qrCodeValue);
          }
          
          return {
            success: true,
            data: {
              qrCode,
              type: 'json_response',
              endpoint,
              originalData: data
            }
          };
        } else {
          console.error('❌ No QR Code found in response:', data);
          return {
            success: false,
            error: `QR Code não encontrado na resposta do endpoint ${endpoint}`,
            data
          };
        }
      }

      return {
        success: false,
        error: `Resposta vazia do endpoint ${endpoint}`
      };
    } catch (error) {
      console.error(`❌ Error processing QR Code response from ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar resposta do QR Code'
      };
    }
  }

  // ========== MÉTODOS DE CONEXÃO ==========

  // Obter QR Code para conexão - MÉTODO PRINCIPAL CONFORME SOLICITADO
  async getQRCode(): Promise<ZAPIResponse> {
    try {
      console.log('🔄 Getting QR Code from Z-API via /qr-code/image endpoint...');
      
      // Remover verificação de status antes de gerar QR Code
      // O QR Code deve ser gerado independentemente do status atual
      const result = await this.makeRequest('/qr-code/image', {
        method: 'GET',
      });

      if (result.success) {
        if (result.data?.alreadyConnected) {
          console.log('✅ Instance already connected - no QR code needed');
          return result;
        } else if (result.data?.qrCode) {
          console.log('✅ QR Code obtained successfully from /qr-code/image');
          return result;
        } else {
          console.error('❌ Unexpected response format:', result.data);
          return {
            success: false,
            error: 'Formato de resposta inesperado do endpoint /qr-code/image'
          };
        }
      } else {
        // Se o erro indicar que já está conectado, retornar sucesso
        if (result.error && (
            result.error.includes('already connected') || 
            (result.data && result.data.connected === true)
        )) {
          console.log('✅ Error indicates instance is already connected');
          return {
            success: true,
            data: {
              alreadyConnected: true,
              message: 'WhatsApp já está conectado',
              originalError: result.error
            }
          };
        }
        
        console.error('❌ Failed to get QR Code:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Error getting QR Code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter QR Code'
      };
    }
  }

  // Obter informações do dispositivo após conexão - MÉTODO PRINCIPAL CONFORME SOLICITADO
  async getDeviceInfo(): Promise<ZAPIResponse> {
    try {
      console.log('🔄 Getting device info via /device endpoint...');
      
      const result = await this.makeRequest('/device', {
        method: 'GET',
      });

      if (result.success && result.data) {
        console.log('✅ Device info retrieved:', result.data);
        
        // Normalizar resposta do device
        const deviceData = result.data;
        const isConnected = deviceData?.connected === true || 
                           deviceData?.status === 'CONNECTED' || 
                           deviceData?.status === 'connected';
        
        const normalizedData: DeviceInfo = {
          connected: isConnected,
          phone: deviceData?.phone || deviceData?.phoneNumber || null,
          name: deviceData?.name || deviceData?.displayName || null,
          id: deviceData?.id || null,
          status: isConnected ? 'CONNECTED' : 'DISCONNECTED'
        };
        
        return {
          success: true,
          data: normalizedData
        };
      } else {
        // Se o erro for "You need to be connected", isso é esperado antes da conexão
        if (result.error && result.error.includes('You need to be connected')) {
          console.log('ℹ️ Device not connected yet - this is expected before QR scan');
          return {
            success: false,
            error: null, // Não retornar erro para não mostrar na UI
            data: { 
              connected: false,
              status: 'DISCONNECTED',
              waitingForQrScan: true
            }
          };
        }
        
        console.error('❌ Failed to get device info:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Error getting device info:', error);
      
      // Se o erro for "You need to be connected", não é um erro real
      if (error instanceof Error && error.message.includes('You need to be connected')) {
        return {
          success: false,
          error: null, // Não retornar erro para não mostrar na UI
          data: { 
            connected: false,
            status: 'DISCONNECTED',
            waitingForQrScan: true
          }
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter informações do device'
      };
    }
  }

  // Verificar status da conexão - MÉTODO PRINCIPAL PARA MONITORAMENTO
  async getConnectionStatus(): Promise<ZAPIResponse> {
    try {
      console.log('🔄 Checking Z-API connection status via /status...');
      
      const result = await this.makeRequest('/status', {
        method: 'GET',
      });

      if (result.success) {
        const statusData = result.data;
        
        // Normalizar resposta do status - VERIFICAÇÃO MAIS ROBUSTA
        const isConnected = statusData?.connected === true || 
                           statusData?.status === 'CONNECTED' || 
                           statusData?.status === 'connected' ||
                           (statusData?.error && (
                             statusData.error.includes('already connected') ||
                             statusData.error.includes('You are already connected') ||
                             statusData.error.includes('connected')
                           ));
        
        const normalizedData = {
          connected: isConnected,
          status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
          phone: statusData?.phone || statusData?.phoneNumber || null,
          name: statusData?.name || statusData?.displayName || null,
          originalData: statusData
        };
        
        console.log('✅ Connection status retrieved:', normalizedData);
        
        return {
          success: true,
          data: normalizedData
        };
      } else {
        console.error('❌ Failed to get connection status:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Error getting connection status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar status'
      };
    }
  }

  // Método específico para verificar se está conectado (mais direto)
  async isConnected(): Promise<boolean> {
    try {
      console.log('🔍 Quick connection check...');
      
      const result = await this.getConnectionStatus();
      
      if (result.success && result.data) {
        const connected = result.data.connected === true;
        console.log(`📊 Quick check result: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
        return connected;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error in quick connection check:', error);
      return false;
    }
  }

  // Desconectar instância
  async disconnectInstance(): Promise<ZAPIResponse> {
    try {
      console.log('🔄 Disconnecting Z-API instance...');
      
      const result = await this.makeRequest('/disconnect', {
        method: 'GET', // Conforme documentação, é GET
      });

      if (result.success) {
        console.log('✅ Z-API instance disconnected successfully');
      } else {
        console.error('❌ Failed to disconnect Z-API instance:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error disconnecting instance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao desconectar instância'
      };
    }
  }

  // ========== MÉTODOS DE CONTATOS ==========

  // Obter todos os contatos
  async getContacts(): Promise<ZAPIResponse> {
    try {
      console.log('📞 Getting contacts from Z-API...');
      
      const result = await this.makeRequest('/contacts', {
        method: 'GET',
      });

      if (result.success) {
        console.log('✅ Contacts retrieved successfully:', result.data?.length || 0, 'contacts');
      } else {
        console.error('❌ Failed to get contacts:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting contacts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter contatos'
      };
    }
  }

  // Obter metadata de um contato específico
  async getContactMetadata(phone: string): Promise<ZAPIResponse> {
    try {
      console.log(`📞 Getting contact metadata for ${phone}...`);
      
      // Limpar número de telefone
      const cleanPhone = phone.replace(/\D/g, '');
      
      const result = await this.makeRequest(`/contacts/${cleanPhone}`, {
        method: 'GET',
      });

      if (result.success) {
        console.log('✅ Contact metadata retrieved:', result.data);
      } else {
        console.error('❌ Failed to get contact metadata:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting contact metadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter metadata do contato'
      };
    }
  }

  // ========== MÉTODOS DE CHATS ==========

  // Obter todos os chats
  async getChats(): Promise<ZAPIResponse> {
    try {
      console.log('💬 Getting chats from Z-API...');
      
      const result = await this.makeRequest('/chats', {
        method: 'GET',
      });

      if (result.success) {
        console.log('✅ Chats retrieved successfully:', result.data?.length || 0, 'chats');
      } else {
        console.error('❌ Failed to get chats:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting chats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter chats'
      };
    }
  }

  // Obter metadata de um chat específico (NOVO MÉTODO)
  async getChatMetadata(phone: string): Promise<ZAPIResponse> {
    try {
      console.log(`💬 Getting chat metadata for ${phone}...`);
      
      // Limpar número de telefone
      const cleanPhone = phone.replace(/\D/g, '');
      
      const result = await this.makeRequest(`/chats/${cleanPhone}`, {
        method: 'GET',
      });

      if (result.success) {
        console.log('✅ Chat metadata retrieved:', result.data);
      } else {
        console.error('❌ Failed to get chat metadata:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting chat metadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter metadata do chat'
      };
    }
  }

  // Modificar chat (marcar como lido, etc.) - MÉTODO ATUALIZADO
  async modifyChat(phone: string, action: 'read' | 'unread' | 'archive' | 'unarchive' | 'pin' | 'unpin'): Promise<ZAPIResponse> {
    try {
      console.log(`💬 Modifying chat ${phone} with action: ${action}...`);
      
      // Limpar número de telefone
      const cleanPhone = phone.replace(/\D/g, '');
      
      const result = await this.makeRequest('/modify-chat', {
        method: 'POST',
        body: JSON.stringify({
          phone: cleanPhone,
          action: action
        }),
      });

      if (result.success) {
        console.log('✅ Chat modified successfully');
      } else {
        console.error('❌ Failed to modify chat:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error modifying chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao modificar chat'
      };
    }
  }

  // ========== MÉTODOS DE MENSAGENS ==========

  // Enviar mensagem de texto
  async sendTextMessage(phone: string, message: string): Promise<ZAPIResponse> {
    try {
      console.log(`📤 Sending text message to ${phone}...`);
      
      // Limpar e formatar número de telefone
      const cleanPhone = phone.replace(/\D/g, '');
      
      const payload: SendMessagePayload = {
        phone: cleanPhone,
        message: message.trim(),
      };

      const result = await this.makeRequest('/send-text', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (result.success) {
        console.log(`✅ Message sent successfully to ${phone}`);
      } else {
        console.error(`❌ Failed to send message to ${phone}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem'
      };
    }
  }

  // Marcar mensagem como lida - MÉTODO PRINCIPAL CONFORME DOCUMENTAÇÃO
  async markMessageAsRead(phone: string, messageId?: string): Promise<ZAPIResponse> {
    try {
      console.log(`📖 Marking message as read for ${phone}...`);
      
      // Limpar número de telefone
      const cleanPhone = phone.replace(/\D/g, '');
      
      const payload: any = {
        phone: cleanPhone
      };

      if (messageId) {
        payload.messageId = messageId;
      }

      const result = await this.makeRequest('/read-message', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (result.success) {
        console.log('✅ Message marked as read successfully');
      } else {
        console.error('❌ Failed to mark message as read:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao marcar mensagem como lida'
      };
    }
  }

  // Ativar leitura automática de mensagens
  async updateAutoReadMessage(enable: boolean = true): Promise<ZAPIResponse> {
    try {
      console.log(`📖 ${enable ? 'Enabling' : 'Disabling'} auto-read messages...`);
      
      const result = await this.makeRequest('/update-auto-read-message', {
        method: 'PUT',
        body: JSON.stringify({
          value: enable
        }),
      });

      if (result.success) {
        console.log(`✅ Auto-read messages ${enable ? 'enabled' : 'disabled'} successfully`);
      } else {
        console.error('❌ Failed to update auto-read setting:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error updating auto-read setting:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar leitura automática'
      };
    }
  }

  // Obter mensagens de um chat específico (NOVO MÉTODO)
  async getChatMessages(phone: string, limit: number = 50): Promise<ZAPIResponse> {
    try {
      console.log(`📨 Getting messages for chat ${phone}...`);
      
      // Limpar número de telefone
      const cleanPhone = phone.replace(/\D/g, '');
      
      const result = await this.makeRequest(`/messages/${cleanPhone}?limit=${limit}`, {
        method: 'GET',
      });

      if (result.success) {
        console.log('✅ Chat messages retrieved:', result.data?.length || 0, 'messages');
      } else {
        console.error('❌ Failed to get chat messages:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter mensagens do chat'
      };
    }
  }

  // ========== MÉTODOS DE CONFIGURAÇÃO ==========

  // Configurar webhook
  async setWebhook(webhookUrl: string): Promise<ZAPIResponse> {
    try {
      console.log(`🔄 Setting webhook: ${webhookUrl}`);
      
      const result = await this.makeRequest('/webhook', {
        method: 'POST',
        body: JSON.stringify({
          webhook: webhookUrl,
        }),
      });

      if (result.success) {
        console.log('✅ Webhook configured successfully');
        this.config.webhookUrl = webhookUrl;
      } else {
        console.error('❌ Failed to set webhook:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error setting webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao configurar webhook'
      };
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  // Conectar instância - A conexão é iniciada automaticamente ao solicitar o QR Code
  async connectInstance(): Promise<ZAPIResponse> {
    try {
      console.log('🔄 Initiating Z-API connection by requesting QR Code...');
      
      // A conexão é iniciada automaticamente ao solicitar o QR Code
      const qrResult = await this.getQRCode();
      
      if (qrResult.success) {
        console.log('✅ Z-API connection initiated successfully - QR Code ready');
        return {
          success: true,
          data: { 
            message: 'Connection initiated - scan QR Code to complete', 
            ...qrResult.data 
          }
        };
      } else {
        console.error('❌ Failed to initiate Z-API connection:', qrResult.error);
        return qrResult;
      }
    } catch (error) {
      console.error('❌ Error connecting Z-API instance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao conectar instância'
      };
    }
  }

  // Verificar se as credenciais estão válidas
  async validateCredentials(): Promise<boolean> {
    try {
      const result = await this.getConnectionStatus();
      return result.success;
    } catch (error) {
      console.error('❌ Error validating credentials:', error);
      return false;
    }
  }

  // Obter configuração atual
  getConfig(): ZAPIConfig {
    return { ...this.config };
  }

  // Verificar se o serviço está configurado corretamente
  isConfigured(): boolean {
    return !!(this.config.instanceId && this.config.token && this.config.clientToken);
  }
}

// Instância singleton do serviço Z-API
export const zapiService = new ZAPIService();