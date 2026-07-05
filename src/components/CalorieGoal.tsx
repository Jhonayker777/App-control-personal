import React, { useState, useEffect } from 'react';
import { getCalorieGoal, setCalorieGoal } from '../db';

interface CalorieGoalProps {
  onGoalChange?: (goal: number) => void;
}

const CalorieGoal: React.FC<CalorieGoalProps> = ({ onGoalChange }) => {
  const [goal, setGoal] = useState<number>(2000);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState<string>('2000');

  useEffect(() => {
    loadGoal();
  }, []);

  const loadGoal = async () => {
    try {
      const currentGoal = await getCalorieGoal();
      setGoal(currentGoal);
      setTempGoal(currentGoal.toString());
    } catch (error) {
      console.error('Error al cargar meta:', error);
    }
  };

  const handleSave = async () => {
    const newGoal = parseInt(tempGoal);
    if (isNaN(newGoal) || newGoal <= 0) {
      alert('Ingresa un número válido de calorías');
      return;
    }
    try {
      await setCalorieGoal(newGoal);
      setGoal(newGoal);
      setIsEditing(false);
      if (onGoalChange) {
        onGoalChange(newGoal);
      }
    } catch (error) {
      console.error('Error al guardar meta:', error);
      alert('Error al guardar la meta');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Meta diaria de calorías</p>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={tempGoal}
                onChange={(e) => setTempGoal(e.target.value)}
                className="w-24 p-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <span className="text-sm text-gray-500">cal</span>
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setTempGoal(goal.toString());
                }}
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-600">{goal}</span>
              <span className="text-sm text-gray-500">calorías</span>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                ✏️ Editar
              </button>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Meta diaria</p>
          <p className="text-sm font-medium text-green-600">
            {goal > 0 ? `${goal} cal` : 'No establecida'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalorieGoal;