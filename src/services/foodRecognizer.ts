// src/services/foodRecognizer.ts

const BACKEND_URL = 'http://localhost:5000/api';

export interface FoodAnalysisResult {
  success: boolean;
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  confidence?: number;
  mealType?: string;
  error?: string;
  all_predictions?: Array<{label: string, confidence: number}>;
}

export const analyzeFoodWithFiftyOne = async (imageData: string): Promise<FoodAnalysisResult> => {
  try {
    console.log('📤 Enviando imagen al backend...');
    
    let base64Image = imageData;
    if (base64Image.includes(',')) {
      base64Image = base64Image.split(',')[1];
    }
    
    const response = await fetch(`${BACKEND_URL}/analyze-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    const data = await response.json();
    console.log('📥 Respuesta del servidor:', data);
    
    if (response.ok && data.success) {
      return {
        success: true,
        name: data.name || 'Comida',
        calories: data.calories || 200,
        protein: data.protein || 8,
        carbs: data.carbs || 15,
        fat: data.fat || 10,
        fiber: data.fiber || 2,
        confidence: data.confidence || 0.7,
        mealType: data.mealType || 'Almuerzo',
        all_predictions: data.all_predictions || []
      };
    } else {
      console.error('❌ Error:', data);
      return {
        success: false,
        error: data.error || 'Error al analizar la imagen'
      };
    }
  } catch (error) {
    console.error('❌ Error al analizar comida:', error);
    return {
      success: false,
      error: 'No se pudo conectar con el servidor. Asegúrate de que el backend esté corriendo en http://localhost:5000'
    };
  }
};

export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
};