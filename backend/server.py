from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image
import numpy as np
import tempfile
import os
import json

app = Flask(__name__)
CORS(app)

# Intentar importar fiftyone
try:
    import fiftyone as fo
    import fiftyone.zoo as foz
    HAS_FIFTYONE = True
    print("✅ FiftyOne importado correctamente")
except ImportError as e:
    print(f"⚠️ Error al importar FiftyOne: {e}")
    HAS_FIFTYONE = False

# Cargar modelo
model = None
if HAS_FIFTYONE:
    try:
        print("🔄 Cargando modelo CLIP...")
        model = foz.load_zoo_model("clip-vit-base32-torch", device="cpu")
        print("✅ Modelo CLIP cargado correctamente")
    except Exception as e:
        print(f"⚠️ Error al cargar CLIP: {e}")
        model = None

# ========== BASE DE DATOS DE ALIMENTOS ==========
FOOD_DATABASE = {
    # Desayunos
    "huevos": {"calories": 70, "protein": 6, "carbs": 0.5, "fat": 5, "fiber": 0},
    "huevo": {"calories": 70, "protein": 6, "carbs": 0.5, "fat": 5, "fiber": 0},
    "tostada": {"calories": 80, "protein": 3, "carbs": 15, "fat": 1, "fiber": 1},
    "pan": {"calories": 80, "protein": 3, "carbs": 15, "fat": 1, "fiber": 1},
    "cereal": {"calories": 120, "protein": 3, "carbs": 25, "fat": 1, "fiber": 2},
    "yogur": {"calories": 100, "protein": 5, "carbs": 10, "fat": 4, "fiber": 0},
    "yogurt": {"calories": 100, "protein": 5, "carbs": 10, "fat": 4, "fiber": 0},
    "avena": {"calories": 150, "protein": 5, "carbs": 27, "fat": 3, "fiber": 4},
    "pancake": {"calories": 200, "protein": 5, "carbs": 25, "fat": 8, "fiber": 1},
    "waffle": {"calories": 220, "protein": 6, "carbs": 28, "fat": 9, "fiber": 1},
    "smoothie": {"calories": 150, "protein": 4, "carbs": 30, "fat": 2, "fiber": 3},
    "granola": {"calories": 180, "protein": 4, "carbs": 30, "fat": 5, "fiber": 4},
    
    # Almuerzos
    "ensalada": {"calories": 120, "protein": 4, "carbs": 10, "fat": 7, "fiber": 4},
    "salad": {"calories": 120, "protein": 4, "carbs": 10, "fat": 7, "fiber": 4},
    "pasta": {"calories": 200, "protein": 7, "carbs": 40, "fat": 2, "fiber": 3},
    "spaghetti": {"calories": 200, "protein": 7, "carbs": 40, "fat": 2, "fiber": 3},
    "arroz": {"calories": 200, "protein": 4, "carbs": 45, "fat": 0.5, "fiber": 1},
    "rice": {"calories": 200, "protein": 4, "carbs": 45, "fat": 0.5, "fiber": 1},
    "pollo": {"calories": 250, "protein": 30, "carbs": 0, "fat": 14, "fiber": 0},
    "chicken": {"calories": 250, "protein": 30, "carbs": 0, "fat": 14, "fiber": 0},
    "pescado": {"calories": 200, "protein": 25, "carbs": 0, "fat": 10, "fiber": 0},
    "fish": {"calories": 200, "protein": 25, "carbs": 0, "fat": 10, "fiber": 0},
    "sushi": {"calories": 150, "protein": 8, "carbs": 20, "fat": 4, "fiber": 1},
    "sandwich": {"calories": 250, "protein": 12, "carbs": 30, "fat": 10, "fiber": 3},
    "wrap": {"calories": 280, "protein": 14, "carbs": 32, "fat": 11, "fiber": 4},
    "sopa": {"calories": 150, "protein": 6, "carbs": 15, "fat": 7, "fiber": 2},
    "soup": {"calories": 150, "protein": 6, "carbs": 15, "fat": 7, "fiber": 2},
    
    # Cenas
    "pizza": {"calories": 280, "protein": 12, "carbs": 30, "fat": 12, "fiber": 2},
    "burger": {"calories": 350, "protein": 20, "carbs": 25, "fat": 18, "fiber": 2},
    "hamburguesa": {"calories": 350, "protein": 20, "carbs": 25, "fat": 18, "fiber": 2},
    "taco": {"calories": 250, "protein": 14, "carbs": 20, "fat": 13, "fiber": 3},
    "burrito": {"calories": 400, "protein": 18, "carbs": 40, "fat": 18, "fiber": 5},
    "carne": {"calories": 350, "protein": 28, "carbs": 0, "fat": 25, "fiber": 0},
    "steak": {"calories": 400, "protein": 35, "carbs": 0, "fat": 28, "fiber": 0},
    "salmon": {"calories": 300, "protein": 30, "carbs": 0, "fat": 18, "fiber": 0},
    "salmón": {"calories": 300, "protein": 30, "carbs": 0, "fat": 18, "fiber": 0},
    
    # Snacks
    "fruta": {"calories": 80, "protein": 1, "carbs": 20, "fat": 0.5, "fiber": 3},
    "fruit": {"calories": 80, "protein": 1, "carbs": 20, "fat": 0.5, "fiber": 3},
    "manzana": {"calories": 80, "protein": 1, "carbs": 20, "fat": 0.5, "fiber": 3},
    "banana": {"calories": 105, "protein": 1, "carbs": 27, "fat": 0.5, "fiber": 3},
    "nueces": {"calories": 180, "protein": 6, "carbs": 6, "fat": 16, "fiber": 3},
    "almendras": {"calories": 160, "protein": 6, "carbs": 6, "fat": 14, "fiber": 3},
    "chips": {"calories": 250, "protein": 3, "carbs": 20, "fat": 18, "fiber": 2},
    "helado": {"calories": 200, "protein": 4, "carbs": 20, "fat": 12, "fiber": 0},
    "ice cream": {"calories": 200, "protein": 4, "carbs": 20, "fat": 12, "fiber": 0},
    "galleta": {"calories": 150, "protein": 2, "carbs": 20, "fat": 7, "fiber": 1},
    "cookie": {"calories": 150, "protein": 2, "carbs": 20, "fat": 7, "fiber": 1},
    
    # Verduras
    "verduras": {"calories": 50, "protein": 2, "carbs": 10, "fat": 0.5, "fiber": 4},
    "vegetables": {"calories": 50, "protein": 2, "carbs": 10, "fat": 0.5, "fiber": 4},
    "brocoli": {"calories": 35, "protein": 3, "carbs": 7, "fat": 0.5, "fiber": 3},
    "zanahoria": {"calories": 40, "protein": 1, "carbs": 9, "fat": 0.5, "fiber": 3},
    "espinaca": {"calories": 20, "protein": 2, "carbs": 3, "fat": 0.5, "fiber": 2},
    
    # Comidas típicas
    "tortilla": {"calories": 200, "protein": 8, "carbs": 20, "fat": 10, "fiber": 2},
    "quesadilla": {"calories": 300, "protein": 12, "carbs": 25, "fat": 16, "fiber": 2},
    "enchilada": {"calories": 350, "protein": 15, "carbs": 30, "fat": 18, "fiber": 3},
    "empanada": {"calories": 250, "protein": 8, "carbs": 25, "fat": 14, "fiber": 2},
    "ceviche": {"calories": 200, "protein": 20, "carbs": 10, "fat": 8, "fiber": 1},
}

# Mapeo de nombres para mejorar reconocimiento
FOOD_ALIASES = {
    "dining table": "ensalada",
    "table": "ensalada",
    "plate": "comida",
    "dish": "comida",
    "meal": "comida",
    "food": "comida",
}

def get_food_info(food_name: str) -> dict:
    """Obtener información nutricional de un alimento"""
    food_lower = food_name.lower()
    
    # Verificar alias
    for alias, real_name in FOOD_ALIASES.items():
        if alias in food_lower:
            food_lower = real_name
            break
    
    # Buscar en la base de datos
    for key, info in FOOD_DATABASE.items():
        if key in food_lower:
            return {
                "name": key,
                "calories": info["calories"],
                "protein": info["protein"],
                "carbs": info["carbs"],
                "fat": info["fat"],
                "fiber": info["fiber"],
                "confidence": 0.85
            }
    
    # Si no se encuentra, devolver valores por defecto
    return {
        "name": food_name,
        "calories": 200,
        "protein": 8,
        "carbs": 15,
        "fat": 10,
        "fiber": 2,
        "confidence": 0.5
    }

def get_meal_type(label: str) -> str:
    """Determinar el tipo de comida"""
    label_lower = label.lower()
    
    breakfast = ["desayuno", "cereal", "yogur", "huevos", "toast", "pancake", "waffle", "granola", "smoothie", "tostadas", "avena", "panqueque", "omelette"]
    dinner = ["cena", "steak", "chicken", "fish", "pizza", "burger", "taco", "burrito", "carne", "pollo", "pescado", "bistec", "parrillada", "salmon", "salmón"]
    snack = ["snack", "fries", "ice cream", "cake", "fruit", "chips", "cookies", "galleta", "papas", "helado", "fruta", "galletas", "nueces", "almendras"]
    
    if any(word in label_lower for word in breakfast):
        return "Desayuno"
    elif any(word in label_lower for word in dinner):
        return "Cena"
    elif any(word in label_lower for word in snack):
        return "Snack"
    else:
        return "Almuerzo"

