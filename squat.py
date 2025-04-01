import cv2
import mediapipe as mp
import numpy as np

# Initialize Mediapipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Angle calculation function
def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    ba = a - b
    bc = c - b
    
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    
    return np.degrees(angle)

# Updated posture accuracy evaluation
def posture_accuracy(hip_knee_ankle, phase):
    if phase == 'up':
        ideal_angle = 170
    else:  # 'down' phase
        ideal_angle = 70

    deviation = abs(hip_knee_ankle - ideal_angle)
    accuracy = max(0, 100 - (deviation / ideal_angle) * 100)
    return accuracy

# Squat detection thresholds
UP_THRESHOLD = 160
DOWN_THRESHOLD = 90

# Video input
video_path = 'Gym_Project/squat1.mp4'
cap = cv2.VideoCapture(video_path)

# Squat variables
squat_count = 0
squat_down = False
hold_frames = 0
frame_hold_threshold = 3

# New variables for accuracy calculation
cumulative_accuracy = 0
accuracy_frames = 0
accuracy_per_squat = 0

# Mediapipe Pose
with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Convert image to RGB
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)
        
        # Convert back to BGR for OpenCV
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        if results.pose_landmarks:
            # Extract landmarks
            landmarks = results.pose_landmarks.landmark

            # Get required key points
            hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]

            # Calculate angles
            hip_knee_ankle_angle = calculate_angle(hip, knee, ankle)
            shoulder_hip_knee_angle = calculate_angle(shoulder, hip, knee)
            
            # Display angles
            cv2.putText(image, f'H-K-A: {int(hip_knee_ankle_angle)}', (20, 50), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.putText(image, f'S-H-K: {int(shoulder_hip_knee_angle)}', (20, 80), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2, cv2.LINE_AA)

            # Squat logic
            if hip_knee_ankle_angle < DOWN_THRESHOLD and not squat_down:
                squat_down = True
                hold_frames = 0
            
            if squat_down and hip_knee_ankle_angle < DOWN_THRESHOLD:
                hold_frames += 1
                cumulative_accuracy += posture_accuracy(hip_knee_ankle_angle, 'down')
                accuracy_frames += 1
            
            if squat_down and hip_knee_ankle_angle >= UP_THRESHOLD and hold_frames >= frame_hold_threshold:
                if accuracy_frames > 0:
                    accuracy_down = cumulative_accuracy / accuracy_frames
                accuracy_up = posture_accuracy(hip_knee_ankle_angle, 'up')
                accuracy_per_squat = (accuracy_up + accuracy_down) / 2
                squat_count += 1
                squat_down = False
                cumulative_accuracy = 0
                accuracy_frames = 0

            # Display accuracy
            cv2.putText(image, f'Accuracy: {int(accuracy_per_squat)}%', (20, 110), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 0, 0), 2, cv2.LINE_AA)
            
            # Display squat count
            cv2.putText(image, f'Squats: {squat_count}', (20, 140), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2, cv2.LINE_AA)
            
            # Draw landmarks
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
        
        # Display frame
        cv2.imshow('Squat Counter', image)
        
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
