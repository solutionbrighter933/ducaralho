import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Upload, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  X,
  Monitor,
  Headphones,
  Clock,
  FileAudio,
  Send,
  Bot,
  User,
  RefreshCw
} from 'lucide-react';

interface AppNotification {
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AudioRecording {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  type: 'microphone' | 'system';
}

interface N8NResponse {
  id: string;
  transcricao: string;
  insights: string;
  resumo: string;
  timestamp: Date;
  metadata?: any;
}

interface MeetingProps {
  addAppNotification?: (notification: AppNotification) => void;
}

const Meeting: React.FC<MeetingProps> = ({ addAppNotification }) => {
  // Estados para gravação de microfone
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingToN8N, setUploadingToN8N] = useState(false);

  // Estados para gravação do sistema
  const [isSystemRecording, setIsSystemRecording] = useState(false);
  const [systemRecordingTime, setSystemRecordingTime] = useState(0);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [systemUploadingToN8N, setSystemUploadingToN8N] = useState(false);

  // Estados para respostas do N8N
  const [n8nResponses, setN8nResponses] = useState<N8NResponse[]>([]);
  const [waitingForTranscription, setWaitingForTranscription] = useState(false);
  const [waitingForInsights, setWaitingForInsights] = useState(false);

  // Refs para MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const systemMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const systemAudioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);

