from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import logging
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import traceback

from config import Config
from utils.image_processor import ImageProcessor
from utils.ai_model import TensorFlowProcessor
from utils.blockchain_client import BlockchainClient

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
Config.init_app(app)

# Configure CORS
CORS(app, origins=Config.CORS_ORIGINS)

# Configure rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[Config.RATE_LIMIT_DEFAULT],
    storage_uri=Config.RATE_LIMIT_STORAGE_URL
)

# Initialize processors
image_processor = ImageProcessor()
ai_processor = TensorFlowProcessor()
blockchain_client = BlockchainClient()

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def validate_metadata(metadata):
    """Validate required metadata fields"""
    required_fields = Config.REQUIRED_METADATA
    missing_fields = []
    
    for field in required_fields:
        if field not in metadata or metadata[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        return False, f"Missing required metadata fields: {', '.join(missing_fields)}"
    
    return True, "Metadata validation successful"

@app.route('/health', methods=['GET'])
@limiter.limit("100 per minute")
def health_check():
    """Health check endpoint"""
    try:
        # Check blockchain API health
        blockchain_health = blockchain_client.health_check()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'services': {
                'drone_analysis_api': 'healthy',
                'blockchain_api': blockchain_health.get('status', 'unknown')
            },
            'config': {
                'upload_folder': Config.UPLOAD_FOLDER,
                'max_file_size': Config.MAX_CONTENT_LENGTH,
                'allowed_extensions': list(Config.ALLOWED_EXTENSIONS)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/analyze', methods=['POST'])
@limiter.limit("10 per minute")
def analyze_drone_image():
    """Analyze drone image and estimate CO2 sequestration"""
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No image file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Allowed types: {", ".join(Config.ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Get metadata from form data
        metadata = {}
        for field in Config.REQUIRED_METADATA:
            metadata[field] = request.form.get(field)
        
        # Validate metadata
        is_valid, validation_message = validate_metadata(metadata)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': validation_message
            }), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        logger.info(f"Image uploaded: {filename}")
        
        # Process image with OpenCV
        logger.info("Starting image processing with OpenCV")
        opencv_results = image_processor.process_drone_image(filepath, metadata)
        
        # Process with AI (TensorFlow)
        logger.info("Starting AI processing with TensorFlow")
        ai_results = ai_processor.process_with_ai(opencv_results['image_analysis']['image'], metadata)
        
        # Combine results
        combined_results = {
            **opencv_results,
            'ai_analysis': ai_results,
            'processing_method': 'opencv_tensorflow_combined'
        }
        
        # Send to blockchain API
        logger.info("Sending results to blockchain API")
        blockchain_response = blockchain_client.send_mrv_data(combined_results, metadata)
        
        # Prepare response
        response_data = {
            'success': True,
            'message': 'Drone image analysis completed successfully',
            'data': {
                'analysis_id': f"ANALYSIS_{timestamp}",
                'image_filename': filename,
                'opencv_analysis': opencv_results,
                'ai_analysis': ai_results,
                'blockchain_response': blockchain_response,
                'processing_timestamp': datetime.now().isoformat()
            }
        }
        
        logger.info(f"Analysis completed successfully: {response_data['data']['analysis_id']}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error in image analysis: {str(e)}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'error': 'Internal server error during image analysis',
            'details': str(e) if Config.DEBUG else 'Contact support for details'
        }), 500

@app.route('/analyze/batch', methods=['POST'])
@limiter.limit("5 per minute")
def analyze_batch_images():
    """Analyze multiple drone images in batch"""
    try:
        # Check if files are present
        if 'images' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image files provided'
            }), 400
        
        files = request.files.getlist('images')
        if not files or files[0].filename == '':
            return jsonify({
                'success': False,
                'error': 'No image files selected'
            }), 400
        
        # Get batch metadata
        batch_metadata = {
            'batch_id': request.form.get('batch_id', f"BATCH_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
            'project_id': request.form.get('project_id', 'DRONE_BATCH_ANALYSIS'),
            'drone_id': request.form.get('drone_id', 'BATCH_DRONE'),
            'timestamp': datetime.now().isoformat()
        }
        
        batch_results = []
        processed_files = []
        
        for i, file in enumerate(files):
            try:
                if not allowed_file(file.filename):
                    logger.warning(f"Skipping file with invalid extension: {file.filename}")
                    continue
                
                # Save file
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{timestamp}_{i}_{filename}"
                filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
                file.save(filepath)
                
                # Process image
                logger.info(f"Processing batch image {i+1}/{len(files)}: {filename}")
                
                # Use default metadata for batch processing
                metadata = {
                    'latitude': batch_metadata.get('latitude', 0),
                    'longitude': batch_metadata.get('longitude', 0),
                    'altitude': batch_metadata.get('altitude', 100),
                    'timestamp': batch_metadata['timestamp'],
                    'drone_id': batch_metadata['drone_id'],
                    'camera_model': batch_metadata.get('camera_model', 'batch_camera'),
                    'image_resolution': {'width': 1920, 'height': 1080}
                }
                
                # Process with OpenCV
                opencv_results = image_processor.process_drone_image(filepath, metadata)
                
                # Process with AI
                ai_results = ai_processor.process_with_ai(opencv_results['image_analysis']['image'], metadata)
                
                # Combine results
                combined_results = {
                    **opencv_results,
                    'ai_analysis': ai_results,
                    'processing_method': 'batch_opencv_tensorflow'
                }
                
                batch_results.append(combined_results)
                processed_files.append(filename)
                
            except Exception as e:
                logger.error(f"Error processing batch image {i+1}: {str(e)}")
                continue
        
        if not batch_results:
            return jsonify({
                'success': False,
                'error': 'No images were successfully processed'
            }), 400
        
        # Send batch to blockchain
        logger.info(f"Sending batch results to blockchain: {len(batch_results)} analyses")
        blockchain_response = blockchain_client.send_batch_data(batch_results)
        
        # Calculate batch statistics
        total_co2 = sum(r['co2_estimation']['co2_sequestered_tons'] for r in batch_results)
        avg_vegetation_coverage = sum(r['vegetation_analysis']['vegetation_coverage'] for r in batch_results) / len(batch_results)
        
        response_data = {
            'success': True,
            'message': f'Batch analysis completed successfully',
            'data': {
                'batch_id': batch_metadata['batch_id'],
                'total_images_processed': len(batch_results),
                'total_images_received': len(files),
                'processed_files': processed_files,
                'batch_statistics': {
                    'total_co2_sequestered_tons': round(total_co2, 4),
                    'average_vegetation_coverage': round(avg_vegetation_coverage, 3),
                    'processing_timestamp': datetime.now().isoformat()
                },
                'blockchain_response': blockchain_response
            }
        }
        
        logger.info(f"Batch analysis completed: {len(batch_results)} images processed")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error in batch analysis: {str(e)}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'error': 'Internal server error during batch analysis',
            'details': str(e) if Config.DEBUG else 'Contact support for details'
        }), 500

