# Drone Analysis API

A Python Flask API for analyzing drone images using OpenCV and TensorFlow to estimate vegetation density and CO2 sequestration, with integration to blockchain APIs for carbon credit management.

## Features

### 🚁 **Drone Image Processing**
- Accepts image uploads from drones (PNG, JPG, JPEG, TIFF)
- Automatic image resizing and optimization
- Support for batch processing of multiple images

### 🌿 **Vegetation Analysis**
- **OpenCV-based processing**: NDVI calculation, vegetation detection, morphological operations
- **TensorFlow AI enhancement**: Advanced vegetation segmentation, health analysis, biomass estimation
- **Multi-band analysis**: Red, Green, Blue channel processing for RGB images
- **Vegetation density mapping**: Automatic detection and quantification of vegetation areas

### 📊 **CO2 Sequestration Estimation**
- **Area-based calculations**: Ground area calculation using drone altitude and camera parameters
- **Density-weighted estimation**: CO2 sequestration based on vegetation coverage and density
- **Configurable parameters**: Adjustable CO2 per square meter and density multipliers
- **Multiple units**: Results in both kg and tons of CO2

### ⛓️ **Blockchain Integration**
- **MRV data upload**: Sends processed data to blockchain API
- **Carbon credit minting**: Automatic credit creation based on analysis results
- **Project registration**: Creates new projects from drone analysis
- **Batch processing**: Handles multiple images in single blockchain transaction

### 🔧 **Technical Features**
- **Rate limiting**: Configurable API rate limits
- **Error handling**: Comprehensive error handling and logging
- **File validation**: Secure file upload with type and size validation
- **CORS support**: Cross-origin resource sharing configuration
- **Health monitoring**: API health check endpoints

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Drone Image   │───▶│  Flask API       │───▶│  Blockchain API │
│   Upload        │    │  (OpenCV + TF)   │    │  (Carbon Credits)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Analysis Results│
                       │  (JSON + Images) │
                       └──────────────────┘
```

## Installation

### Prerequisites

- Python 3.8+
- OpenCV 4.8+
- TensorFlow 2.13+
- Flask 2.3+
- Redis (optional, for rate limiting)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd drone_analysis
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Create necessary directories**
   ```bash
   mkdir -p uploads processed_images logs models
   ```

## Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```env
# Flask Configuration
SECRET_KEY=your-secret-key
DEBUG=False
PORT=5001

# Blockchain API
BLOCKCHAIN_API_URL=http://localhost:3000/api
BLOCKCHAIN_API_KEY=your-api-key

# File Upload
UPLOAD_FOLDER=./uploads
MAX_CONTENT_LENGTH=104857600  # 100MB

# AI Model
MODEL_PATH=./models/vegetation_detection.h5
CONFIDENCE_THRESHOLD=0.7

# CO2 Estimation
CO2_PER_SQM=0.5
VEGETATION_DENSITY_MULTIPLIER=1.2
```

### Required Metadata Fields

Each drone image upload must include:

- `latitude`: GPS latitude
- `longitude`: GPS longitude  
- `altitude`: Drone altitude in meters
- `timestamp`: Image capture timestamp
- `drone_id`: Unique drone identifier
- `camera_model`: Camera model name
- `image_resolution`: Image dimensions (width, height)

## API Endpoints

### Health Check
```http
GET /health
```
Returns API health status and configuration.

### Single Image Analysis
```http
POST /analyze
Content-Type: multipart/form-data

Form Data:
- image: Image file
- latitude: GPS latitude
- longitude: GPS longitude
- altitude: Drone altitude
- timestamp: Capture timestamp
- drone_id: Drone identifier
- camera_model: Camera model
- image_resolution: JSON string with width/height
```

### Batch Image Analysis
```http
POST /analyze/batch
Content-Type: multipart/form-data

Form Data:
- images: Multiple image files
- batch_id: Batch identifier
- project_id: Project identifier
- drone_id: Drone identifier
```

### Carbon Credit Minting
```http
POST /mint-credits
Content-Type: application/json

{
  "analysis_results": {...},
  "metadata": {...}
}
```

### Project Registration
```http
POST /register-project
Content-Type: application/json

{
  "analysis_results": {...},
  "metadata": {...}
}
```

### Get Project Credits
```http
GET /credits/{project_id}
```

### Get Total Supply
```http
GET /credits/supply
```

### Get Visualization
```http
GET /visualization/{filename}
```

## Usage Examples

### Python Client Example

```python
import requests

# Single image analysis
with open('drone_image.jpg', 'rb') as f:
    files = {'image': f}
    data = {
        'latitude': '12.9716',
        'longitude': '77.5946',
        'altitude': '100',
        'timestamp': '2024-01-15T10:30:00Z',
        'drone_id': 'DRONE_001',
        'camera_model': 'DJI_FC7303',
        'image_resolution': '{"width": 4000, "height": 3000}'
    }
    
    response = requests.post('http://localhost:5001/analyze', 
                           files=files, data=data)
    result = response.json()
    print(f"CO2 Sequestered: {result['data']['opencv_analysis']['co2_estimation']['co2_sequestered_tons']} tons")
