import cv2
import time
import json
import os
from datetime import datetime
from ultralytics import YOLO
from dotenv import load_dotenv
from image_processor import ImageProcessor
from api_client import APIClient
from event_detector import EventDetector
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SurveillanceSystem:
    def __init__(self):
        """Initialize the surveillance system"""
        logger.info("🤖 Initializing Surveillance System...")
        
        # Load configuration
        self.camera_index = int(os.getenv('CAMERA_INDEX', 0))
        self.confidence_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', 0.5))
        self.nodejs_api_url = os.getenv('NODEJS_API_URL', 'http://localhost:5000')
        
        # Initialize components
        self.model = YOLO('yolov8n.pt')  # Will download automatically first time
        self.image_processor = ImageProcessor()
        self.api_client = APIClient(self.nodejs_api_url)
        self.event_detector = EventDetector()
        
        # Initialize camera
        self.cap = cv2.VideoCapture(self.camera_index)
        if not self.cap.isOpened():
            logger.error(f"❌ Cannot open camera {self.camera_index}")
            raise Exception(f"Camera {self.camera_index} not available")
        
        # Set camera properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        logger.info("✅ Surveillance System initialized successfully")
    
    def start_monitoring(self):
        """Start the main monitoring loop"""
        logger.info("🎥 Starting surveillance monitoring...")
        
        frame_count = 0
        process_every_n_frames = 5  # Process every 5th frame for performance
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    logger.error("❌ Failed to read frame from camera")
                    break
                
                frame_count += 1
                
                # Process every nth frame to improve performance
                if frame_count % process_every_n_frames == 0:
                    self.process_frame(frame)
                
                # Display frame (optional - remove in production)
                self.display_frame(frame)
                
                # Check for exit
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    logger.info("🛑 Stopping surveillance (user requested)")
                    break
                    
        except KeyboardInterrupt:
            logger.info("🛑 Stopping surveillance (Ctrl+C)")
        except Exception as e:
            logger.error(f"❌ Error in monitoring loop: {e}")
        finally:
            self.cleanup()
    
    def process_frame(self, frame):
        """Process a single frame for object detection and events"""
        try:
            # Run YOLO detection
            results = self.model(frame, conf=self.confidence_threshold)
            
            # Extract detection data
            detections = self.extract_detections(results)
            
            # Detect events based on current detections
            events = self.event_detector.detect_events(detections, frame.shape)
            
            # Process each detected event
            for event in events:
                self.handle_event(event, frame, detections)
                
        except Exception as e:
            logger.error(f"❌ Error processing frame: {e}")
    
    def extract_detections(self, results):
        """Extract detection data from YOLO results"""
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    
                    # Get confidence and class
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = self.model.names[class_id]
                    
                    detection = {
                        'class_name': class_name,
                        'confidence': confidence,
                        'bbox': {
                            'x1': float(x1), 'y1': float(y1),
                            'x2': float(x2), 'y2': float(y2),
                            'width': float(x2 - x1),
                            'height': float(y2 - y1)
                        }
                    }
                    detections.append(detection)
        
        return detections
    
    def handle_event(self, event, frame, detections):
        """Handle a detected event"""
        try:
            logger.info(f"🚨 Event detected: {event['type']}")
            
            # Process and save image
            image_path = self.image_processor.save_event_image(
                frame, detections, event
            )
            
            # Prepare event data for API
            event_data = {
                'timestamp': datetime.now().isoformat(),
                'location': f"Camera-{self.camera_index}",
                'eventType': event['type'],
                'description': event['description'],
                'confidence': event['confidence'],
                'boundingBoxes': self.format_bounding_boxes(detections),
                'metadata': {
                    'objectsDetected': [d['class_name'] for d in detections],
                    'personCount': len([d for d in detections if d['class_name'] == 'person']),
                    'activityDuration': event.get('duration', 0),
                    'cameraId': f'cam-{self.camera_index:03d}'
                }
            }
            
            # Send to Node.js API
            success = self.api_client.send_event(event_data, image_path)
            
            if success:
                logger.info("✅ Event sent to backend successfully")
            else:
                logger.error("❌ Failed to send event to backend")
                
        except Exception as e:
            logger.error(f"❌ Error handling event: {e}")
    
    def format_bounding_boxes(self, detections):
        """Format bounding boxes for API"""
        bounding_boxes = []
        
        for detection in detections:
            bbox = {
                'object': detection['class_name'],
                'confidence': detection['confidence'],
                'coordinates': {
                    'x': detection['bbox']['x1'],
                    'y': detection['bbox']['y1'],
                    'width': detection['bbox']['width'],
                    'height': detection['bbox']['height']
                }
            }
            bounding_boxes.append(bbox)
        
        return bounding_boxes
    
    def display_frame(self, frame):
        """Display frame with annotations (optional)"""
        cv2.imshow('Surveillance Feed', frame)
    
    def cleanup(self):
        """Clean up resources"""
        logger.info("🧹 Cleaning up resources...")
        self.cap.release()
        cv2.destroyAllWindows()
        logger.info("✅ Cleanup completed")

if __name__ == "__main__":
    try:
        system = SurveillanceSystem()
        system.start_monitoring()
    except Exception as e:
        logger.error(f"❌ Failed to start surveillance system: {e}")
