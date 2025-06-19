import cv2
import os
import base64
from datetime import datetime
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class ImageProcessor:
    def __init__(self):
        """Initialize image processor"""
        self.save_path = os.getenv('IMAGE_SAVE_PATH', '../uploads/events/')
        self.ensure_directory_exists()
        
    def ensure_directory_exists(self):
        """Create directory structure if it doesn't exist"""
        try:
            os.makedirs(self.save_path, exist_ok=True)
            logger.info(f"📁 Image save directory: {self.save_path}")
        except Exception as e:
            logger.error(f"❌ Error creating directory: {e}")
    
    def save_event_image(self, frame, detections, event):
        """Save image with event information"""
        try:
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            event_type = event['type']
            filename = f"event_{timestamp}_{event_type}.jpg"
            filepath = os.path.join(self.save_path, filename)
            
            # Draw bounding boxes on image
            annotated_frame = self.draw_detections(frame.copy(), detections)
            
            # Save image
            cv2.imwrite(filepath, annotated_frame)
            
            # Compress image if too large
            self.compress_image(filepath)
            
            logger.info(f"💾 Saved event image: {filename}")
            return filepath
            
        except Exception as e:
            logger.error(f"❌ Error saving image: {e}")
            return None
    
    def draw_detections(self, frame, detections):
        """Draw bounding boxes and labels on frame"""
        for detection in detections:
            bbox = detection['bbox']
            class_name = detection['class_name']
            confidence = detection['confidence']
            
            # Extract coordinates
            x1, y1 = int(bbox['x1']), int(bbox['y1'])
            x2, y2 = int(bbox['x2']), int(bbox['y2'])
            
            # Choose color based on class
            color = self.get_class_color(class_name)
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            # Draw label background
            cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), color, -1)
            
            # Draw label text
            cv2.putText(frame, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        # Add timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, timestamp, (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        return frame
    
    def get_class_color(self, class_name):
        """Get color for different object classes"""
        colors = {
            'person': (0, 255, 0),      # Green
            'car': (255, 0, 0),         # Blue
            'truck': (0, 0, 255),       # Red
            'bicycle': (255, 255, 0),   # Cyan
            'motorcycle': (255, 0, 255), # Magenta
            'bus': (0, 255, 255),       # Yellow
        }
        return colors.get(class_name, (128, 128, 128))  # Gray for unknown
    
    def compress_image(self, filepath, max_size_kb=200):
        """Compress image to reduce file size"""
        try:
            # Check current file size
            current_size = os.path.getsize(filepath) / 1024  # KB
            
            if current_size > max_size_kb:
                # Open and compress image
                img = Image.open(filepath)
                
                # Calculate compression quality
                quality = int(85 * (max_size_kb / current_size))
                quality = max(20, min(95, quality))  # Ensure quality is between 20-95
                
                # Save compressed image
                img.save(filepath, 'JPEG', quality=quality, optimize=True)
                
                new_size = os.path.getsize(filepath) / 1024
                logger.info(f"🗜️ Compressed image: {current_size:.1f}KB → {new_size:.1f}KB")
                
        except Exception as e:
            logger.error(f"❌ Error compressing image: {e}")
    
    def image_to_base64(self, filepath):
        """Convert image to base64 string"""
        try:
            with open(filepath, "rb") as img_file:
                return base64.b64encode(img_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Error converting image to base64: {e}")
            return None
