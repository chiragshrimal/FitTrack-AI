import cv2
import mediapipe as mp
import numpy as np

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Define ideal angles and thresholds
IDEAL_ANGLES = {
    "bicepcurl": {
        "elbow_up": 70,
        "elbow_down": 160,
        "shoulder_angle": 0,
        "back_angle": 180
    }
}

class BicepCurlExerciseProcessor:
    def __init__(self):
        self.pose = mp_pose.Pose(min_detection_confidence=0.9, min_tracking_confidence=0.9, static_image_mode=False)
        self.rep_count = 0
        self.curl_down = False
        self.hold_frames = 0
        self.frame_hold_threshold = 0
        self.accuracy_per_curl = 0
        self.accuracy_up = 0
        self.accuracy_down = 0
        self.exercise_type = "bicepcurl"
        self.last_position = None
        
        # Constants for curl detection
        self.UP_THRESHOLD = 80
        self.DOWN_THRESHOLD = 140
    
    def reset_state(self):
        """Reset exercise state"""
        self.rep_count = 0
        self.curl_down = False
        self.hold_frames = 0
        self.accuracy_per_curl = 0
        self.last_position = None
    
    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)

        ba = a - b
        bc = c - b

        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))

        return np.degrees(angle)
    
    def posture_accuracy(self, elbow_angle, shoulder_angle, back_angle):
        """Calculate posture accuracy based on ideal angles"""
        ideal_elbow_up = IDEAL_ANGLES[self.exercise_type]["elbow_up"]
        ideal_elbow_down = IDEAL_ANGLES[self.exercise_type]["elbow_down"]
        ideal_shoulder_angle = IDEAL_ANGLES[self.exercise_type]["shoulder_angle"]
        ideal_back_angle = IDEAL_ANGLES[self.exercise_type]["back_angle"]

        elbow_deviation_up = abs(elbow_angle - ideal_elbow_up)
        elbow_deviation_down = abs(elbow_angle - ideal_elbow_down)
        shoulder_deviation = abs(shoulder_angle - ideal_shoulder_angle)

        if shoulder_deviation < 30:
            shoulder_deviation = shoulder_deviation / 10
        else:
            shoulder_deviation = shoulder_deviation * 3  # Penalize more for larger deviations
        back_deviation = abs(back_angle - ideal_back_angle)

        # Calculate accuracy
        elbow_accuracy = max(0, 100 - ((elbow_deviation_up / ideal_elbow_up)/5) * 100)
        
        # Normalize shoulder deviation with a constant to avoid division by zero
        shoulder_accuracy = max(0, 100 - (shoulder_deviation / 1))
        
        back_accuracy = max(0, 100 - ((back_deviation / ideal_back_angle)/5) * 100)

        # Weighted average for overall accuracy
        overall_accuracy = (elbow_accuracy * 0.2) + (shoulder_accuracy * 0.4) + (back_accuracy * 0.4)
        return overall_accuracy
    
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
            mp_drawing.draw_landmarks(processed_img, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
        
        return processed_img, landmarks
    
    def analyze_exercise(self, landmarks):
        """Analyze exercise form and count reps"""
        if not landmarks:
            return {
                "form": "No pose detected",
                "accuracy": 0,
                "position": None,
                "repCount": self.rep_count,
                "angles": {}
            }
        
        # Extract key landmarks for bicep curls
        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
        wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]

        # Calculate angles
        elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
        shoulder_angle = self.calculate_angle(hip, shoulder, elbow)
        # Create a vertical reference slightly above the shoulder to calculate back angle
        back_angle = self.calculate_angle(hip, shoulder, [shoulder[0], shoulder[1] - 0.1])
        
        # Curl logic
        if elbow_angle > self.DOWN_THRESHOLD and not self.curl_down:
            self.curl_down = True
            self.hold_frames = 0
            
            # TODO inspect later
            self.last_position = "down"
            self.accuracy_down = self.posture_accuracy(elbow_angle, shoulder_angle, back_angle)

        if not self.curl_down and elbow_angle <= self.UP_THRESHOLD:
            self.hold_frames += 1
            
            self.last_position = "up"

        if self.curl_down and elbow_angle > self.DOWN_THRESHOLD and self.hold_frames >= self.frame_hold_threshold:
            self.accuracy_down = self.posture_accuracy(elbow_angle, shoulder_angle, back_angle)
            self.curl_down = False

        if not self.curl_down and elbow_angle <= self.UP_THRESHOLD and self.hold_frames >= self.frame_hold_threshold:
            self.accuracy_up = self.posture_accuracy(elbow_angle, shoulder_angle, back_angle)
            self.accuracy_per_curl = (self.accuracy_up + self.accuracy_down) / 2 
            self.rep_count += 1
            self.hold_frames = 0
            self.curl_down = True
            
        # Generate form feedback based on accuracy
        if self.accuracy_per_curl < 50:
            form_feedback = "Poor form, fix posture"
        elif self.accuracy_per_curl < 75:
            form_feedback = "Improve form"
        elif self.accuracy_per_curl < 90:
            form_feedback = "Good form"
        else:
            form_feedback = "Excellent form!"
            
        return {
            "form": form_feedback,
            "accuracy": self.accuracy_per_curl,
            "position": self.last_position,
            "repCount": self.rep_count,
            "angles": {
                "elbow_angle": elbow_angle,
                "shoulder_angle": shoulder_angle,
                "back_angle": back_angle
            }
        }