import requests
import json
import base64
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class APIClient:
    def __init__(self, base_url):
        """Initialize API client"""
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SurveillanceSystem/1.0'
        })
        
    def send_event(self, event_data, image_path=None):
        """Send event data to Node.js backend"""
        try:
            # Add image data if provided
            if image_path:
                event_data['imageBase64'] = self._image_to_base64(image_path)
                event_data['imagePath'] = image_path
            
            # Send POST request
            url = f"{self.base_url}/api/events/from-python"
            response = self.session.post(url, json=event_data, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"✅ Event sent successfully: {event_data['eventType']}")
                return True
            else:
                logger.error(f"❌ Failed to send event. Status: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network error sending event: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Error sending event: {e}")
            return False
    
    def test_connection(self):
        """Test connection to Node.js backend"""
        try:
            url = f"{self.base_url}/"
            response = self.session.get(url, timeout=5)
            
            if response.status_code == 200:
                logger.info("✅ Successfully connected to backend")
                return True
            else:
                logger.error(f"❌ Backend returned status: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Cannot connect to backend: {e}")
            return False
    
    def _image_to_base64(self, image_path):
        """Convert image file to base64 string"""
        try:
            with open(image_path, "rb") as img_file:
                return base64.b64encode(img_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Error converting image to base64: {e}")
            return None