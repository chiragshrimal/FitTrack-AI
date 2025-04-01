import cv2
import numpy as np
import mediapipe as mp

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils

# Define ideal angles and thresholds
IDEAL_ANGLES = {
    "pullup": {
        "elbow_top": 50,  # Ideal flexion at the top
        "elbow_down": 180,  # Ideal extension at the bottom
        "hip_angle": 180  # Ideal straight position
    }
}

THRESHOLD = 20  # Acceptable deviation in degrees

class PullUpExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.9, min_tracking_confidence=0.90, static_image_mode=False)
        self.rep_count = 0
        self.pose_history = []
        self.last_position = None
        
        # Pull-up specific variables
        self.hold_frames = 0
        self.frame_hold_threshold = 5
        self.cumulative_accuracy = 0
        self.accuracy_frames = 0
        self.accuracy_per_rep = 0
    
    def reset_state(self):
        """Reset exercise state"""
        self.rep_count = 0
        self.pose_history = []
        self.last_position = None
        self.hold_frames = 0
        self.cumulative_accuracy = 0
        self.accuracy_frames = 0
        self.accuracy_per_rep = 0
    
    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array(a)  # Point A
        b = np.array(b)  # Point B
        c = np.array(c)  # Point C

        ba = a - b
        bc = c - b

        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))

        return np.degrees(angle)
    
    def calculate_angle_accuracy(self, actual_angle, target_angle, threshold=THRESHOLD):
        """Calculate accuracy based on angle deviation"""
        deviation = abs(actual_angle - target_angle)
        
        if deviation <= threshold:
            accuracy = 100 - ((deviation / threshold)/5) * 100
        else:
            accuracy = max(0, 100 - (deviation - threshold)*3)  # Penalize large deviations

        return accuracy
    
    def calculate_posture_accuracy(self, landmarks, position):
        """Calculate posture accuracy based on exercise type"""
        if not landmarks:
            return 0
        
        # Extract key landmarks
        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
        wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
               landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]

        # Calculate angles
        elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
        hip_angle = self.calculate_angle(shoulder, hip, knee)

        # Get target angle based on position
        if position == "up":
            elbow_target = IDEAL_ANGLES["pullup"]["elbow_top"]
        elif position == "down":
            elbow_target = IDEAL_ANGLES["pullup"]["elbow_down"]
        else:
            elbow_target = 90  # Neutral position if undefined

        # Calculate accuracy for each angle
        elbow_accuracy = self.calculate_angle_accuracy(elbow_angle, elbow_target)
        hip_accuracy = self.calculate_angle_accuracy(hip_angle, IDEAL_ANGLES["pullup"]["hip_angle"])

        # Weighted average for pullups (focus on elbow and hip)
        overall_accuracy = (0.5 * elbow_accuracy + 0.5 * hip_accuracy)
        
        return {
            "overall": overall_accuracy,
            "elbow_angle": elbow_angle,
            "hip_angle": hip_angle
        }
    
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
    
    def analyze_exercise(self, landmarks):
        """Analyze exercise form and count reps"""
        position = None
        
        if not landmarks:
            return {
                "form": "No pose detected",
                "accuracy": 0,
                "position": None,
                "repCount": self.rep_count,
                "angles": {}
            }
        
        # Extract exercise-specific angles for rep counting
        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                   landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
        wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        
        elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
        
        # Pull-up thresholds
        UP_THRESHOLD = 50    # Elbow flexion for the up position
        DOWN_THRESHOLD = 160  # Elbow extension for the down position
        
        # Calculate accuracy
        accuracy_data = self.calculate_posture_accuracy(landmarks, self.last_position)
        accuracy = accuracy_data["overall"] if isinstance(accuracy_data, dict) and "overall" in accuracy_data else 0
        
        # Pull-up counting logic
        if elbow_angle > DOWN_THRESHOLD and self.last_position != "down":
            self.last_position = "down"
            self.hold_frames = 0
            position = "down"

        if self.last_position == "down" and elbow_angle > DOWN_THRESHOLD:
            self.hold_frames += 1
            self.cumulative_accuracy += accuracy
            self.accuracy_frames += 1
            position = "down"

        if self.last_position == "down" and elbow_angle <= UP_THRESHOLD and self.hold_frames >= self.frame_hold_threshold:
            accuracy_up = accuracy
            if self.accuracy_frames > 0:
                accuracy_down = self.cumulative_accuracy / self.accuracy_frames
                self.accuracy_per_rep = (accuracy_up + accuracy_down) / 2
            else:
                self.accuracy_per_rep = accuracy_up
                
            self.rep_count += 1
            self.last_position = "up"
            position = "up"
            self.cumulative_accuracy = 0
            self.accuracy_frames = 0
            
        # If we're in the up position but not yet counted as a new rep
        if self.last_position == "up" and elbow_angle <= UP_THRESHOLD:
            position = "up"
        
        # Generate form feedback based on accuracy
        if self.accuracy_per_rep < 50:
            form_feedback = "Poor form, fix posture"
        elif self.accuracy_per_rep < 75:
            form_feedback = "Improve form"
        elif self.accuracy_per_rep < 90:
            form_feedback = "Good form"
        else:
            form_feedback = "Excellent form!"
            
        
        return {
            "form": form_feedback,
            "accuracy": self.accuracy_per_rep,
            "position": position,
            "repCount": self.rep_count,
            "angles": accuracy_data if isinstance(accuracy_data, dict) else {}
        }