@app.route('/api/analyze-food', methods=['POST'])
def analyze_food():
    try:
        print("📥 Recibiendo solicitud de análisis...")
        
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No se proporcionó imagen'}), 400
        
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        print(f"📏 Tamaño de imagen base64: {len(image_data)} caracteres")
        
        # Decodificar imagen
        try:
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_np = np.array(image)
            print(f"✅ Imagen decodificada: {image_np.shape}")
        except Exception as e:
            return jsonify({'success': False, 'error': f'Error al decodificar imagen: {str(e)}'}), 400
        
        # Si no hay modelo, devolver error
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Modelo no disponible.'
            }), 500
        
        # Crear dataset temporal
        try:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                temp_path = tmp_file.name
                Image.fromarray(image_np).save(temp_path)
            
            dataset = fo.Dataset()
            dataset.add_sample(fo.Sample(filepath=temp_path))
            
            dataset.apply_model(model, label_field="food_prediction")
            
            results = []
            for sample in dataset:
                pred = sample.food_prediction
                if pred:
                    try:
                        top_preds = pred.top_k(5)
                    except:
                        top_preds = [pred]
                    
                    for p in top_preds:
                        results.append({
                            "label": p.label,
                            "confidence": float(p.confidence)
                        })
            
            dataset.delete()
            try:
                os.unlink(temp_path)
            except:
                pass
            
            print(f"📊 Resultados obtenidos: {len(results)} predicciones")
            
            if results:
                # Buscar el resultado que sea comida
                food_keywords = ["food", "meal", "dish", "plate", "dining", "table", "breakfast", "lunch", "dinner", "snack"]
                food_results = []
                
                for r in results:
                    label_lower = r["label"].lower()
                    # Verificar si parece comida
                    is_food = False
                    for keyword in food_keywords:
                        if keyword in label_lower:
                            is_food = True
                            break
                    
                    # Verificar si coincide con alguna comida en la base de datos
                    for food in FOOD_DATABASE.keys():
                        if food in label_lower or label_lower in food:
                            is_food = True
                            break
                    
                    if is_food:
                        food_results.append(r)
                
                # Si no hay resultados de comida, usar el primero
                if not food_results:
                    food_results = results
                
                top = food_results[0]
                
                # Obtener información nutricional
                food_info = get_food_info(top["label"])
                
                meal_type = get_meal_type(top["label"])
                
                print(f"✅ Comida identificada: {food_info['name']} ({food_info['calories']} cal)")
                
                return jsonify({
                    'success': True,
                    'name': food_info['name'].capitalize(),
                    'calories': food_info['calories'],
                    'protein': food_info['protein'],
                    'carbs': food_info['carbs'],
                    'fat': food_info['fat'],
                    'fiber': food_info['fiber'],
                    'confidence': food_info['confidence'],
                    'mealType': meal_type,
                    'all_predictions': results[:3]
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'No se pudo reconocer la comida.'
                }), 400
                
        except Exception as e:
            print(f"❌ Error en el análisis: {e}")
            try:
                dataset.delete()
                os.unlink(temp_path)
            except:
                pass
            return jsonify({'success': False, 'error': str(e)}), 500
            
    except Exception as e:
        print(f"❌ Error general: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'Servidor de reconocimiento de alimentos funcionando',
        'model_loaded': model is not None,
        'fiftyone_available': HAS_FIFTYONE
    })

if __name__ == '__main__':
    print("🚀 Iniciando servidor de reconocimiento de alimentos...")
    print("📍 Servidor en: http://localhost:5000")
    print(f"📊 FiftyOne disponible: {HAS_FIFTYONE}")
    print(f"🧠 Modelo cargado: {model is not None}")
    print(f"📚 Base de datos de alimentos: {len(FOOD_DATABASE)} items")
    app.run(debug=True, host='0.0.0.0', port=5000)