@app.route('/mint-credits', methods=['POST'])
@limiter.limit("5 per minute")
def mint_carbon_credits():
    """Mint carbon credits based on analysis results"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        analysis_results = data.get('analysis_results')
        metadata = data.get('metadata', {})
        
        if not analysis_results:
            return jsonify({
                'success': False,
                'error': 'Analysis results required'
            }), 400
        
        # Mint credits
        logger.info("Minting carbon credits")
        mint_response = blockchain_client.mint_carbon_credits(analysis_results, metadata)
        
        return jsonify({
            'success': True,
            'message': 'Carbon credits minted successfully',
            'data': mint_response
        }), 200
        
    except Exception as e:
        logger.error(f"Error minting credits: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to mint carbon credits',
            'details': str(e) if Config.DEBUG else 'Contact support for details'
        }), 500

@app.route('/register-project', methods=['POST'])
@limiter.limit("10 per minute")
def register_project():
    """Register a new project based on drone analysis"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        analysis_results = data.get('analysis_results')
        metadata = data.get('metadata', {})
        
        if not analysis_results:
            return jsonify({
                'success': False,
                'error': 'Analysis results required'
            }), 400
        
        # Register project
        logger.info("Registering new project")
        project_response = blockchain_client.register_project(metadata, analysis_results)
        
        return jsonify({
            'success': True,
            'message': 'Project registered successfully',
            'data': project_response
        }), 200
        
    except Exception as e:
        logger.error(f"Error registering project: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to register project',
            'details': str(e) if Config.DEBUG else 'Contact support for details'
        }), 500

@app.route('/credits/<project_id>', methods=['GET'])
@limiter.limit("100 per minute")
def get_project_credits(project_id):
    """Get carbon credits for a specific project"""
    try:
        credits = blockchain_client.get_project_credits(project_id)
        
        return jsonify({
            'success': True,
            'data': credits
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting project credits: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get project credits',
            'details': str(e) if Config.DEBUG else 'Contact support for details'
        }), 500

@app.route('/credits/supply', methods=['GET'])
@limiter.limit("100 per minute")
def get_total_supply():
    """Get total carbon credit supply"""
    try:
        supply = blockchain_client.get_total_supply()
        
        return jsonify({
            'success': True,
            'data': supply
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting total supply: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get total supply',
            'details': str(e) if Config.DEBUG else 'Contact support for details'
        }), 500

@app.route('/visualization/<filename>', methods=['GET'])
@limiter.limit("100 per minute")
def get_visualization(filename):
    """Get processed visualization image"""
    try:
        filepath = os.path.join(Config.PROCESSED_IMAGES_PATH, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': 'Visualization file not found'
            }), 404
        
        return send_file(filepath, mimetype='image/png')
        
    except Exception as e:
        logger.error(f"Error serving visualization: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to serve visualization'
        }), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size: {Config.MAX_CONTENT_LENGTH / (1024*1024)}MB'
    }), 413

@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit error"""
    return jsonify({
        'success': False,
        'error': 'Rate limit exceeded. Please try again later.'
    }), 429

@app.errorhandler(404)
def not_found(e):
    """Handle 404 error"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server error"""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    logger.info("Starting Drone Analysis API")
    logger.info(f"Upload folder: {Config.UPLOAD_FOLDER}")
    logger.info(f"Max file size: {Config.MAX_CONTENT_LENGTH / (1024*1024)}MB")
    logger.info(f"Allowed extensions: {Config.ALLOWED_EXTENSIONS}")
    
    app.run(
        host='0.0.0.0',
        port=Config.PORT,
        debug=Config.DEBUG
    )
