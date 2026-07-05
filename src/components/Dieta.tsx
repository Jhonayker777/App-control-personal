import React, { useState, useEffect, useRef } from "react";
import {
  addMeal,
  getTodayMeals,
  deleteMeal,
  getTodayCalories,
  getTodayNutrition,
  getCalorieGoal,
} from "../db";
import { analyzeFoodWithFiftyOne } from "../services/foodRecognizer";
import CalorieGoal from "./CalorieGoal";
import Webcam from "react-webcam";

type Meal = {
  id?: number;
  name: string;
  calories: number;
  mealType: "Desayuno" | "Almuerzo" | "Cena" | "Snack";
  date: string;
  time: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  ingredients?: string[];
  confidence?: number;
  notes?: string;
};

const Dieta: React.FC = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [nutrition, setNutrition] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    mealCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [mealType, setMealType] = useState<
    "Desayuno" | "Almuerzo" | "Cena" | "Snack"
  >("Almuerzo");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [notes, setNotes] = useState("");

  const [image, setImage] = useState<string | null>(null);
  const [analyzedResult, setAnalyzedResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [todayMeals, totalCal, nutritionData, goal] = await Promise.all([
        getTodayMeals(),
        getTodayCalories(),
        getTodayNutrition(),
        getCalorieGoal(),
      ]);
      setMeals(todayMeals);
      setTotalCalories(totalCal);
      setNutrition(nutritionData);
      setCalorieGoal(goal);
    } catch (err) {
      setError("Error al cargar los datos");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const capturePhoto = () => {
  console.log('📸 Intentando capturar foto...');
  if (webcamRef.current) {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      console.log('✅ Foto capturada correctamente');
      setImage(imageSrc);
      setShowCamera(false);
      analyzeImage(imageSrc);
    } else {
      console.log('❌ No se pudo capturar la foto');
      setError('❌ No se pudo capturar la foto. Intenta de nuevo.');
    }
  } else {
    console.log('❌ Webcam no disponible');
    setError('❌ La cámara no está disponible. Intenta de nuevo.');
  }
};

  // ========== ANÁLISIS DE IMAGEN CORREGIDO ==========
  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeFoodWithFiftyOne(imageData);

      if (result.success) {
        setAnalyzedResult(result);
        setMealName(result.name || "");
        setCalories(String(result.calories || 0));

        // 🔥 COMPLETAR TODOS LOS CAMPOS AUTOMÁTICAMENTE
        setProtein(String(result.protein || ""));
        setCarbs(String(result.carbs || ""));
        setFat(String(result.fat || ""));
        setFiber(String(result.fiber || ""));

        const validMealTypes = ["Desayuno", "Almuerzo", "Cena", "Snack"];
        let mealTypeValue = result.mealType || "Almuerzo";

        if (!validMealTypes.includes(mealTypeValue)) {
          const mealMap: {
            [key: string]: "Desayuno" | "Almuerzo" | "Cena" | "Snack";
          } = {
            breakfast: "Desayuno",
            lunch: "Almuerzo",
            dinner: "Cena",
            snack: "Snack",
            Desayuno: "Desayuno",
            Almuerzo: "Almuerzo",
            Cena: "Cena",
            Snack: "Snack",
          };
          mealTypeValue = mealMap[mealTypeValue] || "Almuerzo";
        }

        setMealType(
          mealTypeValue as "Desayuno" | "Almuerzo" | "Cena" | "Snack",
        );

        setError(
          `✅ ${result.name} identificado! (${Math.round((result.confidence || 0) * 100)}% confianza)`,
        );
      } else {
        setError("❌ No se pudo identificar la comida. Intenta con otra foto.");
      }
    } catch (err) {
      setError("❌ Error al analizar la imagen");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setImage(imageData);
      await analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const openCamera = () => setShowCamera(true);
  const closeCamera = () => setShowCamera(false);

  const triggerGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearImage = () => {
    setImage(null);
    setAnalyzedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mealName.trim() === "" || calories.trim() === "") return;

    const cal = parseInt(calories);
    if (isNaN(cal) || cal <= 0) {
      setError("Ingresa un número válido de calorías");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const time = new Date().toLocaleTimeString();

      await addMeal({
        name: mealName.trim(),
        calories: cal,
        mealType: mealType,
        date: today,
        time: time,
        protein: protein ? parseFloat(protein) : undefined,
        carbs: carbs ? parseFloat(carbs) : undefined,
        fat: fat ? parseFloat(fat) : undefined,
        fiber: fiber ? parseFloat(fiber) : undefined,
        ingredients: analyzedResult?.ingredients,
        confidence: analyzedResult?.confidence,
        notes: notes || undefined,
      });

      // Limpiar formulario
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFiber("");
      setNotes("");
      clearImage();
      await loadAllData();
      setError(null);
    } catch (err) {
      setError("Error al agregar la comida");
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Eliminar esta comida?")) {
      try {
        await deleteMeal(id);
        await loadAllData();
      } catch (err) {
        setError("Error al eliminar la comida");
        console.error(err);
      }
    }
  };

  const calorieProgress = Math.min((totalCalories / calorieGoal) * 100, 100);
  const remainingCalories = Math.max(calorieGoal - totalCalories, 0);

  const getMealEmoji = (type: string) => {
    switch (type) {
      case "Desayuno":
        return "🌅";
      case "Almuerzo":
        return "☀️";
      case "Cena":
        return "🌙";
      case "Snack":
        return "🍿";
      default:
        return "🍽️";
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        🥗 Registro de Dieta
      </h2>

      {/* Meta de calorías */}
      <CalorieGoal onGoalChange={(newGoal) => setCalorieGoal(newGoal)} />

      {/* Resumen de calorías */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Calorías consumidas</p>
            <p className="text-2xl font-bold text-gray-800">
              {totalCalories}{" "}
              <span className="text-lg font-normal text-gray-500">
                / {calorieGoal}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Restantes</p>
            <p
              className={`text-2xl font-bold ${remainingCalories > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {remainingCalories > 0 ? remainingCalories : "0"}
            </p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              calorieProgress >= 100 ? "bg-red-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(calorieProgress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-right">
          {Math.round(calorieProgress)}% de la meta diaria
        </p>
      </div>

      {/* Resumen nutricional */}
      {nutrition.mealCount > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            📊 Resumen nutricional
          </h4>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xs text-gray-500">Proteínas</p>
              <p className="text-sm font-bold text-blue-600">
                {nutrition.protein}g
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Carbohidratos</p>
              <p className="text-sm font-bold text-blue-600">
                {nutrition.carbs}g
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Grasas</p>
              <p className="text-sm font-bold text-blue-600">
                {nutrition.fat}g
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Fibra</p>
              <p className="text-sm font-bold text-blue-600">
                {nutrition.fiber}g
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {nutrition.mealCount} comidas registradas hoy
          </p>
        </div>
      )}

      {/* Cámara */}
      {showCamera ? (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="relative">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded-lg"
              videoConstraints={{
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                📸 Tomar foto
              </button>
              <button
                onClick={closeCamera}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Agregar comida
          </h3>

          <div className="flex gap-2 mb-3">
            <button
              onClick={openCamera}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              disabled={isAnalyzing}
            >
              📷 Abrir cámara
            </button>
            <button
              onClick={triggerGallery}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              disabled={isAnalyzing}
            >
              🖼️ Galería
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {image && (
            <div className="mb-3 relative">
              <img
                src={image}
                alt="Comida"
                className="w-full max-h-48 object-cover rounded-lg"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <p className="text-white font-bold">
                    🔍 Analizando comida...
                  </p>
                </div>
              )}
              {analyzedResult && !isAnalyzing && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 rounded-b-lg">
                  <p className="text-sm">
                    🔬 {analyzedResult.name} - {analyzedResult.calories} cal (
                    {Math.round((analyzedResult.confidence || 0) * 100)}%
                    confianza)
                  </p>
                </div>
              )}
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleAddMeal} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Nombre de la comida
                </label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="Ej: Ensalada de pollo"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAnalyzing}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Calorías
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="Calorías"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-500">
                  Proteínas (g)
                </label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">
                  Carbos (g)
                </label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">
                  Grasas (g)
                </label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Fibra (g)</label>
                <input
                  type="number"
                  value={fiber}
                  onChange={(e) => setFiber(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Tipo de comida
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={isAnalyzing}
                >
                  <option value="Desayuno">🌅 Desayuno</option>
                  <option value="Almuerzo">☀️ Almuerzo</option>
                  <option value="Cena">🌙 Cena</option>
                  <option value="Snack">🍿 Snack</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={isAnalyzing}
                >
                  Agregar comida
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Comida casera, con poca sal..."
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>

          {analyzedResult && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                ✅ Análisis completado: <strong>{analyzedResult.name}</strong>
              </p>
              <p className="text-sm text-green-600">
                🔥 Calorías: <strong>{analyzedResult.calories}</strong> cal
              </p>
              <p className="text-xs text-green-500">
                🎯 Confianza:{" "}
                {Math.round((analyzedResult.confidence || 0) * 100)}%
              </p>
              <p className="text-xs text-green-500 mt-1">
                ✏️ Puedes modificar los valores antes de guardar
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className={`border px-4 py-3 rounded mb-4 ${
            error.includes("✅")
              ? "bg-green-100 border-green-400 text-green-700"
              : "bg-red-100 border-red-400 text-red-700"
          }`}
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-gray-500">Cargando comidas...</p>
      ) : meals.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm">
          <p className="text-gray-400 text-lg">
            🍽️ No hay comidas registradas hoy
          </p>
          <p className="text-gray-400 text-sm">
            Agrega tu primera comida o toma una foto
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{getMealEmoji(meal.mealType)}</span>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{meal.name}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{meal.mealType}</span>
                    <span>🕐 {meal.time}</span>
                    {meal.protein && <span>💪 {meal.protein}g</span>}
                    {meal.carbs && <span>🌾 {meal.carbs}g</span>}
                    {meal.fat && <span>🧈 {meal.fat}g</span>}
                    {meal.fiber && <span>🌿 {meal.fiber}g</span>}
                  </div>
                  {meal.notes && (
                    <p className="text-xs text-gray-400 italic mt-1">
                      📝 {meal.notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-gray-800 font-bold">
                    {meal.calories}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">cal</span>
                  {meal.confidence && (
                    <p className="text-xs text-gray-400">
                      🎯 {Math.round(meal.confidence * 100)}%
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(meal.id!)}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dieta;
