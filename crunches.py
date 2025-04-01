import cv2
import numpy as np
import mediapipe as mp


# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils

# Define ideal angles and thresholds for exercises
IDEAL_ANGLES = {
    "crunch": {
        "back_angle_down": 100, # Down position (lying flat)
        "back_angle_up": 40,    # Up position (crunched)
        "knee_angle": 30,       # Ideal knee bend
        "hand_distance": 0.1    # Ideal normalized hand-to-head distance
    }
}

# Acceptable deviation thresholds
THRESHOLD = 20
FRAME_HOLD_THRESHOLD = 3

class CrunchExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.8, min_tracking_confidence=0.8, static_image_mode=False)
        self.rep_count = 0
        self.pose_history = []
        self.exercise_type = "crunch"
        self.last_position = None
        
        # Specific for crunch tracking
        self.crunch_up = False
        self.hold_frames = 0
        self.knee_angle_up = 0
        self.knee_angle_down = 0
        self.hand_distance_up = 0
        self.hand_distance_down = 0
        self.back_dist_up = 0
        self.back_dist_down = 0
        self.accuracy_per_crunch = 0
    
    def reset_state(self):
        """Reset exercise state"""
        self.rep_count = 0
        self.pose_history = []
        self.last_position = None
        self.crunch_up = False
        self.hold_frames = 0
        self.knee_angle_up = 0
        self.knee_angle_down = 0
        self.hand_distance_up = 0
        self.hand_distance_down = 0
        self.back_dist_up = 0
        self.back_dist_down = 0
        self.accuracy_per_crunch = 0
    
    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array(a)  # Point A
        b = np.array(b)  # Point B
        c = np.array(c)  # Point C

        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)

        if angle > 180.0:
            angle = 360 - angle

        return angle
    
    def process_frame(self, img):
        """Process video frame using MediaPipe Pose"""
        # Convert to RGB for MediaPipe
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Process the image
        results = self.pose.process(img_rgb)
        
        # Convert back to BGR
        processed_img = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        
        landmarks = None
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            mp_draw.draw_landmarks(processed_img, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
        
        return processed_img, landmarks
    
    def posture_accuracy(self):
        """Calculate posture accuracy based on collected metrics"""
        # Extract ideal values for crunch
        ideal_knee_angle = IDEAL_ANGLES[self.exercise_type]["knee_angle"]
        ideal_hand_distance = IDEAL_ANGLES[self.exercise_type]["hand_distance"]
        
        # Calculate average knee angle
        avg_knee_angle = (self.knee_angle_up + self.knee_angle_down) / 2
        
        # Calculate knee accuracy
        knee_deviation = abs(avg_knee_angle - ideal_knee_angle)
        if knee_deviation <= THRESHOLD:
            knee_accuracy = max(0, 100 - knee_deviation)
        else:
            knee_accuracy = max(0, 100 - abs(ideal_knee_angle - max(self.knee_angle_up, self.knee_angle_down)))
        
        # Calculate hand distance accuracy
        avg_hand_distance = (self.hand_distance_up + self.hand_distance_down) / 2
        hand_deviation = abs(avg_hand_distance - ideal_hand_distance)
        if hand_deviation <= 0.05:  # Hand threshold
            hand_accuracy = max(0, 100 - hand_deviation * 100)
        else:
            hand_accuracy = max(0, 100 - abs(ideal_hand_distance - max(self.hand_distance_up, self.hand_distance_down)) * 200)
        
        # Calculate back position accuracy
        back_deviation = abs(self.back_dist_down - self.back_dist_up)
        back_accuracy = max(0, 100 - ((back_deviation / max(self.back_dist_down, self.back_dist_up))/3) * 100)
        
        # Calculate weighted average for overall accuracy
        overall_accuracy = (knee_accuracy * 0.4) + (hand_accuracy * 0.3) + (back_accuracy * 0.3)
        
        return {
            "overall": overall_accuracy,
            "knee_accuracy": knee_accuracy,
            "hand_accuracy": hand_accuracy,
            "back_accuracy": back_accuracy,
            "knee_angle_up": self.knee_angle_up,
            "knee_angle_down": self.knee_angle_down,
            "back_dist_up": self.back_dist_up,
            "back_dist_down": self.back_dist_down
        }
    
    def calculate_form_feedback(self, accuracy):
        """Generate form feedback based on accuracy score"""
        if accuracy < 50:
            return "Poor form, fix posture"
        elif accuracy < 75:
            return "Improve form"
        elif accuracy < 90:
            return "Good form"
        else:
            return "Excellent form!"
    
    def analyze_exercise(self, landmarks):
        """Analyze exercise form and count reps for crunches"""
        if not landmarks:
            return {
                "form": "No pose detected",
                "accuracy": 0,
                "position": None,
                "repCount": self.rep_count
            }
        
        # Extract key points for crunch analysis
        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                   landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
               landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        head = [landmarks[mp_pose.PoseLandmark.NOSE.value].x,
                landmarks[mp_pose.PoseLandmark.NOSE.value].y]
        
        # Calculate key metrics
        knee_angle = self.calculate_angle(ankle, knee, hip)
        back_angle = self.calculate_angle(shoulder, hip, knee)
        
        # Calculate hand distance (normalized)
        hand_distance = np.linalg.norm(np.array(wrist) - np.array(head))
        
        # Calculate vertical distance between shoulder and hip
        back_dist = np.linalg.norm(np.array(shoulder) - np.array(hip))
        
        position = None
        
        # Check if crunch is at down position (lying flat)
        if back_angle >= IDEAL_ANGLES[self.exercise_type]["back_angle_down"] and not self.crunch_up:
            self.hold_frames += 1
            position = "down"
            
            if self.hold_frames >= FRAME_HOLD_THRESHOLD:
                self.knee_angle_down = knee_angle
                self.hand_distance_down = hand_distance
                self.back_dist_down = back_dist
                self.crunch_up = True
                self.hold_frames = 0
        
        # Check if crunch is at up position (crunched)
        elif back_angle <= IDEAL_ANGLES[self.exercise_type]["back_angle_up"] and self.crunch_up:
            position = "up"
            self.knee_angle_up = knee_angle
            self.hand_distance_up = hand_distance
            self.back_dist_up = back_dist
            
            # Calculate accuracy and increment rep counter
            accuracy_data = self.posture_accuracy()
            self.accuracy_per_crunch = accuracy_data["overall"]
            self.rep_count += 1
            self.crunch_up = False
        
        # Update last position
        self.last_position = position
        
        # Generate form feedback
        form_feedback = self.calculate_form_feedback(self.accuracy_per_crunch)
        
        return {
            "form": form_feedback,
            "accuracy": self.accuracy_per_crunch,
            "position": position,
            "repCount": self.rep_count,
            "angles": {
                "knee_angle": knee_angle,
                "back_angle": back_angle,
                "hand_distance": hand_distance,
                "back_dist": back_dist
            }
        }