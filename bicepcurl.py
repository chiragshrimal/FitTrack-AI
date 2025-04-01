import cv2
import mediapipe as mp
import numpy as np

# Constants and thresholds
UP_THRESHOLD = 80  # Elbow flexion for up position
DOWN_THRESHOLD = 140  # Elbow extension for down position

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

# Posture accuracy evaluation
def posture_accuracy(elbow_angle, shoulder_angle, back_angle):
    ideal_elbow_up = 70
    ideal_elbow_down = 160
    ideal_shoulder_angle = 0
    ideal_back_angle = 180

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

# Video input
video_path = 'Gym_Project/bicep1.mp4'
cap = cv2.VideoCapture(video_path)

# Curl variables
curl_count = 0
curl_down = False
hold_frames = 0
frame_hold_threshold = 0

# New variables for accuracy detection
cumulative_accuracy = 0
accuracy_frames = 0
accuracy_per_curl = 0

# Mediapipe Pose
with mp_pose.Pose(min_detection_confidence=0.9, min_tracking_confidence=0.9) as pose:

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Convert image to RGB
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pose_results = pose.process(image)

        # Convert back to BGR for OpenCV
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        if pose_results.pose_landmarks:
            # Extract landmarks
            landmarks = pose_results.pose_landmarks.landmark

            # Get required key points
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                        landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
            hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                   landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]

            # Calculate angles
            elbow_angle = calculate_angle(shoulder, elbow, wrist)
            shoulder_angle = calculate_angle(hip, shoulder, elbow)
            # Create a vertical reference slightly above the shoulder to calculate back angle
            back_angle = calculate_angle(hip, shoulder, [shoulder[0], shoulder[1] - 0.1])

            # Display angles
            cv2.putText(image, f'Elbow: {int(elbow_angle)}', (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.putText(image, f'Shoulder: {int(shoulder_angle)}', (20, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(image, f'Back: {int(back_angle)}', (20, 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 0, 0), 2, cv2.LINE_AA)

            # Curl logic
            if elbow_angle > DOWN_THRESHOLD and not curl_down:
                curl_down = True
                hold_frames = 0

            if not curl_down and elbow_angle <= UP_THRESHOLD:
                hold_frames += 1

            if curl_down and elbow_angle > DOWN_THRESHOLD and hold_frames >= frame_hold_threshold:
                accuracy_down = posture_accuracy(elbow_angle, shoulder_angle, back_angle)
                curl_down = False

            if not curl_down and elbow_angle <= UP_THRESHOLD and hold_frames >= frame_hold_threshold:
                accuracy_up = posture_accuracy(elbow_angle, shoulder_angle, back_angle)
                accuracy_per_curl = (accuracy_up + accuracy_down) / 2
                curl_count += 1
                hold_frames = 0
                curl_down=True

            # Display accuracy
            cv2.putText(image, f'Accuracy: {int(accuracy_per_curl)}%', (20, 170),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 0, 0), 2, cv2.LINE_AA)

            # Display curl count
            cv2.putText(image, f'Curls: {curl_count}', (20, 200),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2, cv2.LINE_AA)

            # Draw landmarks
            mp_drawing.draw_landmarks(image, pose_results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        # Display frame
        cv2.imshow('Bicep Curl Counter', image)

        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
