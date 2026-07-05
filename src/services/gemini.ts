// src/services/foodRecognizer.ts

const BACKEND_URL = 'http://localhost:5000/api';

interface FoodAnalysisResult {
  success: boolean;
  name?: string;
  confidence?: number;
  mealType?: string;
  error?: string;
}

export const analyzeFoodWithFiftyOne = async (imageData: string): Promise<FoodAnalysisResult> => {
  try {
    const response = await fetch(`${BACKEND_URL}/analyze-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        name: data.name || 'Comida no identificada',
        confidence: data.confidence || 0,
        mealType: data.mealType || 'Almuerzo'
      };
    } else {
      throw new Error(data.error || 'Error al analizar la imagen');
    }
  } catch (error) {
    console.error('Error al analizar comida:', error);
    return {
      success: false,
      error: 'No se pudo analizar la imagen. Intenta con otra foto.'
    };
  }
};