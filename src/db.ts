import Dexie from 'dexie';

// ========== DEFINIR TIPOS ==========
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

export interface CalorieGoal {
  id?: number;
  goal: number;
  date: string;
}

// ========== CREAR BASE DE DATOS ==========
export const db = new Dexie('FocoAppDB');

db.version(3).stores({
  habits: '++id, name, completed, date',
  streaks: '++id, habitName, currentStreak, longestStreak, lastDate',
  meals: '++id, name, calories, mealType, date, time',
  calorieGoals: '++id, date'
});

// ========== HÁBITOS ==========
export const getTodayHabits = async (): Promise<Habit[]> => {
  const today = new Date().toISOString().split('T')[0];
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
  const today = new Date().toISOString().split('T')[0];
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
      weeklyData.push({ date, calories: total, mealCount: meals.length });
    }
    return weeklyData;
  } catch (error) {
    console.error('Error al obtener calorías semanales:', error);
    return [];
  }
};