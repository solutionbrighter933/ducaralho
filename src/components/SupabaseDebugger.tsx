import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle, CheckCircle, Table, User, Building, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from './AuthProvider';

const SupabaseDebugger: React.FC = () => {
  const { user, profile, refreshProfile } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tablesInfo, setTablesInfo] = useState<any>({});
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Lista de tabelas para verificar
  const tablesToCheck = [
    'profiles',
    'organizations',
    'whatsapp_numbers',
    'conversas_whatsapp',
    'mensagens_whatsapp'
  ];

  const checkTables = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const results: Record<string, any> = {};
      
      // Verificar cada tabela
      for (const table of tablesToCheck) {
        try {
          console.log(`🔍 Verificando tabela ${table}...`);
          
          // Verificar se a tabela existe
          const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            console.error(`❌ Erro ao verificar tabela ${table}:`, countError);
            results[table] = {
              exists: false,
              error: countError.message,
              count: 0,
              sample: null,
              userRecords: 0
            };
            continue;
          }
          
          // Obter amostra de dados
          const { data: sampleData, error: sampleError } = await supabase
            .from(table)
            .select('*')
            .limit(3);
          
          // Contar registros do usuário atual
          let userRecords = 0;
          if (user?.id) {
            const userField = table === 'profiles' ? 'user_id' : 
                             table === 'organizations' ? 'id' : 'user_id';
            
            const userQuery = table === 'organizations' 
              ? supabase.from('profiles').select('organization_id').eq('user_id', user.id)
              : supabase.from(table).select('*', { count: 'exact', head: true }).eq(userField, user.id);
            
            const { count: userCount, error: userError } = await userQuery;
            
            if (!userError) {
              userRecords = userCount || 0;
            }
          }
          
          results[table] = {
            exists: true,
            count: count || 0,
            sample: sampleData || [],
            userRecords,
            error: sampleError ? sampleError.message : null
          };
          
        } catch (tableError) {
          console.error(`❌ Erro ao processar tabela ${table}:`, tableError);
          results[table] = {
            exists: false,
            error: tableError instanceof Error ? tableError.message : 'Erro desconhecido',
            count: 0,
            sample: null,
            userRecords: 0
          };
        }
      }
      
      setTablesInfo(results);
      setSuccess('Verificação de tabelas concluída com sucesso!');
      
    } catch (err) {
      console.error('❌ Erro na verificação de tabelas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Verificar tabelas ao montar o componente
  useEffect(() => {
    checkTables();
  }, []);

  const handleRefreshProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await refreshProfile();
      
      if (result.success) {
        setSuccess('Perfil atualizado com sucesso!');
      } else {
        setError(result.error || 'Falha ao atualizar perfil');
      }
    } catch (err) {
      console.error('❌ Erro ao atualizar perfil:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const toggleDetails = (table: string) => {
    setShowDetails(prev => ({
      ...prev,
      [table]: !prev[table]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Diagnóstico do Supabase</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleRefreshProfile}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <User className="w-5 h-5" />
            <span>Atualizar Perfil</span>
          </button>
          <button 
            onClick={checkTables}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <User className="w-6 h-6 text-indigo-500" />
          <span>Informações do Usuário</span>
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Usuário Auth</h3>
              {user ? (
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">ID:</span> {user.id}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">Criado em:</span> {new Date(user.created_at).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-red-500 dark:text-red-400">Usuário não autenticado</p>
              )}
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Perfil</h3>
              {profile ? (
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">ID:</span> {profile.id}</p>
                  <p><span className="font-medium">Nome:</span> {profile.full_name}</p>
                  <p><span className="font-medium">Organização ID:</span> {profile.organization_id}</p>
                </div>
              ) : (
                <p className="text-red-500 dark:text-red-400">Perfil não encontrado</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tables Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <Database className="w-6 h-6 text-indigo-500" />
          <span>Tabelas do Supabase</span>
        </h2>
        
        <div className="space-y-4">
          {tablesToCheck.map(table => {
            const tableInfo = tablesInfo[table] || {};
            const tableIcon = 
              table === 'profiles' ? User :
              table === 'organizations' ? Building :
              table === 'whatsapp_numbers' ? Phone :
              Table;
            
            return (
              <div key={table} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${
                    tableInfo.exists 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                  onClick={() => toggleDetails(table)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tableInfo.exists 
                        ? 'bg-green-100 dark:bg-green-800' 
                        : 'bg-red-100 dark:bg-red-800'
                    }`}>
                      <tableIcon className={`w-5 h-5 ${
                        tableInfo.exists 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{table}</h3>
                      <p className={`text-sm ${
                        tableInfo.exists 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {tableInfo.exists 
                          ? `${tableInfo.count} registros (${tableInfo.userRecords} seus)` 
                          : 'Tabela não encontrada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {tableInfo.error && (
                      <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                    )}
                    <svg 
                      className={`w-5 h-5 transition-transform ${showDetails[table] ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {showDetails[table] && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                    {tableInfo.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-700 dark:text-red-300 text-sm">
                        <p className="font-medium">Erro:</p>
                        <p>{tableInfo.error}</p>
                      </div>
                    ) : tableInfo.sample && tableInfo.sample.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Amostra de Dados:</h4>
                        <div className="overflow-x-auto">
                          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs text-gray-800 dark:text-gray-300 overflow-x-auto">
                            {JSON.stringify(tableInfo.sample, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum dado disponível para exibição</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Diagnóstico */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100 mb-4">Diagnóstico</h2>
        
        <div className="space-y-4">
          {/* Verificar se o perfil existe */}
          <div className={`p-4 rounded-lg ${
            profile ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 
                     'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            <h3 className="font-medium mb-1">Perfil do Usuário</h3>
            <p>{profile ? 'Perfil encontrado ✅' : 'Perfil não encontrado ❌'}</p>
            {!profile && (
              <button
                onClick={handleRefreshProfile}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar Recuperar Perfil
              </button>
            )}
          </div>
          
          {/* Verificar se a organização existe */}
          <div className={`p-4 rounded-lg ${
            (profile?.organization_id && tablesInfo.organizations?.userRecords > 0) ? 
              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 
              'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            <h3 className="font-medium mb-1">Organização</h3>
            <p>{(profile?.organization_id && tablesInfo.organizations?.userRecords > 0) ? 
                'Organização encontrada ✅' : 
                'Organização não encontrada ❌'}</p>
          </div>
          
          {/* Verificar se há números de WhatsApp */}
          <div className={`p-4 rounded-lg ${
            tablesInfo.whatsapp_numbers?.userRecords > 0 ? 
              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 
              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
          }`}>
            <h3 className="font-medium mb-1">Números de WhatsApp</h3>
            <p>{tablesInfo.whatsapp_numbers?.userRecords > 0 ? 
                `${tablesInfo.whatsapp_numbers.userRecords} números encontrados ✅` : 
                'Nenhum número configurado ⚠️'}</p>
          </div>
          
          {/* Verificar se há conversas */}
          <div className={`p-4 rounded-lg ${
            tablesInfo.conversas_whatsapp?.userRecords > 0 ? 
              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 
              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
          }`}>
            <h3 className="font-medium mb-1">Conversas</h3>
            <p>{tablesInfo.conversas_whatsapp?.userRecords > 0 ? 
                `${tablesInfo.conversas_whatsapp.userRecords} conversas encontradas ✅` : 
                'Nenhuma conversa ainda 🔄'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseDebugger;