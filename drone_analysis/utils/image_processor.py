import cv2
import numpy as np
from PIL import Image
import os
from typing import Tuple, Dict, Optional
import logging
from datetime import datetime
from config import Config

logger = logging.getLogger(__name__)

class ImageProcessor:
    """Image processing utility for drone vegetation analysis"""
    
    def __init__(self):
        self.config = Config()
        
    def load_image(self, image_path: str) -> np.ndarray:
        """Load image from file path"""
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            # Load image using OpenCV
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Failed to load image: {image_path}")
            
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            return image_rgb
            
        except Exception as e:
            logger.error(f"Error loading image {image_path}: {str(e)}")
            raise
    
    def resize_image(self, image: np.ndarray, width: int = None, height: int = None) -> np.ndarray:
        """Resize image while maintaining aspect ratio"""
        try:
            if width is None:
                width = self.config.IMAGE_RESIZE_WIDTH
            if height is None:
                height = self.config.IMAGE_RESIZE_HEIGHT
            
            # Calculate aspect ratio
            h, w = image.shape[:2]
            aspect_ratio = w / h
            
            if width / height > aspect_ratio:
                # Height is the limiting factor
                new_height = height
                new_width = int(height * aspect_ratio)
            else:
                # Width is the limiting factor
                new_width = width
                new_height = int(width / aspect_ratio)
            
            # Resize image
            resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            return resized
            
        except Exception as e:
            logger.error(f"Error resizing image: {str(e)}")
            raise
    
    def calculate_ndvi(self, image: np.ndarray) -> Tuple[np.ndarray, float]:
        """Calculate Normalized Difference Vegetation Index (NDVI)"""
        try:
            # For RGB images, we'll use a simplified NDVI calculation
            # Red channel (band 0) and Green channel (band 1) approximation
            red_band = image[:, :, 0].astype(float)
            green_band = image[:, :, 1].astype(float)
            
            # Calculate NDVI: (NIR - Red) / (NIR + Red)
            # For RGB images, we approximate NIR with green channel
            numerator = green_band - red_band
            denominator = green_band + red_band
            
            # Avoid division by zero
            denominator = np.where(denominator == 0, 1e-10, denominator)
            
            ndvi = numerator / denominator
            
            # Normalize NDVI to 0-1 range
            ndvi = (ndvi + 1) / 2
            
            # Calculate average NDVI
            avg_ndvi = np.mean(ndvi)
            
            return ndvi, avg_ndvi
            
        except Exception as e:
            logger.error(f"Error calculating NDVI: {str(e)}")
            raise
    
    def detect_vegetation(self, image: np.ndarray, ndvi: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """Detect vegetation areas using NDVI threshold"""
        try:
            # Create vegetation mask
            vegetation_mask = ndvi > self.config.VEGETATION_INDEX_THRESHOLD
            
            # Apply morphological operations to clean up the mask
            kernel = np.ones((5, 5), np.uint8)
            vegetation_mask = cv2.morphologyEx(vegetation_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
            vegetation_mask = cv2.morphologyEx(vegetation_mask, cv2.MORPH_OPEN, kernel)
            
            # Find contours of vegetation areas
            contours, _ = cv2.findContours(vegetation_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter contours by area
            min_area = image.shape[0] * image.shape[1] * self.config.MIN_VEGETATION_AREA
            valid_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > min_area]
            
            # Create final vegetation mask
            final_mask = np.zeros_like(vegetation_mask)
            cv2.fillPoly(final_mask, valid_contours, 255)
            
            # Calculate vegetation statistics
            total_pixels = image.shape[0] * image.shape[1]
            vegetation_pixels = np.sum(final_mask > 0)
            vegetation_coverage = vegetation_pixels / total_pixels
            
            # Calculate vegetation density (average NDVI in vegetation areas)
            vegetation_ndvi = ndvi[final_mask > 0]
            vegetation_density = np.mean(vegetation_ndvi) if len(vegetation_ndvi) > 0 else 0
            
            stats = {
                'vegetation_coverage': vegetation_coverage,
                'vegetation_density': vegetation_density,
                'vegetation_pixels': int(vegetation_pixels),
                'total_pixels': int(total_pixels),
                'num_vegetation_areas': len(valid_contours)
            }
            
            return final_mask, stats
            
        except Exception as e:
            logger.error(f"Error detecting vegetation: {str(e)}")
            raise
    
    def estimate_co2_sequestration(self, vegetation_stats: Dict, image_area_sqm: float) -> Dict:
        """Estimate CO2 sequestration based on vegetation analysis"""
        try:
            vegetation_coverage = vegetation_stats['vegetation_coverage']
            vegetation_density = vegetation_stats['vegetation_density']
            
            # Calculate vegetated area in square meters
            vegetated_area = image_area_sqm * vegetation_coverage
            
            # Apply density multiplier
            effective_area = vegetated_area * vegetation_density * self.config.VEGETATION_DENSITY_MULTIPLIER
            
            # Estimate CO2 sequestration (kg CO2)
            co2_sequestered = effective_area * self.config.CO2_PER_SQM
            
            # Convert to tons
            co2_sequestered_tons = co2_sequestered / 1000
            
            return {
                'co2_sequestered_kg': round(co2_sequestered, 2),
                'co2_sequestered_tons': round(co2_sequestered_tons, 4),
                'vegetated_area_sqm': round(vegetated_area, 2),
                'effective_area_sqm': round(effective_area, 2),
                'vegetation_coverage_percent': round(vegetation_coverage * 100, 2),
                'vegetation_density_score': round(vegetation_density, 3)
            }
            
        except Exception as e:
            logger.error(f"Error estimating CO2 sequestration: {str(e)}")
            raise
    
    def create_visualization(self, image: np.ndarray, ndvi: np.ndarray, 
                           vegetation_mask: np.ndarray, output_path: str) -> str:
        """Create visualization of analysis results"""
        try:
            # Create figure with subplots
            import matplotlib.pyplot as plt
            
            fig, axes = plt.subplots(2, 2, figsize=(12, 10))
            
            # Original image
            axes[0, 0].imshow(image)
            axes[0, 0].set_title('Original Image')
            axes[0, 0].axis('off')
            
            # NDVI map
            ndvi_plot = axes[0, 1].imshow(ndvi, cmap='RdYlGn', vmin=0, vmax=1)
            axes[0, 1].set_title('NDVI Map')
            axes[0, 1].axis('off')
            plt.colorbar(ndvi_plot, ax=axes[0, 1])
            
            # Vegetation mask
            axes[1, 0].imshow(vegetation_mask, cmap='Greens')
            axes[1, 0].set_title('Vegetation Detection')
            axes[1, 0].axis('off')
            
            # Overlay
            overlay = image.copy()
            overlay[vegetation_mask > 0] = [0, 255, 0]  # Green overlay
            axes[1, 1].imshow(overlay)
            axes[1, 1].set_title('Vegetation Overlay')
            axes[1, 1].axis('off')
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating visualization: {str(e)}")
            raise
    
    def save_processed_image(self, image: np.ndarray, filename: str) -> str:
        """Save processed image to disk"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"processed_{timestamp}_{filename}"
            output_path = os.path.join(self.config.PROCESSED_IMAGES_PATH, output_filename)
            
            # Convert RGB to BGR for OpenCV
            image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
            cv2.imwrite(output_path, image_bgr)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error saving processed image: {str(e)}")
            raise
    
    def calculate_image_area(self, altitude: float, focal_length: float, 
                           sensor_width: float, image_width: int, image_height: int) -> float:
        """Calculate ground area covered by the image in square meters"""
        try:
            # Calculate ground sample distance (GSD)
            gsd = (sensor_width * altitude) / (focal_length * image_width)
            
            # Calculate ground dimensions
            ground_width = gsd * image_width
            ground_height = gsd * image_height
            
            # Calculate area in square meters
            area_sqm = ground_width * ground_height
            
            return area_sqm
            
        except Exception as e:
            logger.error(f"Error calculating image area: {str(e)}")
            raise
    
    def process_drone_image(self, image_path: str, metadata: Dict) -> Dict:
        """Complete image processing pipeline for drone images"""
        try:
            # Load and resize image
            image = self.load_image(image_path)
            resized_image = self.resize_image(image)
            
            # Calculate NDVI
            ndvi, avg_ndvi = self.calculate_ndvi(resized_image)
            
            # Detect vegetation
            vegetation_mask, vegetation_stats = self.detect_vegetation(resized_image, ndvi)
            
            # Calculate image area
            altitude = metadata.get('altitude', 100)  # meters
            focal_length = metadata.get('focal_length', 35)  # mm
            sensor_width = metadata.get('sensor_width', 23.5)  # mm
            image_width = metadata.get('image_resolution', {}).get('width', resized_image.shape[1])
            image_height = metadata.get('image_resolution', {}).get('height', resized_image.shape[0])
            
            image_area = self.calculate_image_area(altitude, focal_length, sensor_width, 
                                                 image_width, image_height)
            
            # Estimate CO2 sequestration
            co2_estimation = self.estimate_co2_sequestration(vegetation_stats, image_area)
            
            # Create visualization if requested
            visualization_path = None
            if self.config.SAVE_PROCESSED_IMAGES:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                viz_filename = f"analysis_{timestamp}.png"
                viz_path = os.path.join(self.config.PROCESSED_IMAGES_PATH, viz_filename)
                visualization_path = self.create_visualization(resized_image, ndvi, 
                                                             vegetation_mask, viz_path)
            
            # Prepare results
            results = {
                'image_analysis': {
                    'image_path': image_path,
                    'image_dimensions': {
                        'width': resized_image.shape[1],
                        'height': resized_image.shape[0]
                    },
                    'average_ndvi': round(avg_ndvi, 3),
                    'visualization_path': visualization_path
                },
                'vegetation_analysis': vegetation_stats,
                'co2_estimation': co2_estimation,
                'metadata': metadata,
                'processing_timestamp': datetime.now().isoformat()
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error processing drone image: {str(e)}")
            raise
