import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { getTodayMeals, getTodayHabits, getAllStreaks, getWeeklyCalories } from '../db';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Estadisticas: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const todayMeals = await getTodayMeals();
      const todayHabits = await getTodayHabits();
      const allStreaks = await getAllStreaks();
      const weeklyData = await getWeeklyCalories();
      
      // Calcular distribución de comidas
      const mealTypeCount: { [key: string]: number } = {};
      todayMeals.forEach(meal => {
        mealTypeCount[meal.mealType] = (mealTypeCount[meal.mealType] || 0) + 1;
      });

      const mealTypeData = Object.entries(mealTypeCount).map(([type, count]) => ({
        type,
        count
      }));

      // Calcular estadísticas de hábitos
      const totalHabits = todayHabits.length;
      const completedHabits = todayHabits.filter(h => h.completed).length;
      const totalStreak = allStreaks.reduce((sum, s) => sum + s.currentStreak, 0);

      const habitsData = todayHabits.map(habit => {
        const streak = allStreaks.find(s => s.habitName === habit.name);
        return {
          name: habit.name,
          completed: habit.completed ? 1 : 0,
          total: 1,
          streak: streak?.currentStreak || 0
        };
      });

      const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
      const avgCalories = todayMeals.length > 0 ? Math.round(totalCalories / todayMeals.length) : 0;

      setStats({
        totalMeals: todayMeals.length,
        totalCalories,
        avgCalories,
        habitsCompleted: completedHabits,
        totalHabits,
        totalStreak,
        weeklyData,
        habitsData,
        mealTypeData
      });
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!stats || (stats.totalMeals === 0 && stats.totalHabits === 0)) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <p className="text-4xl mb-4">📊</p>
        <p className="text-gray-400 text-lg">No hay datos suficientes para mostrar estadísticas</p>
        <p className="text-gray-400 text-sm">Registra comidas y hábitos para ver tu progreso</p>
      </div>
    );
  }

  const weeklyCaloriesConfig = {
    labels: stats.weeklyData.map((d: any) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Calorías consumidas',
        data: stats.weeklyData.map((d: any) => d.calories),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Número de comidas',
        data: stats.weeklyData.map((d: any) => d.mealCount),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        yAxisID: 'y1',
      }
    ]
  };

  const mealTypeConfig = {
    labels: stats.mealTypeData.map((d: any) => {
      const emojis: { [key: string]: string } = {
        'Desayuno': '🌅',
        'Almuerzo': '☀️',
        'Cena': '🌙',
        'Snack': '🍿'
      };
      return `${emojis[d.type] || '🍽️'} ${d.type}`;
    }),
    datasets: [
      {
        data: stats.mealTypeData.map((d: any) => d.count),
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgb(255, 206, 86)',
          'rgb(54, 162, 235)',
          'rgb(255, 99, 132)',
          'rgb(75, 192, 192)'
        ],
        borderWidth: 2,
      }
    ]
  };

  const habitsConfig = {
    labels: stats.habitsData.map((d: any) => d.name),
    datasets: [
      {
        label: 'Completados',
        data: stats.habitsData.map((d: any) => d.completed),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Pendientes',
        data: stats.habitsData.map((d: any) => d.total - d.completed),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: 4,
      }
    ]
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">📊 Estadísticas</h2>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
          <p className="text-2xl font-bold text-blue-600">{stats.totalMeals}</p>
          <p className="text-xs text-gray-500">Comidas hoy</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{stats.totalCalories}</p>
          <p className="text-xs text-gray-500">Calorías totales</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
          <p className="text-2xl font-bold text-purple-600">{stats.avgCalories}</p>
          <p className="text-xs text-gray-500">Promedio por comida</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
          <p className="text-2xl font-bold text-orange-500">🔥 {stats.totalStreak}</p>
          <p className="text-xs text-gray-500">Racha total</p>
        </div>
      </div>

      {/* Progreso de hábitos */}
      {stats.totalHabits > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            📋 Progreso de hábitos
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({stats.habitsCompleted}/{stats.totalHabits} completados)
            </span>
          </h3>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(stats.habitsCompleted / stats.totalHabits) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">
            {Math.round((stats.habitsCompleted / stats.totalHabits) * 100)}% completado
          </p>
        </div>
      )}

      {/* Gráfico de calorías semanales */}
      {stats.weeklyData.some((d: any) => d.calories > 0) && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">📈 Evolución semanal</h3>
          <div className="h-64">
            <Line 
              data={weeklyCaloriesConfig} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Calorías'
                    }
                  },
                  y1: {
                    position: 'right',
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Comidas'
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Distribución de comidas y hábitos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.mealTypeData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">🥗 Distribución de comidas</h3>
            <div className="h-64">
              <Doughnut 
                data={mealTypeConfig}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                      }
                    }
                  },
                  cutout: '60%'
                }}
              />
            </div>
          </div>
        )}

        {stats.habitsData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">✅ Estado de hábitos</h3>
            <div className="h-64">
              <Bar 
                data={habitsConfig}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      }
                    },
                    y: {
                      beginAtZero: true,
                      max: 1,
                      title: {
                        display: true,
                        text: 'Estado'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Estadisticas;