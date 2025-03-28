import cv2
import mediapipe as mp
import numpy as np

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils

# Angle calculation function
def calculate_angle(a, b, c):
    a = np.array(a)  # Point A
    b = np.array(b)  # Point B
    c = np.array(c)  # Point C

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180.0:
        angle = 360 - angle

    return angle

# Define ideal angles and thresholds
IDEAL_ANGLES = {
    "elbow_top": 170,
    "elbow_down": 60,
    "hip_angle": 170,
    "knee_angle": 170
}

THRESHOLD = 20  # Acceptable deviation in degrees

# New function to calculate angle-based accuracy
def calculate_angle_accuracy(actual_angle, target_angle, threshold=THRESHOLD):
    deviation = abs(actual_angle - target_angle)
    
    if deviation <= threshold:
        accuracy = 100 - ((deviation / threshold)/5) * 100
    else:
        accuracy = max(0, 100 - (deviation - threshold)*3)  # Penalize large deviations

    return accuracy

# Updated posture evaluation function
def calculate_posture_accuracy(elbow_angle, hip_angle, knee_angle, position):
    # Check if counting phase (top or bottom)
    if position == "up":
        elbow_target = IDEAL_ANGLES["elbow_top"]
    elif position == "down":
        elbow_target = IDEAL_ANGLES["elbow_down"]
    else:
        elbow_target = 90  # Neutral position if undefined

    # Calculate accuracy for each angle
    elbow_accuracy = calculate_angle_accuracy(elbow_angle, elbow_target)
    hip_accuracy = calculate_angle_accuracy(hip_angle, IDEAL_ANGLES["hip_angle"])
    knee_accuracy = calculate_angle_accuracy(knee_angle, IDEAL_ANGLES["knee_angle"])

    # Weighted average for final accuracy
    overall_accuracy = (0.05 * elbow_accuracy + 0.5 * hip_accuracy + 0.45 * knee_accuracy) / 1.0
    return overall_accuracy

# Push-up counter with posture accuracy
def pushup_counter(video_path):
    cap = cv2.VideoCapture(video_path)  # Load recorded video
    counter = 0
    position = None  # None -> "up" -> "down"
    down_frames = 0  # Hold duration for down position
    total_frames = 0  # Track total frames for accuracy
    accuracy_frames = 0
    cumulative_accuracy = 0

    # Initialize variables to store cumulative accuracy and frame count for averaging
    cumulative_accuracy = 0
    accuracy_frames = 0
    accuracy_per_pushup = 0

    with mp_pose.Pose(min_detection_confidence=0.7, min_tracking_confidence=0.9) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            total_frames += 1

            # Recolor to RGB
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image)

            # Convert back to BGR
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

            # Check if landmarks detected
            if results.pose_landmarks:
                mp_draw.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

                # Extract key landmarks
                landmarks = results.pose_landmarks.landmark

                # Arm landmarks (wrist, elbow, shoulder)
                shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                            landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
                elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                         landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
                wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                         landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]

                # Body posture landmarks (shoulder, hip, knee, ankle)
                hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                       landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
                knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                        landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
                ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                         landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]

                # Calculate angles
                elbow_angle = calculate_angle(shoulder, elbow, wrist)  # For push-up count
                hip_angle = calculate_angle(shoulder, hip, knee)       # Posture alignment
                knee_angle = calculate_angle(hip, knee, ankle)         # Leg straightness

                # Push-up counting logic with 5-frame hold at down
                if elbow_angle > 160:
                    if position == "down" and accuracy_frames > 0:
                        # Calculate average accuracy for the push-up cycle
                        accuracy_per_pushup = cumulative_accuracy / accuracy_frames
                        cumulative_accuracy = 0
                        accuracy_frames = 0
                        counter += 1  # Increment count when returning to up position
                    position = "up"
                    down_frames = 0
                if elbow_angle < 70 and position == "up":
                    down_frames += 1
                    if down_frames >= 5:  # Hold for 5 frames
                        position = "down"

                # Accumulate accuracy only during the push-up cycle
                if position == "down" or position == "up":
                    cumulative_accuracy += calculate_posture_accuracy(elbow_angle, hip_angle, knee_angle, position)
                    accuracy_frames += 1

                # Display push-up count and posture accuracy
                cv2.putText(image, f'Push-ups: {counter}', (10, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)

                cv2.putText(image, f'Posture Accuracy: {accuracy_per_pushup:.2f}%', (10, 90),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2, cv2.LINE_AA)

                # Debug: Display angles for better evaluation
                cv2.putText(image, f'Elbow: {elbow_angle:.2f} deg', (10, 130),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2, cv2.LINE_AA)

                cv2.putText(image, f'Hip: {hip_angle:.2f} deg', (10, 160),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2, cv2.LINE_AA)

                cv2.putText(image, f'Knee: {knee_angle:.2f} deg', (10, 190),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)

            # Display the feed
            cv2.imshow('Push-up Counter with Posture Accuracy', image)

            # Press 'q' to exit
            if cv2.waitKey(10) & 0xFF == ord('q'):
                break

    cap.release()
    cv2.destroyAllWindows()

# Run push-up counter with recorded video
if __name__ == "__main__":
    video_path = 0  # Change this to your video path
    pushup_counter(video_path)