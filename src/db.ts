import Dexie from 'dexie';
import { getTodayLocal } from './utils/dateHelpers';

// ========== HÁBITOS ==========
export interface Habit {
  id?: number;
  name: string;
  completed: boolean;
  date: string;
}

export interface Streak {
  id?: number;
  habitName: string;
  currentStreak: number;
  longestStreak: number;
  lastDate: string;
}

export interface Meal {
  id?: number;
  name: string;
  calories: number;
  mealType: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';
  date: string;
  time: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  ingredients?: string[];
  confidence?: number;
  notes?: string;
}

export interface CalorieGoal {
  id?: number;
  goal: number;
  date: string;
}

// ========== FINANZAS ==========
export interface Transaction {
  id?: number;
  type: 'ingreso' | 'gasto';
  category: string;
  amount: number;
  description: string;
  date: string;
  time: string;
  notes?: string;
}

export interface Budget {
  id?: number;
  category: string;
  amount: number;
  month: string;
}

// ========== ENTRENAMIENTOS ==========
export type ExerciseCategory = 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Cardio' | 'Core' | 'Full Body';

export interface Exercise {
  id?: number;
  name: string;
  category: ExerciseCategory;
  muscleGroup: string;
  equipment?: string;
  notes?: string;
}

export interface Workout {
  id?: number;
  name: string;
  date: string;
  time: string;
  duration?: number; // en minutos
  notes?: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id?: number;
  workoutId: number;
  exerciseId: number;
  exerciseName: string;
  sets: ExerciseSet[];
  notes?: string;
}

// 🔥 RENOMBRAR Set A ExerciseSet
export interface ExerciseSet {
  id?: number;
  workoutExerciseId: number;
  reps: number;
  weight: number;
  completed: boolean;
}

// ========== CREAR BASE DE DATOS ==========
export const db = new Dexie('FocoAppDB');

db.version(5).stores({
  habits: '++id, name, completed, date',
  streaks: '++id, habitName, currentStreak, longestStreak, lastDate',
  meals: '++id, name, calories, mealType, date, time',
  calorieGoals: '++id, date',
  transactions: '++id, type, category, amount, date, time',
  budgets: '++id, category, month',
  exercises: '++id, name, category, muscleGroup',
  workouts: '++id, name, date, time',
  workoutExercises: '++id, workoutId, exerciseId',
  exerciseSets: '++id, workoutExerciseId, reps, weight'  // 🔥 CAMBIAR DE sets A exerciseSets
});

// ========== HÁBITOS ==========
export const getTodayHabits = async (): Promise<Habit[]> => {
  const today = getTodayLocal(); // ✅ Usar fecha local
  try {
    return await db.table('habits')
      .where('date')
      .equals(today)
      .toArray();
  } catch (error) {
    console.error('Error al obtener hábitos:', error);
    return [];
  }
};

export const addHabit = async (name: string) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    await db.table('habits').add({
      name: name.trim(),
      completed: false,
      date: today,
    });
  } catch (error) {
    console.error('Error al agregar hábito:', error);
    throw error;
  }
};

export const toggleHabit = async (id: number, completed: boolean) => {
  try {
    await db.table('habits').update(id, { completed });
    if (completed) {
      const habit = await db.table('habits').get(id);
      if (habit) {
        await updateStreak(habit.name);
      }
    }
  } catch (error) {
    console.error('Error al actualizar hábito:', error);
    throw error;
  }
};

export const deleteHabit = async (id: number) => {
  try {
    const habit = await db.table('habits').get(id);
    await db.table('habits').delete(id);
    if (habit) {
      await db.table('streaks').where('habitName').equals(habit.name).delete();
    }
  } catch (error) {
    console.error('Error al eliminar hábito:', error);
    throw error;
  }
};

// ========== RACHAS ==========
export const updateStreak = async (habitName: string) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const existingStreak = await db.table('streaks')
      .where('habitName')
      .equals(habitName)
      .first();

    if (existingStreak) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (existingStreak.lastDate === today) {
        return;
      } else if (existingStreak.lastDate === yesterdayStr) {
        const newStreak = existingStreak.currentStreak + 1;
        await db.table('streaks').update(existingStreak.id!, {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, existingStreak.longestStreak),
          lastDate: today,
        });
      } else {
        await db.table('streaks').update(existingStreak.id!, {
          currentStreak: 1,
          lastDate: today,
        });
      }
    } else {
      await db.table('streaks').add({
        habitName,
        currentStreak: 1,
        longestStreak: 1,
        lastDate: today,
      });
    }
  } catch (error) {
    console.error('Error al actualizar racha:', error);
    throw error;
  }
};