```

### cURL Example

```bash
curl -X POST http://localhost:5001/analyze \
  -F "image=@drone_image.jpg" \
  -F "latitude=12.9716" \
  -F "longitude=77.5946" \
  -F "altitude=100" \
  -F "timestamp=2024-01-15T10:30:00Z" \
  -F "drone_id=DRONE_001" \
  -F "camera_model=DJI_FC7303" \
  -F "image_resolution={\"width\": 4000, \"height\": 3000}"
```

## Response Format

### Successful Analysis Response

```json
{
  "success": true,
  "message": "Drone image analysis completed successfully",
  "data": {
    "analysis_id": "ANALYSIS_20240115_103000",
    "image_filename": "20240115_103000_drone_image.jpg",
    "opencv_analysis": {
      "image_analysis": {
        "image_dimensions": {"width": 1024, "height": 768},
        "average_ndvi": 0.456,
        "visualization_path": "/visualization/analysis_20240115_103000.png"
      },
      "vegetation_analysis": {
        "vegetation_coverage": 0.65,
        "vegetation_density": 0.78,
        "vegetation_pixels": 511488,
        "total_pixels": 786432,
        "num_vegetation_areas": 15
      },
      "co2_estimation": {
        "co2_sequestered_kg": 234.56,
        "co2_sequestered_tons": 0.2346,
        "vegetated_area_sqm": 650.0,
        "effective_area_sqm": 608.4,
        "vegetation_coverage_percent": 65.0,
        "vegetation_density_score": 0.78
      }
    },
    "ai_analysis": {
      "enhanced_ndvi": {
        "average_ndvi": 0.462,
        "ndvi_std": 0.123
      },
      "ai_segmentation": {
        "vegetation_probability": 0.85,
        "vegetation_coverage": 0.67,
        "confidence_threshold": 0.7
      },
      "vegetation_health": {
        "health_score": 0.72,
        "health_category": "Good",
        "confidence_level": "high"
      },
      "biomass_estimation": {
        "biomass_per_sqm_kg": 2.34,
        "total_biomass_tons": 1.42,
        "estimation_confidence": "medium"
      }
    },
    "blockchain_response": {
      "success": true,
      "data": {
        "mrvId": "MRV_20240115_103000",
        "transactionHash": "0x1234..."
      }
    },
    "processing_timestamp": "2024-01-15T10:30:15.123Z"
  }
}
```

## Running the API

### Development Mode
```bash
python app.py
```

### Production Mode
```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### Docker (if available)
```bash
docker build -t drone-analysis-api .
docker run -p 5001:5001 drone-analysis-api
```

## AI Model Training

### Default Model
The API includes a simple CNN model for vegetation detection. For production use:

1. **Collect training data**: Drone images with vegetation annotations
2. **Train custom model**: Use TensorFlow/Keras for model training
3. **Save model**: Save as HDF5 format in `./models/`
4. **Update configuration**: Set `MODEL_PATH` in environment

### Model Architecture
```python
# Simple CNN for vegetation detection
model = Sequential([
    Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
    MaxPooling2D((2, 2)),
    Conv2D(64, (3, 3), activation='relu'),
    MaxPooling2D((2, 2)),
    Conv2D(64, (3, 3), activation='relu'),
    Flatten(),
    Dense(64, activation='relu'),
    Dropout(0.5),
    Dense(1, activation='sigmoid')
])
```

## Monitoring and Logging

### Log Files
- Application logs: `./logs/drone_analysis.log`
- Error tracking and performance monitoring

### Health Monitoring
```bash
curl http://localhost:5001/health
```

### Rate Limiting
- Default: 100 requests per minute
- Analysis endpoints: 10 requests per minute
- Batch processing: 5 requests per minute

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details (in debug mode)"
}
```

### Error Codes
- `400`: Bad Request (missing data, invalid file)
- `413`: File Too Large
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

## Performance Optimization

### Image Processing
- Automatic resizing to 1024x1024
- JPEG compression for storage
- Batch processing for multiple images

### Memory Management
- Streaming file uploads
- Automatic cleanup of temporary files
- Configurable file size limits

### Caching
- Redis-based rate limiting
- Optional result caching
- Model loading optimization

## Security Features

### File Upload Security
- File type validation
- File size limits
- Secure filename handling
- Path traversal prevention

### API Security
- Rate limiting
- CORS configuration
- Input validation
- Error message sanitization

## Integration with Blue Carbon MRV System

This API integrates seamlessly with the Blue Carbon MRV system:

1. **Receives drone images** from field operations
2. **Processes vegetation data** using AI and computer vision
3. **Estimates CO2 sequestration** based on scientific models
4. **Sends data to blockchain** for carbon credit minting
5. **Provides visualization** for monitoring and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: support@bluecarbonmrv.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## Version History

- **v1.0.0**: Initial release with OpenCV and TensorFlow integration
  - Basic vegetation detection
  - CO2 sequestration estimation
  - Blockchain API integration
  - Batch processing support
