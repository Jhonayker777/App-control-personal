import React, { useState, useEffect } from "react";
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
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

// ✅ Solo importar los tipos que se usan
import type { Exercise, Workout } from "../db";

// ✅ Solo importar las funciones que se usan
import {
  addExercise,
  getExercises,
  addWorkout,
  getWorkouts,
  deleteWorkout,
  addWorkoutExercise,
  addSet,
  getWorkoutStats,
} from "../db";

// ✅ Eliminar importación no usada de dateHelpers
import {
  getTodayLocal,
  getTimeLocal,
  formatDateDisplay,
} from "../utils/dateHelpers";

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
  Filler,
);

type Tab = "nuevo" | "historial" | "estadisticas" | "ejercicios";

const Entrenamientos: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("nuevo");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workoutName, setWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<number[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [exerciseSets, setExerciseSets] = useState<
    { reps: number; weight: number; completed: boolean }[]
  >([]);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [duration, setDuration] = useState("");

  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] =
    useState<Exercise["category"]>("Pecho");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const categories: Exercise["category"][] = [
    "Pecho",
    "Espalda",
    "Piernas",
    "Hombros",
    "Brazos",
    "Cardio",
    "Core",
    "Full Body",
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const [allExercises, allWorkouts, workoutStats] = await Promise.all([
      getExercises(),
      getWorkouts(),
      getWorkoutStats()
    ]);
    
    // Si no hay ejercicios, precargar los default
    if (allExercises.length === 0) {
      const defaultExercisesList: Omit<Exercise, 'id'>[] = [
        { name: 'Press de Banca', category: 'Pecho', muscleGroup: 'Pectorales' },
        { name: 'Flexiones', category: 'Pecho', muscleGroup: 'Pectorales' },
        { name: 'Dominadas', category: 'Espalda', muscleGroup: 'Dorsales' },
        { name: 'Sentadillas', category: 'Piernas', muscleGroup: 'Cuádriceps' },
        { name: 'Press Militar', category: 'Hombros', muscleGroup: 'Deltoides' },
        { name: 'Curl de Bíceps', category: 'Brazos', muscleGroup: 'Bíceps' },
        { name: 'Plancha', category: 'Core', muscleGroup: 'Abdomen' },
        { name: 'Cardio', category: 'Cardio', muscleGroup: 'Cardio' },
        { name: 'Burpees', category: 'Full Body', muscleGroup: 'Cuerpo Completo' },
        { name: 'Remo con Barra', category: 'Espalda', muscleGroup: 'Dorsales' },
        { name: 'Peso Muerto', category: 'Espalda', muscleGroup: 'Espalda Baja' },
        { name: 'Prensa de Piernas', category: 'Piernas', muscleGroup: 'Cuádriceps' },
        { name: 'Zancadas', category: 'Piernas', muscleGroup: 'Glúteos' },
        { name: 'Elevaciones Laterales', category: 'Hombros', muscleGroup: 'Deltoides' },
        { name: 'Extensiones de Tríceps', category: 'Brazos', muscleGroup: 'Tríceps' },
        { name: 'Crunches', category: 'Core', muscleGroup: 'Abdomen' },
        { name: 'Cinta de Correr', category: 'Cardio', muscleGroup: 'Cardio' },
      ];
      
      for (const ex of defaultExercisesList) {
        await addExercise(ex);
      }
      const refreshedExercises = await getExercises();
      setExercises(refreshedExercises);
    } else {
      setExercises(allExercises);
    }
    
    setWorkouts(allWorkouts || []);
    setStats(workoutStats || {
      totalWorkouts: 0,
      totalExercises: 0,
      totalSets: 0,
      topExercises: [],
      weeklyWorkouts: []
    });
  } catch (err) {
    setError('Error al cargar datos');
    console.error(err);
  } finally {
    setIsLoading(false);
  }
};

  const handleAddExerciseToWorkout = () => {
    if (!currentExercise) return;

    setSelectedExercises([...selectedExercises, currentExercise.id!]);
    setCurrentExercise(null);
    setExerciseSets([]);
    setReps("");
    setWeight("");
  };

  const handleAddSet = () => {
    if (!reps || !weight) return;
    setExerciseSets([
      ...exerciseSets,
      { reps: parseInt(reps), weight: parseFloat(weight), completed: true },
    ]);
    setReps("");
    setWeight("");
  };

  const handleSaveWorkout = async () => {
    if (selectedExercises.length === 0) {
      setError("Agrega al menos un ejercicio");
      return;
    }

    try {
      // ✅ Usar fecha local
      const today = getTodayLocal();
      const time = getTimeLocal();

      console.log("📅 Fecha guardada (local):", today);
      console.log("🕐 Hora guardada:", time);

      const workoutId = await addWorkout({
        name: workoutName || "Entrenamiento",
        date: today,
        time,
        duration: duration ? parseInt(duration) : undefined,
        notes: workoutNotes || undefined,
      });

      for (const exerciseId of selectedExercises) {
        const exercise = exercises.find((e) => e.id === exerciseId);
        if (!exercise) continue;

        const weId = await addWorkoutExercise({
          workoutId: workoutId as number,
          exerciseId: exerciseId,
          exerciseName: exercise.name,
          sets: [],
          notes: "",
        });

        for (const set of exerciseSets) {
          await addSet({
            workoutExerciseId: weId as number,
            reps: set.reps,
            weight: set.weight,
            completed: set.completed,
          });
        }
      }

      setWorkoutName("");
      setSelectedExercises([]);
      setExerciseSets([]);
      setWorkoutNotes("");
      setDuration("");
      setError(null);
      await loadData();
    } catch (err) {
      setError("Error al guardar el entrenamiento");
      console.error(err);
    }
  };

  const handleDeleteWorkout = async (id: number) => {
    if (window.confirm("¿Eliminar este entrenamiento?")) {
      try {
        await deleteWorkout(id);
        await loadData();
      } catch (err) {
        setError("Error al eliminar el entrenamiento");
        console.error(err);
      }
    }
  };

  const filteredExercises = filterCategory
    ? exercises.filter((e) => e.category === filterCategory)
    : exercises;

  const weeklyWorkoutsConfig = {
    labels:
      stats?.weeklyWorkouts?.map((w: any) => {
        const date = new Date(w.date);
        return date.toLocaleDateString("es-ES", {
          weekday: "short",
          day: "numeric",
        });
      }) || [],
    datasets: [
      {
        label: "Entrenamientos",
        data: stats?.weeklyWorkouts?.map((w: any) => w.count) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const topExercisesConfig = {
    labels: stats?.topExercises?.map((e: any) => e.name) || [],
    datasets: [
      {
        label: "Veces realizado",
        data: stats?.topExercises?.map((e: any) => e.count) || [],
        backgroundColor: [
          "rgba(255, 99, 132, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(153, 102, 255, 0.8)",
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">🏋️ Entrenamientos</h2>

      <div className="bg-white border-b border-gray-200 rounded-lg">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab("nuevo")}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === "nuevo"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📝 Nuevo
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === "historial"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📋 Historial
          </button>
          <button
            onClick={() => setActiveTab("estadisticas")}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === "estadisticas"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 Estadísticas
          </button>
          <button
            onClick={() => setActiveTab("ejercicios")}
            className={`flex-1 py-2 px-4 text-center font-medium transition-colors whitespace-nowrap ${
              activeTab === "ejercicios"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            💪 Ejercicios
          </button>
        </div>
      </div>

      {activeTab === "nuevo" && (
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Nuevo entrenamiento
          </h3>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Nombre del entrenamiento
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Ej: Push Day"
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Duración (minutos)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Notas</label>
              <input
                type="text"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                placeholder="Notas..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-2">
              Agregar ejercicios
            </h4>

            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={currentExercise?.id || ""}
                onChange={(e) => {
                  const ex = exercises.find(
                    (exp) => exp.id === parseInt(e.target.value),
                  );
                  setCurrentExercise(ex || null);
                }}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un ejercicio</option>
                {filteredExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.category})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddExerciseToWorkout}
                disabled={!currentExercise}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>

          {selectedExercises.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-2">
                Ejercicios seleccionados
              </h4>
              <div className="space-y-2">
                {selectedExercises.map((exId, index) => {
                  const ex = exercises.find((e) => e.id === exId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span>{ex?.name}</span>
                      <button
                        onClick={() => {
                          const newSelected = selectedExercises.filter(
                            (_, i) => i !== index,
                          );
                          setSelectedExercises(newSelected);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedExercises.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-2">Agregar sets</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="Reps"
                  className="w-24 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Peso (kg)"
                  className="w-24 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddSet}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Agregar Set
                </button>
              </div>

              {exerciseSets.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Sets agregados: {exerciseSets.length}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {exerciseSets.map((set, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {set.reps}×{set.weight}kg
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSaveWorkout}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Guardar Entrenamiento
          </button>
        </div>
      )}

      {activeTab === "historial" && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Historial de entrenamientos
          </h3>

          {isLoading ? (
            <p className="text-center text-gray-500">Cargando...</p>
          ) : workouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">
                🏋️ No hay entrenamientos registrados
              </p>
              <p className="text-gray-400 text-sm">Comienza a entrenar hoy!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {workouts.map((w) => (
                <div
                  key={w.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-800">{w.name}</h4>
                      <p className="text-sm text-gray-500">
                        📅 {formatDateDisplay(w.date)}
                        {w.duration && ` • ⏱️ ${w.duration} min`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteWorkout(w.id!)}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                  {w.notes && (
                    <p className="text-sm text-gray-600 mt-1">📝 {w.notes}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {w.exercises.map((e, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {e.exerciseName} ({e.sets.length} sets)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "estadisticas" && (
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-gray-500">
              Cargando estadísticas...
            </p>
          ) : stats?.totalWorkouts === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-400 text-lg">
                📊 No hay datos de entrenamientos
              </p>
              <p className="text-gray-400 text-sm">
                Registra entrenamientos para ver tu progreso
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalWorkouts}
                  </p>
                  <p className="text-xs text-gray-500">Entrenamientos</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalExercises}
                  </p>
                  <p className="text-xs text-gray-500">Ejercicios totales</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalSets}
                  </p>
                  <p className="text-xs text-gray-500">Sets totales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.weeklyWorkouts?.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      📈 Evolución semanal
                    </h4>
                    <div className="h-48">
                      <Line
                        data={weeklyWorkoutsConfig}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                              },
                              title: {
                                display: true,
                                text: "Entrenamientos",
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                {stats.topExercises?.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      🏆 Ejercicios más usados
                    </h4>
                    <div className="h-48">
                      <Bar
                        data={topExercisesConfig}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                              },
                              title: {
                                display: true,
                                text: "Entrenamientos",
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "ejercicios" && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            💪 Biblioteca de ejercicios
          </h3>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              placeholder="Nombre del ejercicio"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newExerciseCategory}
              onChange={(e) =>
                setNewExerciseCategory(e.target.value as Exercise["category"])
              }
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newExerciseMuscle}
              onChange={(e) => setNewExerciseMuscle(e.target.value)}
              placeholder="Grupo muscular"
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={async () => {
                if (!newExerciseName) return;
                await addExercise({
                  name: newExerciseName,
                  category: newExerciseCategory,
                  muscleGroup: newExerciseMuscle || "General",
                });
                setNewExerciseName("");
                setNewExerciseMuscle("");
                await loadData();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Agregar
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-800">{ex.name}</p>
                  <p className="text-xs text-gray-500">
                    {ex.category} • {ex.muscleGroup}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Entrenamientos;
