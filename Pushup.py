import cv2
import numpy as np
import mediapipe as mp

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils

# Define ideal angles and thresholds
IDEAL_ANGLES = {
    "pushup": {
        "elbow_top": 170,
        "elbow_down": 70,
        "hip_angle": 170,
        "knee_angle": 170
    }
}

THRESHOLD = 20  # Acceptable deviation in degrees

class PushUpExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.9, min_tracking_confidence=0.95, static_image_mode=False)
        self.rep_count = 0
        self.pose_history = []
        self.exercise_type = "pushup"
        self.last_position = None
    
    def reset_state(self):
        """Reset exercise state"""
        self.rep_count = 0
        self.pose_history = []
        self.last_position = None
    
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
        
        if self.exercise_type == "pushup":
            # Extract key landmarks for pushups
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
            ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]

            # Calculate angles
            elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
            hip_angle = self.calculate_angle(shoulder, hip, knee)
            knee_angle = self.calculate_angle(hip, knee, ankle)

            # Get target angle based on position
            if position == "up":
                elbow_target = IDEAL_ANGLES[self.exercise_type]["elbow_top"]
            elif position == "down":
                elbow_target = IDEAL_ANGLES[self.exercise_type]["elbow_down"]
            else:
                elbow_target = 90  # Neutral position if undefined

            # Calculate accuracy for each angle
            elbow_accuracy = self.calculate_angle_accuracy(elbow_angle, elbow_target)
            hip_accuracy = self.calculate_angle_accuracy(hip_angle, IDEAL_ANGLES[self.exercise_type]["hip_angle"])
            knee_accuracy = self.calculate_angle_accuracy(knee_angle, IDEAL_ANGLES[self.exercise_type]["knee_angle"])

            # Weighted average for final accuracy
            overall_accuracy = (0.05 * elbow_accuracy + 0.5 * hip_accuracy + 0.45 * knee_accuracy) / 1.0
            
            return {
                "overall": overall_accuracy,
                "elbow_angle": elbow_angle,
                "hip_angle": hip_angle,
                "knee_angle": knee_angle
            }
        
        return {
            "overall": 0,
            "message": "Unsupported exercise type"
        }
    
    def process_frame(self, img):
        """Process video frame using MediaPipe Pose"""
        print("pushup received frame")
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
        # position = None
        
        # Extract exercise-specific angles for rep counting
        if self.exercise_type == "pushup" and landmarks:
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                       landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
            
            elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
            
            # Push-up counting logic
            if elbow_angle > 160:
                if self.last_position == "down":
                    self.rep_count += 1
                self.last_position = "up"
            elif elbow_angle < 70 and self.last_position == "up":
                self.last_position = "down"
        
        position = self.last_position
        # Update position history
        # self.last_position = position
        
        # Calculate accuracy and form feedback
        # accuracy_data = self.calculate_posture_accuracy(landmarks, position)
        
        # if isinstance(accuracy_data, dict) and "overall" in accuracy_data:
        #     accuracy = accuracy_data["overall"]
        # else:
        #     accuracy = 0
        
        # just for testing 
        accuracy = 93
        
        # Generate form feedback based on accuracy
        if accuracy < 50:
            form_feedback = "Poor form, fix posture"
        elif accuracy < 75:
            form_feedback = "Improve form"
        elif accuracy < 90:
            form_feedback = "Good form"
        else:
            form_feedback = "Excellent form!"
        
        return {
            "form": form_feedback,
            "accuracy": accuracy,
            "position": position,
            "repCount": self.rep_count,
            # "angles": accuracy_data if isinstance(accuracy_data, dict) else {}
        }
        

