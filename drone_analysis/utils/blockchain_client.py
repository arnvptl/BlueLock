import requests
import json
import logging
from typing import Dict, Optional, List
from datetime import datetime
import time
from config import Config

logger = logging.getLogger(__name__)

class BlockchainClient:
    """Client for sending processed drone data to blockchain API"""
    
    def __init__(self):
        self.config = Config()
        self.base_url = self.config.BLOCKCHAIN_API_URL
        self.api_key = self.config.BLOCKCHAIN_API_KEY
        self.timeout = self.config.BLOCKCHAIN_TIMEOUT
        self.max_retries = self.config.MAX_RETRIES
        self.retry_delay = self.config.RETRY_DELAY
        
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'DroneAnalysisAPI/1.0'
        }
        
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
            
        return headers
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None, 
                     retry_count: int = 0) -> Dict:
        """Make HTTP request with retry logic"""
        try:
            url = f"{self.base_url}{endpoint}"
            headers = self._get_headers()
            
            logger.info(f"Making {method} request to {url}")
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=self.timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=self.timeout)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {str(e)}")
            
            if retry_count < self.max_retries:
                logger.info(f"Retrying request (attempt {retry_count + 1}/{self.max_retries})")
                time.sleep(self.retry_delay * (retry_count + 1))
                return self._make_request(method, endpoint, data, retry_count + 1)
            else:
                raise Exception(f"Max retries exceeded for {method} {endpoint}")
                
        except Exception as e:
            logger.error(f"Unexpected error in request: {str(e)}")
            raise
    
    def send_mrv_data(self, analysis_results: Dict, metadata: Dict) -> Dict:
        """Send MRV data to blockchain API"""
        try:
            # Prepare MRV data payload
            mrv_payload = {
                'projectId': metadata.get('project_id', 'DRONE_ANALYSIS'),
                'measurementData': {
                    'co2Sequestered': analysis_results['co2_estimation']['co2_sequestered_tons'],
                    'unit': 'tons',
                    'measurementDate': metadata.get('timestamp', datetime.now().isoformat()),
                    'measurementMethod': 'drone_analysis',
                    'measurementLocation': f"{metadata.get('latitude', 0)}, {metadata.get('longitude', 0)}",
                    'coordinates': {
                        'latitude': metadata.get('latitude', 0),
                        'longitude': metadata.get('longitude', 0),
                        'altitude': metadata.get('altitude', 0)
                    }
                },
                'environmentalData': {
                    'vegetation_coverage': analysis_results['vegetation_analysis']['vegetation_coverage'],
                    'vegetation_density': analysis_results['vegetation_analysis']['vegetation_density'],
                    'average_ndvi': analysis_results['image_analysis']['average_ndvi'],
                    'drone_altitude': metadata.get('altitude', 0),
                    'weather_conditions': metadata.get('weather_conditions', 'unknown')
                },
                'reporter': {
                    'address': metadata.get('drone_id', 'DRONE_SYSTEM'),
                    'name': 'Drone Analysis System',
                    'email': 'drone@bluecarbonmrv.com',
                    'organization': 'Blue Carbon MRV'
                },
                'qualityControl': {
                    'qualityScore': self._calculate_quality_score(analysis_results),
                    'qualityNotes': 'AI-enhanced drone analysis with OpenCV and TensorFlow',
                    'processingMethod': 'drone_ai_analysis',
                    'confidenceLevel': 'high'
                },
                'attachments': [
                    {
                        'filename': 'drone_analysis_report.json',
                        'type': 'application/json',
                        'size': len(json.dumps(analysis_results)),
                        'url': metadata.get('analysis_report_url', '')
                    }
                ],
                'metadata': {
                    'drone_id': metadata.get('drone_id', 'unknown'),
                    'camera_model': metadata.get('camera_model', 'unknown'),
                    'image_resolution': metadata.get('image_resolution', {}),
                    'processing_timestamp': analysis_results['processing_timestamp'],
                    'analysis_version': '1.0',
                    'ai_model_used': 'tensorflow_opencv'
                }
            }
            
            # Send to blockchain API
            response = self._make_request('POST', '/mrv/upload', mrv_payload)
            
            logger.info(f"MRV data sent successfully: {response.get('data', {}).get('mrvId', 'unknown')}")
            return response
            
        except Exception as e:
            logger.error(f"Error sending MRV data: {str(e)}")
            raise
    
    def mint_carbon_credits(self, analysis_results: Dict, metadata: Dict) -> Dict:
        """Mint carbon credits based on analysis results"""
        try:
            # Prepare credit minting payload
            credit_payload = {
                'projectId': metadata.get('project_id', 'DRONE_ANALYSIS'),
                'recipientAddress': metadata.get('recipient_address', metadata.get('drone_id', 'DRONE_SYSTEM')),
                'amount': analysis_results['co2_estimation']['co2_sequestered_tons'],
                'mintReason': 'Drone-based vegetation analysis and CO2 sequestration estimation',
                'mrvDataIds': [metadata.get('mrv_id', 'DRONE_MRV')],
                'metadata': {
                    'drone_analysis_id': metadata.get('analysis_id', 'unknown'),
                    'vegetation_coverage': analysis_results['vegetation_analysis']['vegetation_coverage'],
                    'processing_method': 'ai_enhanced',
                    'confidence_level': 'high'
                }
            }
            
            # Send to blockchain API
            response = self._make_request('POST', '/credits/mint', credit_payload)
            
            logger.info(f"Carbon credits minted successfully: {response.get('data', {}).get('transactionHash', 'unknown')}")
            return response
            
        except Exception as e:
            logger.error(f"Error minting carbon credits: {str(e)}")
            raise
    
    def register_project(self, metadata: Dict, analysis_results: Dict) -> Dict:
        """Register a new project based on drone analysis"""
        try:
            # Prepare project registration payload
            project_payload = {
                'name': f"Drone Analysis Project - {metadata.get('drone_id', 'UNKNOWN')}",
                'description': f"Automated drone analysis project for vegetation monitoring and CO2 sequestration estimation",
                'location': f"{metadata.get('latitude', 0)}, {metadata.get('longitude', 0)}",
                'area': analysis_results['co2_estimation']['effective_area_sqm'],
                'areaUnit': 'sqm',
                'projectType': 'mangrove',  # Default type
                'owner': {
                    'address': metadata.get('drone_id', 'DRONE_SYSTEM'),
                    'name': 'Drone Analysis System',
                    'email': 'drone@bluecarbonmrv.com',
                    'organization': 'Blue Carbon MRV'
                },
                'coordinates': {
                    'latitude': metadata.get('latitude', 0),
                    'longitude': metadata.get('longitude', 0),
                    'altitude': metadata.get('altitude', 0)
                },
                'metadata': {
                    'drone_id': metadata.get('drone_id', 'unknown'),
                    'analysis_method': 'ai_enhanced',
                    'vegetation_coverage': analysis_results['vegetation_analysis']['vegetation_coverage'],
                    'initial_analysis_timestamp': analysis_results['processing_timestamp']
                }
            }
            
            # Send to blockchain API
            response = self._make_request('POST', '/projects/register', project_payload)
            
            logger.info(f"Project registered successfully: {response.get('data', {}).get('projectId', 'unknown')}")
            return response
            
        except Exception as e:
            logger.error(f"Error registering project: {str(e)}")
            raise
    
    def get_project_credits(self, project_id: str) -> Dict:
        """Get carbon credits for a specific project"""
        try:
            response = self._make_request('GET', f'/credits/project/{project_id}')
            return response
            
        except Exception as e:
            logger.error(f"Error getting project credits: {str(e)}")
            raise
    
    def get_total_supply(self) -> Dict:
        """Get total carbon credit supply"""
        try:
            response = self._make_request('GET', '/credits/supply')
            return response
            
        except Exception as e:
            logger.error(f"Error getting total supply: {str(e)}")
            raise
    
    def _calculate_quality_score(self, analysis_results: Dict) -> float:
        """Calculate quality score for the analysis"""
        try:
            # Base score
            score = 0.8
            
            # Add points for good vegetation coverage
            vegetation_coverage = analysis_results['vegetation_analysis']['vegetation_coverage']
            if vegetation_coverage > 0.5:
                score += 0.1
            elif vegetation_coverage > 0.2:
                score += 0.05
            
            # Add points for good NDVI
            avg_ndvi = analysis_results['image_analysis']['average_ndvi']
            if avg_ndvi > 0.6:
                score += 0.1
            elif avg_ndvi > 0.4:
                score += 0.05
            
            # Add points for AI processing
            if 'ai_enhanced' in str(analysis_results):
                score += 0.1
            
            # Cap at 1.0
            return min(score, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating quality score: {str(e)}")
            return 0.8  # Default score
    
    def send_batch_data(self, batch_results: List[Dict]) -> Dict:
        """Send batch of analysis results to blockchain"""
        try:
            batch_payload = {
                'batch_id': f"BATCH_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'total_analyses': len(batch_results),
                'total_co2_sequestered': sum(r['co2_estimation']['co2_sequestered_tons'] for r in batch_results),
                'analyses': batch_results,
                'metadata': {
                    'batch_processing_timestamp': datetime.now().isoformat(),
                    'processing_method': 'batch_drone_analysis'
                }
            }
            
            # Send to blockchain API
            response = self._make_request('POST', '/mrv/batch-upload', batch_payload)
            
            logger.info(f"Batch data sent successfully: {len(batch_results)} analyses")
            return response
            
        except Exception as e:
            logger.error(f"Error sending batch data: {str(e)}")
            raise
    
    def health_check(self) -> Dict:
        """Check blockchain API health"""
        try:
            response = self._make_request('GET', '/health')
            return response
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def validate_metadata(self, metadata: Dict) -> bool:
        """Validate required metadata fields"""
        try:
            required_fields = self.config.REQUIRED_METADATA
            
            for field in required_fields:
                if field not in metadata or metadata[field] is None:
                    logger.warning(f"Missing required metadata field: {field}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating metadata: {str(e)}")
            return False
