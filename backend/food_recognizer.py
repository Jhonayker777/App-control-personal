import fiftyone as fo
import fiftyone.zoo as foz
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
from typing import List, Dict, Any

class FoodRecognizer:
    def __init__(self):
        self.model = None
        self.load_model()
        self.food_categories = [
            "pizza", "pasta", "burger", "sandwich", "sushi",
            "salad", "soup", "steak", "chicken", "fish",
            "rice", "noodles", "taco", "burrito", "fries",
            "ice cream", "cake", "fruit", "vegetables", "bread",
            "desayuno", "almuerzo", "cena", "snack", "postre"
        ]
    
    def load_model(self):
        """Cargar modelo CLIP para zero-shot classification"""
        try:
            # Usar modelo CLIP para reconocimiento zero-shot
            self.model = foz.load_zoo_model(
                "clip-vit-base32-torch",
                device="cpu"  # Cambia a "cuda" si tienes GPU
            )
            print("✅ Modelo CLIP cargado correctamente")
        except Exception as e:
            print(f"❌ Error al cargar modelo CLIP: {e}")
            print("🔄 Usando modelo alternativo...")
            # Fallback a un modelo más simple
            self.model = foz.load_zoo_model(
                "resnet50-imagenet-torch",
                device="cpu"
            )
    
    def preprocess_image(self, image_data: bytes) -> np.ndarray:
        """Convertir imagen a formato numpy"""
        try:
            # Decodificar imagen
            image = Image.open(io.BytesIO(image_data))
            image = np.array(image)
            
            # Convertir BGR a RGB si es necesario
            if len(image.shape) == 3 and image.shape[2] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            return image
        except Exception as e:
            print(f"❌ Error al procesar imagen: {e}")
            raise
    
    def analyze_food_image(self, image_data: bytes) -> Dict[str, Any]:
        """Analizar imagen de comida"""
        try:
            # Procesar imagen
            image = self.preprocess_image(image_data)
            
            # Crear dataset temporal
            dataset = fo.Dataset.from_images(
                [image],
                dataset_name="temp_food_analysis"
            )
            
            # Aplicar modelo
            predictions = dataset.apply_model(
                self.model,
                label_field="food_prediction"
            )
            
            # Obtener resultados
            results = []
            for sample in dataset:
                pred = sample.food_prediction
                if pred:
                    top_prediction = pred.top_confidence()
                    results.append({
                        "label": top_prediction.label,
                        "confidence": float(top_prediction.confidence)
                    })
            
            # Limpiar dataset temporal
            fo.delete_dataset("temp_food_analysis")
            
            # Devolver el resultado más probable
            if results:
                top_result = results[0]
                return {
                    "success": True,
                    "name": top_result["label"],
                    "confidence": top_result["confidence"],
                    "mealType": self._get_meal_type(top_result["label"])
                }
            else:
                return {
                    "success": False,
                    "error": "No se pudo reconocer la comida"
                }
                
        except Exception as e:
            print(f"❌ Error al analizar imagen: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def analyze_from_base64(self, base64_image: str) -> Dict[str, Any]:
        """Analizar imagen desde base64"""
        try:
            # Decodificar base64
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            image_data = base64.b64decode(base64_image)
            return self.analyze_food_image(image_data)
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_meal_type(self, label: str) -> str:
        """Determinar el tipo de comida basado en la etiqueta"""
        breakfast = ["desayuno", "cereal", "yogur", "huevos", "toast", "pancake", "waffle"]
        lunch = ["almuerzo", "sandwich", "soup", "salad", "pasta", "rice", "noodles"]
        dinner = ["cena", "steak", "chicken", "fish", "pizza", "burger", "taco"]
        snack = ["snack", "fries", "ice cream", "cake", "fruit", "chips", "cookies"]
        
        label_lower = label.lower()
        
        if any(word in label_lower for word in breakfast):
            return "Desayuno"
        elif any(word in label_lower for word in lunch):
            return "Almuerzo"
        elif any(word in label_lower for word in dinner):
            return "Cena"
        elif any(word in label_lower for word in snack):
            return "Snack"
        else:
            return "Almuerzo"  # Default
    
    def get_food_suggestions(self, meal_type: str) -> List[str]:
        """Obtener sugerencias de comidas por tipo"""
        suggestions = {
            "Desayuno": [
                "Huevos revueltos con aguacate",
                "Yogur con granola y frutas",
                "Pan integral con aguacate y huevo",
                "Tostadas con tomate y queso",
                "Cereal con leche y fresas"
            ],
            "Almuerzo": [
                "Ensalada de pollo a la parrilla",
                "Pasta con verduras y queso",
                "Sopa de lentejas con pan",
                "Wrap de pavo con vegetales",
                "Arroz con pollo y brócoli"
            ],
            "Cena": [
                "Salmón a la plancha con verduras",
                "Pollo asado con puré de papas",
                "Tacos de pescado con salsa",
                "Pizza vegetariana",
                "Carne a la parrilla con ensalada"
            ],
            "Snack": [
                "Fruta fresca",
                "Palitos de zanahoria con hummus",
                "Granola",
                "Yogur con frutas",
                "Un puñado de frutos secos"
            ]
        }
        
        return suggestions.get(meal_type, suggestions["Almuerzo"])
    
    def estimate_calories(self, food_name: str, portion_size: str = "media") -> int:
        """Estimar calorías de una comida"""
        # Base de datos de calorías simple
        calorie_db = {
            "pizza": 280,
            "pasta": 200,
            "burger": 350,
            "sandwich": 250,
            "sushi": 150,
            "salad": 120,
            "soup": 150,
            "steak": 400,
            "chicken": 250,
            "fish": 300,
            "rice": 200,
            "noodles": 220,
            "taco": 250,
            "burrito": 400,
            "fries": 300,
            "ice cream": 200,
            "cake": 350,
            "fruit": 80,
            "vegetables": 50,
            "bread": 150,
            "huevos": 80,
            "yogur": 120,
            "cereal": 150,
            "pancake": 250,
            "waffle": 300
        }
        
        food_lower = food_name.lower()
        for key, calories in calorie_db.items():
            if key in food_lower:
                base_calories = calories
                # Ajustar por tamaño de porción
                if portion_size == "pequeña":
                    return int(base_calories * 0.7)
                elif portion_size == "grande":
                    return int(base_calories * 1.3)
                return base_calories
        
        # Si no encontramos la comida, estimar
        return 250

# Función para usar el reconocedor
food_recognizer = FoodRecognizer()

def analyze_food_image(base64_image: str) -> Dict[str, Any]:
    """Función principal para analizar imagen de comida"""
    return food_recognizer.analyze_from_base64(base64_image)