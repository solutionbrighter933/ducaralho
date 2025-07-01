import React from 'react';
import { 
  Users, 
  MessageSquare, 
  Bot, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total de Contatos',
      value: '2,847',
      change: '+12%',
      positive: true,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Conversas Ativas',
      value: '142',
      change: '+8%',
      positive: true,
      icon: MessageSquare,
      color: 'bg-green-500'
    },
    {
      title: 'Taxa de Resposta IA',
      value: '94.2%',
      change: '+2.1%',
      positive: true,
      icon: Bot,
      color: 'bg-purple-500'
    },
    {
      title: 'Satisfação do Cliente',
      value: '4.8/5',
      change: '+0.3',
      positive: true,
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  const recentActivity = [
    {
      type: 'conversation',
      message: 'Nova conversa iniciada com cliente Premium',
      time: '2 min atrás',
      status: 'active'
    },
    {
      type: 'ai_training',
      message: 'Modelo IA atualizado com sucesso',
      time: '15 min atrás',
      status: 'success'
    },
    {
      type: 'integration',
      message: 'WhatsApp Business conectado',
      time: '1 hora atrás',
      status: 'success'
    },
    {
      type: 'alert',
      message: 'Taxa de resposta abaixo do esperado',
      time: '2 horas atrás',
      status: 'warning'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Última atualização: há 2 minutos</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs mês anterior</span>
                  </div>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Semanal</h2>
          <div className="h-64 bg-gradient-to-t from-indigo-50 dark:from-indigo-900/20 to-transparent rounded-lg flex items-end justify-between p-4">
            {[65, 78, 82, 90, 85, 94, 88].map((height, index) => (
              <div
                key={index}
                className="bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-sm"
                style={{ height: `${height}%`, width: '12%' }}
              ></div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Atividade Recente</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                </div>
                {activity.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {activity.status === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                {activity.status === 'active' && <Activity className="w-4 h-4 text-blue-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;