export const getAllStreaks = async (): Promise<Streak[]> => {
  try {
    return await db.table('streaks').toArray();
  } catch (error) {
    console.error('Error al obtener todas las rachas:', error);
    return [];
  }
};

// ========== COMIDAS ==========
export const addMeal = async (meal: Omit<Meal, 'id'>) => {
  try {
    await db.table('meals').add(meal);
  } catch (error) {
    console.error('Error al agregar comida:', error);
    throw error;
  }
};

export const getTodayMeals = async (): Promise<Meal[]> => {
  const today = getTodayLocal(); // Usa la función helper
  try {
    return await db.table('meals')
      .where('date')
      .equals(today)
      .toArray();
  } catch (error) {
    console.error('Error al obtener comidas:', error);
    return [];
  }
};

export const getMealsByDate = async (date: string): Promise<Meal[]> => {
  try {
    return await db.table('meals')
      .where('date')
      .equals(date)
      .toArray();
  } catch (error) {
    console.error('Error al obtener comidas:', error);
    return [];
  }
};

export const deleteMeal = async (id: number) => {
  try {
    await db.table('meals').delete(id);
  } catch (error) {
    console.error('Error al eliminar comida:', error);
    throw error;
  }
};

export const getTodayCalories = async () => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const meals = await db.table('meals')
      .where('date')
      .equals(today)
      .toArray();
    return meals.reduce((total, meal) => total + meal.calories, 0);
  } catch (error) {
    console.error('Error al calcular calorías:', error);
    return 0;
  }
};

export const getTodayNutrition = async () => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const meals = await db.table('meals')
      .where('date')
      .equals(today)
      .toArray();
    
    return {
      protein: meals.reduce((total, m) => total + (m.protein || 0), 0),
      carbs: meals.reduce((total, m) => total + (m.carbs || 0), 0),
      fat: meals.reduce((total, m) => total + (m.fat || 0), 0),
      fiber: meals.reduce((total, m) => total + (m.fiber || 0), 0),
      totalCalories: meals.reduce((total, m) => total + m.calories, 0),
      mealCount: meals.length
    };
  } catch (error) {
    console.error('Error al calcular nutrición:', error);
    return { protein: 0, carbs: 0, fat: 0, fiber: 0, totalCalories: 0, mealCount: 0 };
  }
};

// ========== META DE CALORÍAS ==========
export const getCalorieGoal = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const goal = await db.table('calorieGoals')
      .where('date')
      .equals(today)
      .first();
    return goal?.goal || 2000;
  } catch (error) {
    console.error('Error al obtener meta de calorías:', error);
    return 2000;
  }
};

export const setCalorieGoal = async (goal: number) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const existing = await db.table('calorieGoals')
      .where('date')
      .equals(today)
      .first();
    
    if (existing) {
      await db.table('calorieGoals').update(existing.id!, { goal });
    } else {
      await db.table('calorieGoals').add({ goal, date: today });
    }
  } catch (error) {
    console.error('Error al establecer meta:', error);
    throw error;
  }
};

// ========== ESTADÍSTICAS ==========
export const getWeeklyCalories = async () => {
  try {
    const today = new Date();
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      weekDays.push(date.toISOString().split('T')[0]);
    }
    
    const weeklyData = [];
    for (const date of weekDays) {
      const meals = await db.table('meals')
        .where('date')
        .equals(date)
        .toArray();
      const total = meals.reduce((sum, m) => sum + m.calories, 0);
      weeklyData.push({
        date,
        calories: total,
        mealCount: meals.length
      });
    }
    return weeklyData;
  } catch (error) {
    console.error('Error al obtener calorías semanales:', error);
    return [];
  }
};

export const getMonthlyCalories = async () => {
  try {
    const today = new Date();
    const monthDays = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      monthDays.push(date.toISOString().split('T')[0]);
    }
    
    const monthlyData = [];
    for (const date of monthDays) {
      const meals = await db.table('meals')
        .where('date')
        .equals(date)
        .toArray();
      const total = meals.reduce((sum, m) => sum + m.calories, 0);
      monthlyData.push({
        date,
        calories: total,
        mealCount: meals.length
      });
    }
    return monthlyData;
  } catch (error) {
    console.error('Error al obtener calorías mensuales:', error);
    return [];
  }
};

// ========== FINANZAS ==========
export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  try {
    await db.table('transactions').add(transaction);
  } catch (error) {
    console.error('Error al agregar transacción:', error);
    throw error;
  }
};

export const getTodayTransactions = async (): Promise<Habit[]> => {
  const today = getTodayLocal(); // ✅ Usar fecha local
  try {
    return await db.table('habits')
      .where('date')
      .equals(today)
      .toArray();
  } catch (error) {
    console.error('Error al obtener hábitos:', error);
    return [];
  }
};

export const getTransactionsByDate = async (date: string): Promise<Transaction[]> => {
  try {
    return await db.table('transactions')
      .where('date')
      .equals(date)
      .toArray();
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return [];
  }
};

export const getTransactionsByMonth = async (month: string): Promise<Transaction[]> => {
  try {
    return await db.table('transactions')
      .filter(t => t.date.startsWith(month))
      .toArray();
  } catch (error) {
    console.error('Error al obtener transacciones del mes:', error);
    return [];
  }
};

export const deleteTransaction = async (id: number) => {
  try {
    await db.table('transactions').delete(id);
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    throw error;
  }
};

export const getMonthlySummary = async (month: string) => {
  try {
    const transactions = await getTransactionsByMonth(month);
    const totalIncome = transactions
      .filter(t => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'gasto')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;

    const expensesByCategory: { [key: string]: number } = {};
    transactions
      .filter(t => t.type === 'gasto')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });

    return {
      totalIncome,
      totalExpenses,
      balance,
      expensesByCategory,
      transactionCount: transactions.length
    };
  } catch (error) {
    console.error('Error al obtener resumen mensual:', error);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      expensesByCategory: {},
      transactionCount: 0
    };
  }
};

export const getCategories = async (): Promise<string[]> => {
  try {
    const transactions = await db.table('transactions').toArray();
    const categories = new Set(transactions.map(t => t.category));
    return Array.from(categories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
};

export const setBudget = async (category: string, amount: number, month: string) => {
  try {
    const existing = await db.table('budgets')
      .where('category')
      .equals(category)
      .and(b => b.month === month)
      .first();
    
    if (existing) {
      await db.table('budgets').update(existing.id!, { amount });
    } else {
      await db.table('budgets').add({ category, amount, month });
    }
  } catch (error) {
    console.error('Error al establecer presupuesto:', error);
    throw error;
  }
};

export const getBudgets = async (month: string): Promise<Budget[]> => {
  try {
    return await db.table('budgets')
      .where('month')
      .equals(month)
      .toArray();
  } catch (error) {
    console.error('Error al obtener presupuestos:', error);
    return [];
  }
};

export const getBudgetByCategory = async (category: string, month: string): Promise<Budget | undefined> => {
  try {
    return await db.table('budgets')
      .where('category')
      .equals(category)
      .and(b => b.month === month)
      .first();
  } catch (error) {
    console.error('Error al obtener presupuesto:', error);
    return undefined;
  }
};

// ========== ENTRENAMIENTOS ==========
// Ejercicios
export const addExercise = async (exercise: Omit<Exercise, 'id'>) => {
  try {
    return await db.table('exercises').add(exercise);
  } catch (error) {
    console.error('Error al agregar ejercicio:', error);
    throw error;
  }
};

export const getExercises = async (): Promise<Exercise[]> => {
  try {
    return await db.table('exercises').toArray();
  } catch (error) {
    console.error('Error al obtener ejercicios:', error);
    return [];
  }
};

export const getExercisesByCategory = async (category: string): Promise<Exercise[]> => {
  try {
    return await db.table('exercises')
      .where('category')
      .equals(category)
      .toArray();
  } catch (error) {
    console.error('Error al obtener ejercicios por categoría:', error);
    return [];
  }
};

export const deleteExercise = async (id: number) => {
  try {
    await db.table('exercises').delete(id);
  } catch (error) {
    console.error('Error al eliminar ejercicio:', error);
    throw error;
  }
};

// Workouts
export const addWorkout = async (workout: Omit<Workout, 'id' | 'exercises'>) => {
  try {
    return await db.table('workouts').add(workout);
  } catch (error) {
    console.error('Error al agregar workout:', error);
    throw error;
  }
};

export const getWorkouts = async (): Promise<Workout[]> => {
  try {
    const workouts = await db.table('workouts')
      .reverse()
      .sortBy('date');
    
    // Para cada workout, obtener sus ejercicios y sets
    const workoutsWithExercises = await Promise.all(
      workouts.map(async (workout) => {
        const workoutExercises = await db.table('workoutExercises')
          .where('workoutId')
          .equals(workout.id!)
          .toArray();
        
        const exercisesWithSets = await Promise.all(
          workoutExercises.map(async (we) => {
            const sets = await db.table('exerciseSets')
              .where('workoutExerciseId')
              .equals(we.id!)
              .toArray();
            return {
              ...we,
              sets: sets || []
            };
          })
        );
        
        return {
          ...workout,
          exercises: exercisesWithSets || []
        };
      })
    );
    
    return workoutsWithExercises;
  } catch (error) {
    console.error('Error al obtener workouts:', error);
    return [];
  }
};

export const getWorkoutsByDate = async (date: string): Promise<Workout[]> => {
  try {
    return await db.table('workouts')
      .where('date')
      .equals(date)
      .toArray();
  } catch (error) {
    console.error('Error al obtener workouts por fecha:', error);
    return [];
  }
};

export const getWorkoutById = async (id: number): Promise<Workout | undefined> => {
  try {
    const workout = await db.table('workouts').get(id);
    if (!workout) return undefined;
    
    const workoutExercises = await db.table('workoutExercises')
      .where('workoutId')
      .equals(id)
      .toArray();
    
    const exercisesWithSets = await Promise.all(
      workoutExercises.map(async (we) => {
        const sets = await db.table('exerciseSets')  // 🔥 CAMBIAR A exerciseSets
          .where('workoutExerciseId')
          .equals(we.id!)
          .toArray();
        return {
          ...we,
          sets
        };
      })
    );
    
    return {
      ...workout,
      exercises: exercisesWithSets
    };
  } catch (error) {
    console.error('Error al obtener workout:', error);
    return undefined;
  }
};

export const deleteWorkout = async (id: number) => {
  try {
    const workoutExercises = await db.table('workoutExercises')
      .where('workoutId')
      .equals(id)
      .toArray();
    
    for (const we of workoutExercises) {
      await db.table('exerciseSets')  // 🔥 CAMBIAR A exerciseSets
        .where('workoutExerciseId')
        .equals(we.id!)
        .delete();
    }
    
    await db.table('workoutExercises')
      .where('workoutId')
      .equals(id)
      .delete();
    
    await db.table('workouts').delete(id);
  } catch (error) {
    console.error('Error al eliminar workout:', error);
    throw error;
  }
};

// Workout Exercises
export const addWorkoutExercise = async (workoutExercise: Omit<WorkoutExercise, 'id'>) => {
  try {
    return await db.table('workoutExercises').add(workoutExercise);
  } catch (error) {
    console.error('Error al agregar ejercicio al workout:', error);
    throw error;
  }
};

// Sets
export const addSet = async (set: Omit<ExerciseSet, 'id'>) => {  // 🔥 CAMBIAR
  try {
    return await db.table('exerciseSets').add(set);  // 🔥 CAMBIAR
  } catch (error) {
    console.error('Error al agregar set:', error);
    throw error;
  }
};

export const updateSet = async (id: number, set: Partial<ExerciseSet>) => {  // 🔥 CAMBIAR
  try {
    await db.table('exerciseSets').update(id, set);  // 🔥 CAMBIAR
  } catch (error) {
    console.error('Error al actualizar set:', error);
    throw error;
  }
};

export const deleteSet = async (id: number) => {
  try {
    await db.table('exerciseSets').delete(id);  // 🔥 CAMBIAR
  } catch (error) {
    console.error('Error al eliminar set:', error);
    throw error;
  }
};


// ========== ESTADÍSTICAS DE ENTRENAMIENTOS ==========
export const getWorkoutStats = async () => {
  try {
    // Obtener todos los workouts
    const workouts = await getWorkouts();
    
    // Si no hay workouts, devolver valores por defecto
    if (!workouts || workouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalExercises: 0,
        totalSets: 0,
        topExercises: [],
        weeklyWorkouts: []
      };
    }

    const totalWorkouts = workouts.length;
    
    // Calcular total de ejercicios y sets
    let totalExercises = 0;
    let totalSets = 0;
    const exerciseCount: { [key: string]: number } = {};
    
    for (const w of workouts) {
      // Verificar que w.exercises existe y es un array
      if (w.exercises && Array.isArray(w.exercises)) {
        totalExercises += w.exercises.length;
        
        for (const e of w.exercises) {
          if (e && e.exerciseName) {
            exerciseCount[e.exerciseName] = (exerciseCount[e.exerciseName] || 0) + 1;
          }
          // Verificar que e.sets existe y es un array
          if (e.sets && Array.isArray(e.sets)) {
            totalSets += e.sets.length;
          }
        }
      }
    }
    
    // Ejercicios más usados
    const topExercises = Object.entries(exerciseCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Progreso semanal (últimos 7 días)
    const today = new Date();
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      weekDays.push(date.toISOString().split('T')[0]);
    }
    
    const weeklyWorkouts = weekDays.map(date => {
      const count = workouts.filter(w => w.date === date).length;
      return { date, count };
    });
    
    return {
      totalWorkouts,
      totalExercises,
      totalSets,
      topExercises,
      weeklyWorkouts
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return {
      totalWorkouts: 0,
      totalExercises: 0,
      totalSets: 0,
      topExercises: [],
      weeklyWorkouts: []
    };
  }
};
// ========== EJERCICIOS POR DEFECTO ==========
