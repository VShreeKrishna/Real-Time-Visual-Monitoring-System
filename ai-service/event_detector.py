import time
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class EventDetector:
    def __init__(self):
        """Initialize event detection logic"""
        self.previous_detections = []
        self.person_tracking = {}
        self.last_event_time = {}
        self.event_cooldown = 5  # seconds between similar events
        
    def detect_events(self, current_detections, frame_shape):
        """Detect events based on current and previous detections"""
        events = []
        current_time = time.time()
        
        # Count current objects
        current_people = [d for d in current_detections if d['class_name'] == 'person']
        current_objects = [d for d in current_detections if d['class_name'] != 'person']
        
        # Count previous objects
        prev_people = [d for d in self.previous_detections if d['class_name'] == 'person']
        prev_objects = [d for d in self.previous_detections if d['class_name'] != 'person']
        
        # Detect person entry/exit
        person_events = self._detect_person_events(current_people, prev_people, current_time)
        events.extend(person_events)
        
        # Detect object changes
        object_events = self._detect_object_events(current_objects, prev_objects, current_time)
        events.extend(object_events)
        
        # Detect multiple people
        multiple_people_event = self._detect_multiple_people(current_people, current_time)
        if multiple_people_event:
            events.append(multiple_people_event)
        
        # Update previous detections
        self.previous_detections = current_detections.copy()
        
        return events
    
    def _detect_person_events(self, current_people, prev_people, current_time):
        """Detect person entry and exit events"""
        events = []
        
        # Person entered
        if len(current_people) > len(prev_people):
            if self._can_trigger_event('person_entered', current_time):
                event = {
                    'type': 'person_entered',
                    'description': f"A person entered the monitored area. Total people: {len(current_people)}",
                    'confidence': 0.8,
                    'timestamp': current_time
                }
                events.append(event)
                self.last_event_time['person_entered'] = current_time
        
        # Person exited
        elif len(current_people) < len(prev_people):
            if self._can_trigger_event('person_exited', current_time):
                event = {
                    'type': 'person_exited',
                    'description': f"A person left the monitored area. Total people: {len(current_people)}",
                    'confidence': 0.8,
                    'timestamp': current_time
                }
                events.append(event)
                self.last_event_time['person_exited'] = current_time
        
        return events
    
    def _detect_object_events(self, current_objects, prev_objects, current_time):
        """Detect object-related events"""
        events = []
        
        # New objects detected
        current_classes = set([obj['class_name'] for obj in current_objects])
        prev_classes = set([obj['class_name'] for obj in prev_objects])
        
        new_objects = current_classes - prev_classes
        removed_objects = prev_classes - current_classes
        
        # Object picked up / removed
        if removed_objects and self._can_trigger_event('object_picked', current_time):
            event = {
                'type': 'object_picked',
                'description': f"Objects were removed: {', '.join(removed_objects)}",
                'confidence': 0.7,
                'timestamp': current_time
            }
            events.append(event)
            self.last_event_time['object_picked'] = current_time
        
        # Object placed / added
        if new_objects and self._can_trigger_event('object_placed', current_time):
            event = {
                'type': 'object_placed',
                'description': f"New objects detected: {', '.join(new_objects)}",
                'confidence': 0.7,
                'timestamp': current_time
            }
            events.append(event)
            self.last_event_time['object_placed'] = current_time
        
        return events
    
    def _detect_multiple_people(self, current_people, current_time):
        """Detect when multiple people are present"""
        if len(current_people) >= 3:
            if self._can_trigger_event('multiple_people', current_time):
                return {
                    'type': 'multiple_people',
                    'description': f"Multiple people detected in the area ({len(current_people)} people)",
                    'confidence': 0.9,
                    'timestamp': current_time
                }
        return None
    
    def _can_trigger_event(self, event_type, current_time):
        """Check if enough time has passed to trigger the same event type"""
        last_time = self.last_event_time.get(event_type, 0)
        return (current_time - last_time) > self.event_cooldown
