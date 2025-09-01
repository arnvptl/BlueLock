import tensorflow as tf
import numpy as np
import os
import logging
from typing import Dict, List, Tuple, Optional
from config import Config
import cv2

logger = logging.getLogger(__name__)

class VegetationDetectionModel:
    """TensorFlow-based vegetation detection model"""
    
    def __init__(self):
        self.config = Config()
        self.model = None
        self.is_loaded = False
        
    def load_model(self, model_path: str = None) -> bool:
        """Load the pre-trained vegetation detection model"""
        try:
            if model_path is None:
                model_path = self.config.MODEL_PATH
            
            if not os.path.exists(model_path):
                logger.warning(f"Model file not found at {model_path}. Using default model.")
                self._create_default_model()
                return True
            
            # Load the model
            self.model = tf.keras.models.load_model(model_path)
            self.is_loaded = True
            logger.info(f"Model loaded successfully from {model_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self._create_default_model()
            return False
    
    def _create_default_model(self):
        """Create a simple default model for vegetation detection"""
        try:
            # Simple CNN model for vegetation detection
            model = tf.keras.Sequential([
                tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
                tf.keras.layers.MaxPooling2D((2, 2)),
                tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
                tf.keras.layers.MaxPooling2D((2, 2)),
                tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
                tf.keras.layers.Flatten(),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dropout(0.5),
                tf.keras.layers.Dense(1, activation='sigmoid')
            ])
            
            model.compile(
                optimizer='adam',
                loss='binary_crossentropy',
                metrics=['accuracy']
            )
            
            self.model = model
            self.is_loaded = True
            logger.info("Default model created successfully")
            
        except Exception as e:
            logger.error(f"Error creating default model: {str(e)}")
            raise
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for model input"""
        try:
            # Resize to model input size
            resized = tf.image.resize(image, (224, 224))
            
            # Normalize pixel values
            normalized = resized / 255.0
            
            # Add batch dimension
            batched = tf.expand_dims(normalized, axis=0)
            
            return batched
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def predict_vegetation(self, image: np.ndarray) -> Tuple[float, np.ndarray]:
        """Predict vegetation probability for image"""
        try:
            if not self.is_loaded:
                self.load_model()
            
            # Preprocess image
            preprocessed = self.preprocess_image(image)
            
            # Make prediction
            prediction = self.model.predict(preprocessed, verbose=0)
            vegetation_probability = float(prediction[0][0])
            
            # Create confidence map (simplified)
            confidence_map = np.full(image.shape[:2], vegetation_probability)
            
            return vegetation_probability, confidence_map
            
        except Exception as e:
            logger.error(f"Error predicting vegetation: {str(e)}")
            raise
    
    def segment_vegetation(self, image: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """Segment vegetation areas using the AI model"""
        try:
            # Get vegetation prediction
            vegetation_prob, confidence_map = self.predict_vegetation(image)
            
            # Create segmentation mask
            threshold = self.config.CONFIDENCE_THRESHOLD
            segmentation_mask = confidence_map > threshold
            
            # Apply morphological operations
            kernel = np.ones((5, 5), np.uint8)
            segmentation_mask = cv2.morphologyEx(segmentation_mask.astype(np.uint8), 
                                               cv2.MORPH_CLOSE, kernel)
            segmentation_mask = cv2.morphologyEx(segmentation_mask, cv2.MORPH_OPEN, kernel)
            
            # Calculate statistics
            total_pixels = image.shape[0] * image.shape[1]
            vegetation_pixels = np.sum(segmentation_mask > 0)
            vegetation_coverage = vegetation_pixels / total_pixels
            
            stats = {
                'vegetation_probability': round(vegetation_prob, 3),
                'vegetation_coverage': vegetation_coverage,
                'vegetation_pixels': int(vegetation_pixels),
                'total_pixels': int(total_pixels),
                'confidence_threshold': threshold
            }
            
            return segmentation_mask, stats
            
        except Exception as e:
            logger.error(f"Error segmenting vegetation: {str(e)}")
            raise
    
    def analyze_vegetation_health(self, image: np.ndarray, ndvi: np.ndarray) -> Dict:
        """Analyze vegetation health using AI and NDVI"""
        try:
            # Get AI-based vegetation detection
            vegetation_prob, confidence_map = self.predict_vegetation(image)
            
            # Combine with NDVI analysis
            avg_ndvi = np.mean(ndvi)
            
            # Calculate health score
            health_score = (vegetation_prob + avg_ndvi) / 2
            
            # Determine health category
            if health_score > 0.7:
                health_category = "Excellent"
            elif health_score > 0.5:
                health_category = "Good"
            elif health_score > 0.3:
                health_category = "Fair"
            else:
                health_category = "Poor"
            
            return {
                'health_score': round(health_score, 3),
                'health_category': health_category,
                'ai_vegetation_probability': round(vegetation_prob, 3),
                'average_ndvi': round(avg_ndvi, 3),
                'confidence_level': 'high' if vegetation_prob > 0.8 else 'medium'
            }
            
        except Exception as e:
            logger.error(f"Error analyzing vegetation health: {str(e)}")
            raise
    
    def save_model(self, model_path: str = None):
        """Save the trained model"""
        try:
            if model_path is None:
                model_path = self.config.MODEL_PATH
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            
            if self.model is not None:
                self.model.save(model_path)
                logger.info(f"Model saved successfully to {model_path}")
            else:
                logger.warning("No model to save")
                
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise

class TensorFlowProcessor:
    """TensorFlow-based image processing utilities"""
    
    def __init__(self):
        self.config = Config()
        self.vegetation_model = VegetationDetectionModel()
    
    def enhance_ndvi_calculation(self, image: np.ndarray) -> np.ndarray:
        """Enhanced NDVI calculation using TensorFlow operations"""
        try:
            # Convert to TensorFlow tensor
            image_tensor = tf.convert_to_tensor(image, dtype=tf.float32)
            
            # Extract bands
            red_band = image_tensor[:, :, 0]
            green_band = image_tensor[:, :, 1]
            blue_band = image_tensor[:, :, 2]
            
            # Enhanced vegetation index calculation
            # Using multiple band combinations for better accuracy
            ndvi_1 = (green_band - red_band) / (green_band + red_band + 1e-8)
            ndvi_2 = (green_band - blue_band) / (green_band + blue_band + 1e-8)
            
            # Combine indices
            enhanced_ndvi = (ndvi_1 + ndvi_2) / 2
            
            # Normalize to 0-1 range
            enhanced_ndvi = (enhanced_ndvi + 1) / 2
            
            # Apply smoothing
            enhanced_ndvi = tf.expand_dims(enhanced_ndvi, axis=-1)
            enhanced_ndvi = tf.image.gaussian_filter2d(enhanced_ndvi, filter_shape=3, sigma=1.0)
            enhanced_ndvi = tf.squeeze(enhanced_ndvi)
            
            return enhanced_ndvi.numpy()
            
        except Exception as e:
            logger.error(f"Error in enhanced NDVI calculation: {str(e)}")
            raise
    
    def detect_vegetation_types(self, image: np.ndarray) -> Dict:
        """Detect different types of vegetation"""
        try:
            # This is a simplified implementation
            # In a real scenario, you would have a trained model for vegetation classification
            
            # Calculate color-based features
            red_mean = np.mean(image[:, :, 0])
            green_mean = np.mean(image[:, :, 1])
            blue_mean = np.mean(image[:, :, 2])
            
            # Simple vegetation type classification based on color ratios
            green_red_ratio = green_mean / (red_mean + 1e-8)
            green_blue_ratio = green_mean / (blue_mean + 1e-8)
            
            vegetation_types = {
                'dense_forest': 0.0,
                'sparse_vegetation': 0.0,
                'grassland': 0.0,
                'water': 0.0
            }
            
            # Simple classification logic
            if green_red_ratio > 1.2 and green_blue_ratio > 1.1:
                vegetation_types['dense_forest'] = 0.8
                vegetation_types['sparse_vegetation'] = 0.2
            elif green_red_ratio > 1.0:
                vegetation_types['sparse_vegetation'] = 0.6
                vegetation_types['grassland'] = 0.4
            elif blue_mean > red_mean and blue_mean > green_mean:
                vegetation_types['water'] = 0.9
            else:
                vegetation_types['grassland'] = 0.7
                vegetation_types['sparse_vegetation'] = 0.3
            
            return vegetation_types
            
        except Exception as e:
            logger.error(f"Error detecting vegetation types: {str(e)}")
            raise
    
    def estimate_biomass(self, ndvi: np.ndarray, image_area: float) -> Dict:
        """Estimate biomass based on NDVI values"""
        try:
            # Calculate biomass using NDVI-based equations
            # This is a simplified model - real implementations would use more complex equations
            
            avg_ndvi = np.mean(ndvi)
            
            # Biomass estimation (kg/m²)
            # Using a simplified equation: Biomass = a * NDVI^b
            a = 2.5  # Coefficient
            b = 2.0  # Exponent
            
            biomass_per_sqm = a * (avg_ndvi ** b)
            
            # Calculate total biomass
            total_biomass = biomass_per_sqm * image_area
            
            # Convert to tons
            total_biomass_tons = total_biomass / 1000
            
            return {
                'biomass_per_sqm_kg': round(biomass_per_sqm, 2),
                'total_biomass_kg': round(total_biomass, 2),
                'total_biomass_tons': round(total_biomass_tons, 4),
                'ndvi_coefficient': round(avg_ndvi, 3),
                'estimation_confidence': 'medium'
            }
            
        except Exception as e:
            logger.error(f"Error estimating biomass: {str(e)}")
            raise
    
    def process_with_ai(self, image: np.ndarray, metadata: Dict) -> Dict:
        """Complete AI-based processing pipeline"""
        try:
            # Load vegetation detection model
            self.vegetation_model.load_model()
            
            # Enhanced NDVI calculation
            enhanced_ndvi = self.enhance_ndvi_calculation(image)
            
            # AI-based vegetation segmentation
            segmentation_mask, segmentation_stats = self.vegetation_model.segment_vegetation(image)
            
            # Vegetation health analysis
            health_analysis = self.vegetation_model.analyze_vegetation_health(image, enhanced_ndvi)
            
            # Vegetation type detection
            vegetation_types = self.detect_vegetation_types(image)
            
            # Biomass estimation
            image_area = metadata.get('image_area', 1000)  # Default 1000 sqm
            biomass_estimation = self.estimate_biomass(enhanced_ndvi, image_area)
            
            return {
                'enhanced_ndvi': {
                    'average_ndvi': round(np.mean(enhanced_ndvi), 3),
                    'ndvi_std': round(np.std(enhanced_ndvi), 3)
                },
                'ai_segmentation': segmentation_stats,
                'vegetation_health': health_analysis,
                'vegetation_types': vegetation_types,
                'biomass_estimation': biomass_estimation,
                'processing_method': 'ai_enhanced'
            }
            
        except Exception as e:
            logger.error(f"Error in AI processing: {str(e)}")
            raise
