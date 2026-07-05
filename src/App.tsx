import React, { useState, useEffect } from 'react';
import { getTodayHabits, addHabit, toggleHabit, deleteHabit, getAllStreaks } from './db';
import Dieta from './components/Dieta';

// Definir tipos localmente
type Habit = {
  id?: number;
  name: string;
  completed: boolean;
  date: string;
};

type Streak = {
  id?: number;
  habitName: string;
  currentStreak: number;
  longestStreak: number;
  lastDate: string;
};

type Tab = 'habits' | 'dieta';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('habits');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streaks, setStreaks] = useState<Map<string, Streak>>(new Map());

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [todayHabits, allStreaks] = await Promise.all([
        getTodayHabits(),
        getAllStreaks()
      ]);
      
      setHabits(todayHabits);
      const streakMap = new Map<string, Streak>();
      allStreaks.forEach(s => streakMap.set(s.habitName, s));
      setStreaks(streakMap);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHabit = async (e: React.KeyboardEvent | React.MouseEvent) => {
    e.preventDefault();
    if (newHabit.trim() === '') return;

    try {
      await addHabit(newHabit.trim());
      setNewHabit('');
      await loadAllData();
    } catch (err) {
      setError('Error al agregar el hábito');
      console.error(err);
    }
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    try {
      await toggleHabit(id, !currentStatus);
      await loadAllData();
    } catch (err) {
      setError('Error al actualizar el hábito');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Eliminar este hábito?')) {
      try {
        await deleteHabit(id);
        await loadAllData();
      } catch (err) {
        setError('Error al eliminar el hábito');
        console.error(err);
      }
    }
  };

  const completedCount = habits.filter(h => h.completed).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;
  const totalStreak = Array.from(streaks.values()).reduce((sum, s) => sum + s.currentStreak, 0);

  const getStreakEmoji = (days: number) => {
    if (days >= 30) return '👑';
    if (days >= 14) return '🌟';
    if (days >= 7) return '🔥';
    if (days >= 3) return '💪';
    if (days >= 1) return '✅';
    return '⚪';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">🎯 Mi Foco</h1>
              <p className="text-blue-100 mt-1">
                {activeTab === 'habits' 
                  ? (habits.length === 0 ? 'Agrega tus hábitos para empezar' : `${completedCount} de ${habits.length} completados`)
                  : 'Registra tus comidas diarias'
                }
              </p>
            </div>
            {activeTab === 'habits' && habits.length > 0 && totalStreak > 0 && (
              <div className="bg-blue-700 bg-opacity-50 rounded-lg px-4 py-2 text-center">
                <div className="text-2xl font-bold">🔥 {totalStreak}</div>
                <div className="text-xs text-blue-200">Racha total</div>
              </div>
            )}
          </div>
          {activeTab === 'habits' && habits.length > 0 && (
            <div className="w-full bg-blue-800 rounded-full h-2.5 mt-3">
              <div 
                className="bg-green-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Pestañas */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab('habits')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'habits'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Hábitos
          </button>
          <button
            onClick={() => setActiveTab('dieta')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              activeTab === 'dieta'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🥗 Dieta
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-2xl mx-auto">
        {activeTab === 'habits' ? (
          <div className="p-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="p-4 bg-white shadow-sm rounded-lg mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHabit}
                  onChange={(e) => setNewHabit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHabit(e)}
                  placeholder="¿Qué hábito quieres construir hoy?"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleAddHabit}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>

            {isLoading ? (
              <p className="text-center text-gray-500">Cargando hábitos...</p>
            ) : habits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">✨ No hay hábitos para hoy</p>
                <p className="text-gray-400 text-sm">Agrega uno arriba para empezar</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {habits.map((habit) => {
                    const streak = streaks.get(habit.name);
                    const streakDays = streak?.currentStreak || 0;
                    const emoji = getStreakEmoji(streakDays);
                    
                    return (
                      <div
                        key={habit.id}
                        className={`flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border transition-all ${
                          habit.completed ? 'border-green-200 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={() => handleToggle(habit.id!, habit.completed)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              habit.completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {habit.completed && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1">
                            <span className={`text-gray-700 ${habit.completed ? 'line-through text-gray-400' : ''}`}>
                              {habit.name}
                            </span>
                            {streakDays > 0 && (
                              <span className="ml-2 text-sm text-orange-500">
                                {emoji} {streakDays} días
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(habit.id!)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                    <p className="text-2xl font-bold text-gray-700">{habits.length}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                    <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                    <p className="text-xs text-gray-500">Completados</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                    <p className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</p>
                    <p className="text-xs text-gray-500">Progreso</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                    <p className="text-2xl font-bold text-orange-500">{totalStreak}</p>
                    <p className="text-xs text-gray-500">🔥 Racha</p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <Dieta />
        )}
      </div>
    </div>
  );
}

export default App;