  // Timer refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const systemTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (systemTimerRef.current) clearInterval(systemTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (systemStreamRef.current) {
        systemStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Função para enviar áudio para o N8N e aguardar resposta
  const sendAudioToN8N = async (
    audioBlob: Blob, 
    metadata: any,
    setUploadingState: (loading: boolean) => void
  ): Promise<N8NResponse | null> => {
    try {
      setUploadingState(true);
      setError(null);

      const webhookUrl = import.meta.env.VITE_N8N_MEETING_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('URL do webhook não configurada. Configure VITE_N8N_MEETING_WEBHOOK_URL no arquivo .env');
      }

      console.log('📤 Enviando áudio para processamento...', {
        audioSize: audioBlob.size,
        audioType: audioBlob.type,
        metadata
      });

      // Preparar FormData
      const formData = new FormData();
      const fileName = `audio_${metadata.type}_${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'wav'}`;
      formData.append('audio', audioBlob, fileName);
      formData.append('metadata', JSON.stringify(metadata));

      // Enviar para processamento
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no processamento (${response.status}): ${errorText || response.statusText}`);
      }

      // Processar resposta
      const responseText = await response.text();
      console.log(`📄 Response: ${responseText.substring(0, 200)}...`);

      let responseData;
      
      // Tentar parsear como JSON primeiro
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('📋 Response parsed as JSON:', jsonResponse);
        
        responseData = jsonResponse;
      } catch (parseError) {
        console.log('📝 Response is not JSON, using as text');
        responseData = { transcricao: responseText, insights: '', resumo: '' };
      }

      // Extrair dados da resposta
      const transcricao = responseData.transcricao || responseData.transcription || responseData.traducao || '';
      const insights = responseData.insights || responseData.analise || responseData.analysis || '';
      const resumo = responseData.resumo || responseData.summary || responseData.sumario || '';

      // Verificar se pelo menos a transcrição existe
      if (!transcricao || transcricao.trim() === '') {
        throw new Error('Transcrição vazia do processamento');
      }

      console.log('✅ Response processada com sucesso');

      // Criar resposta estruturada
      const n8nResponse: N8NResponse = {
        id: `transcription-${Date.now()}`,
        transcricao: transcricao.trim(),
        insights: insights.trim(),
        resumo: resumo.trim(),
        timestamp: new Date(),
        metadata: {
          audioType: metadata.type,
          audioDuration: metadata.duration,
          originalFileName: fileName
        }
      };

      setN8nResponses(prev => [...prev, n8nResponse]);

      // Notificar sucesso da tradução
      if (addAppNotification) {
        addAppNotification({
          title: '📝 Processamento Concluído',
          message: `Análise do áudio ${metadata.type === 'system' ? 'do sistema' : 'do microfone'} concluída com sucesso!`,
          type: 'success'
        });
      }

      setSuccess(`✅ Áudio processado e análise concluída!`);
      setTimeout(() => setSuccess(null), 5000);

      return n8nResponse;

    } catch (err) {
      console.error('❌ Erro ao processar áudio:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao enviar áudio';
      setError(errorMessage);

      return null;
    } finally {
      setUploadingState(false);
    }
  };

  // Função para limpar respostas do N8N
  const clearN8NResponses = () => {
    setN8nResponses([]);
    setError(null);
    setSuccess(null);
  };

  // Função para formatar tempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para formatar timestamp
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // ========== GRAVAÇÃO DE MICROFONE ==========

  const startRecording = async () => {
    try {
      setError(null);
      setSuccess(null);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        const recording: AudioRecording = {
          id: Date.now().toString(),
          name: `Gravação ${new Date().toLocaleString('pt-BR')}`,
          blob: audioBlob,
          duration: recordingTime,
          timestamp: new Date(),
          type: 'microphone'
        };

        setRecordings(prev => [...prev, recording]);

        // Enviar para N8N automaticamente e aguardar resposta
        const metadata = {
          type: 'microphone',
          duration: recordingTime,
          timestamp: new Date().toISOString(),
          title: recording.name,
          user_id: 'attendos_user',
          session_id: `meeting_${Date.now()}`,
          language: 'pt-BR'
        };

        await sendAudioToN8N(audioBlob, metadata, setUploadingToN8N);

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      if (addAppNotification) {
        addAppNotification({
          title: '🎙️ Gravação Iniciada',
          message: 'Gravação do microfone iniciada com sucesso!',
          type: 'info'
        });
      }

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Erro ao iniciar gravação');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        
        // Resume timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        
        // Pause timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // ========== GRAVAÇÃO DO SISTEMA ==========

  const startSystemAudioRecording = async () => {
    try {
      setError(null);
      setSuccess(null);

      console.log('🎙️ Solicitando permissão para capturar áudio...');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        },
        video: {
          mediaSource: 'screen'
        }
      });

      // Verificar se o áudio foi capturado
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('Nenhuma faixa de áudio foi capturada. Certifique-se de marcar "Compartilhar áudio do sistema" na janela de permissão.');
      }

      console.log('✅ Permissão concedida, iniciando gravação...');
      console.log('📊 Faixas de áudio capturadas:', audioTracks.length);
      
      systemStreamRef.current = stream;
      systemAudioChunksRef.current = [];

      // Usar apenas as faixas de áudio para o MediaRecorder
      const audioOnlyStream = new MediaStream(audioTracks);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      systemMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          systemAudioChunksRef.current.push(event.data);
          console.log('📊 Chunk de áudio coletado:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 Gravação finalizada, processando áudio...');
        await stopSystemAudioRecording();
      };

      // Detectar quando o usuário para o compartilhamento (áudio ou vídeo)
      const allTracks = stream.getTracks();
      allTracks.forEach(track => {
        track.onended = () => {
          console.log('🛑 Usuário parou o compartilhamento');
          if (isSystemRecording) {
            stopSystemRecording();
          }
        };
      });

      // Parar as faixas de vídeo imediatamente se não precisarmos delas
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
      });

      mediaRecorder.start(1000);
      setIsSystemRecording(true);
      setSystemRecordingTime(0);
      setShowSystemModal(true);

      // Start timer para gravação do sistema
      systemTimerRef.current = setInterval(() => {
        setSystemRecordingTime(prev => prev + 1);
      }, 1000);

      if (addAppNotification) {
        addAppNotification({
          title: '🖥️ Gravação Iniciada',
          message: 'Capturando áudio do sistema. Clique em "Parar" quando terminar.',
          type: 'info'
        });
      }

    } catch (err) {
      console.error('❌ Error starting system audio recording:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permissão negada para capturar áudio. Clique em "Permitir" e certifique-se de marcar "Compartilhar áudio do sistema".');
        } else if (err.name === 'NotSupportedError') {
          setError('Seu navegador não suporta captura de áudio do sistema. Use Chrome, Edge ou Firefox atualizado.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma fonte de áudio encontrada. Certifique-se de que há áudio sendo reproduzido no sistema.');
        } else if (err.name === 'NotReadableError') {
          setError('Não foi possível acessar o áudio do sistema. Tente fechar outros aplicativos que possam estar usando o áudio.');
        } else {
          setError(`Erro ao iniciar gravação: ${err.message}`);
        }
      } else {
        setError('Erro desconhecido ao iniciar gravação');
      }
    }
  };

  const stopSystemRecording = () => {
    if (systemMediaRecorderRef.current && isSystemRecording) {
      console.log('🛑 Parando gravação...');
      systemMediaRecorderRef.current.stop();
      setIsSystemRecording(false);
      
      if (systemTimerRef.current) {
        clearInterval(systemTimerRef.current);
      }
    }
  };

  const stopSystemAudioRecording = async () => {
    try {
      console.log('🔄 Processando áudio gravado...');
      
      const audioBlob = new Blob(systemAudioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      
      console.log('📊 Áudio processado:', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: systemRecordingTime
      });

      if (audioBlob.size === 0) {
        throw new Error('Nenhum áudio foi capturado. Verifique se marcou "Compartilhar áudio do sistema" e se havia áudio sendo reproduzido.');
      }

      const recording: AudioRecording = {
        id: `system-${Date.now()}`,
        name: `Áudio do Sistema ${new Date().toLocaleString('pt-BR')}`,
        blob: audioBlob,
        duration: systemRecordingTime,
        timestamp: new Date(),
        type: 'system'
      };

      setRecordings(prev => [...prev, recording]);

      // Preparar metadata para processamento
      const metadata = {
        type: 'system',
        source: 'desktop_audio',
        duration: systemRecordingTime,
        timestamp: new Date().toISOString(),
        title: recording.name,
        user_id: 'attendos_user',
        session_id: `meeting_system_${Date.now()}`,
        language: 'pt-BR',
        audio_format: audioBlob.type,
        audio_size: audioBlob.size
      };

      // Enviar para processamento e aguardar resposta
      const response = await sendAudioToN8N(
        audioBlob, 
        metadata, 
        setSystemUploadingToN8N
      );

      if (response) {
        console.log('✅ Análise recebida para áudio do sistema');
      }

      // Cleanup
      if (systemStreamRef.current) {
        systemStreamRef.current.getTracks().forEach(track => track.stop());
        systemStreamRef.current = null;
      }

      setShowSystemModal(false);

    } catch (err) {
      console.error('❌ Error processing system audio:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar áudio');
      setShowSystemModal(false);
    }
  };

  const downloadRecording = (recording: AudioRecording) => {
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name}.${recording.blob.type.includes('webm') ? 'webm' : 'wav'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uploadRecordingToN8N = async (recording: AudioRecording) => {
    const metadata = {
      type: recording.type,
      duration: recording.duration,
      timestamp: recording.timestamp.toISOString(),
      title: recording.name,
      user_id: 'attendos_user',
      session_id: `meeting_manual_${Date.now()}`,
      language: 'pt-BR',
      audio_format: recording.blob.type,
      audio_size: recording.blob.size
    };

    await sendAudioToN8N(recording.blob, metadata, setUploadingToN8N);
  };

  const deleteRecording = (recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId));
  };

  const deleteN8NResponse = (responseId: string) => {
    setN8nResponses(prev => prev.filter(r => r.id !== responseId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meeting</h1>
        <div className="flex space-x-3">
          <button
            onClick={clearN8NResponses}
            disabled={n8nResponses.length === 0}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Limpar Relatórios</span>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Status de Processamento */}
      {(uploadingToN8N || systemUploadingToN8N) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <div>
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                Processando áudio...
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                O áudio foi enviado e está sendo analisado. Aguarde o relatório completo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Mic className="w-6 h-6 text-red-500" />
            <span>Gravação de Microfone</span>
          </h2>
          
          <div className="space-y-4">
            {/* Recording Status */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {isRecording ? (isPaused ? 'Pausado' : 'Gravando') : 'Parado'}
                  </span>
                </div>
                <div className="text-2xl font-mono text-gray-900 dark:text-white">
                  {formatTime(recordingTime)}
                </div>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex space-x-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Mic className="w-5 h-5" />
                  <span>Iniciar Gravação</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    <span>{isPaused ? 'Continuar' : 'Pausar'}</span>
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    <span>Parar</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* System Audio Recording */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Monitor className="w-6 h-6 text-purple-500" />
            <span>Gravação do Sistema</span>
          </h2>
          
          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Headphones className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-medium text-purple-800 dark:text-purple-300">Captura de Áudio do Sistema</h3>
              </div>
              <p className="text-purple-700 dark:text-purple-400 text-sm mb-3">
                Grave o áudio de reuniões online, chamadas ou qualquer som reproduzido no seu computador.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-yellow-800 dark:text-yellow-300 text-xs">
                  <strong>💡 Dica importante:</strong> Na janela de permissão, certifique-se de marcar a opção "Compartilhar áudio do sistema" para capturar o som.
                </p>
              </div>
            </div>

            <button
              onClick={startSystemAudioRecording}
              disabled={isSystemRecording}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Monitor className="w-5 h-5" />
              <span>{isSystemRecording ? 'Gravando Sistema...' : 'Gravar Áudio do Sistema'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Relatórios de Reunião */}
      {n8nResponses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Bot className="w-6 h-6 text-indigo-500" />
              <span>Relatórios de Reunião ({n8nResponses.length})</span>
            </h2>
          </div>
          
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {n8nResponses.map((response) => (
              <div
                key={response.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm"
              >
                {/* Header do Relatório */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Relatório de Reunião</h3>
                        <p className="text-indigo-100 text-sm">
                          {formatTimestamp(response.timestamp)} • 
                          {response.metadata?.audioType === 'system' ? ' Áudio do Sistema' : ' Microfone'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteN8NResponse(response.id)}
                      className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Relatório */}
                <div className="p-6 space-y-6">
                  {/* Transcrição */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300">Transcrição</h4>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                      <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {response.transcricao || 'Transcrição não disponível'}
                      </p>
                    </div>
                  </div>

                  {/* Insights */}
                  {response.insights && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">I</span>
                        </div>
                        <h4 className="font-semibold text-purple-900 dark:text-purple-300">Insights</h4>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                          {response.insights}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resumo */}
                  {response.resumo && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">R</span>
                        </div>
                        <h4 className="font-semibold text-green-900 dark:text-green-300">Resumo</h4>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                        <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                          {response.resumo}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Metadados */}
                  {response.metadata?.audioDuration && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Duração do áudio: {formatTime(response.metadata.audioDuration)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileAudio className="w-4 h-4" />
                          <span>{response.metadata.audioType === 'system' ? 'Sistema' : 'Microfone'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recordings List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Gravações ({recordings.length})
        </h2>
        
        {recordings.length > 0 ? (
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div key={recording.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    recording.type === 'system' 
                      ? 'bg-purple-100 dark:bg-purple-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {recording.type === 'system' ? (
                      <Monitor className={`w-5 h-5 ${
                        recording.type === 'system' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    ) : (
                      <Mic className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{recording.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(recording.duration)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <FileAudio className="w-4 h-4" />
                        <span>{(recording.blob.size / 1024 / 1024).toFixed(2)} MB</span>
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        recording.type === 'system'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {recording.type === 'system' ? 'Sistema' : 'Microfone'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => uploadRecordingToN8N(recording)}
                    disabled={uploadingToN8N || systemUploadingToN8N}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Processar Áudio"
                  >
                    {uploadingToN8N ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => downloadRecording(recording)}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRecording(recording.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileAudio className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma gravação ainda</h3>
            <p className="text-gray-500 dark:text-gray-400">Inicie uma gravação para começar</p>
          </div>
        )}
      </div>

      {/* System Audio Recording Modal */}
      {showSystemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Gravando Áudio do Sistema
              </h3>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-purple-800 dark:text-purple-300 font-medium">Gravação Ativa</span>
                </div>
                <div className="text-3xl font-mono text-purple-900 dark:text-purple-100 text-center">
                  {formatTime(systemRecordingTime)}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
                <p>✅ Capturando áudio do sistema</p>
                <p>🎯 Será processado automaticamente</p>
                <p>⏱️ Clique em "Parar" quando terminar</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSystemModal(false);
                    stopSystemRecording();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={stopSystemRecording}
                  disabled={systemUploadingToN8N}
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {systemUploadingToN8N ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>{systemUploadingToN8N ? 'Enviando...' : 'Parar e Enviar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meeting;