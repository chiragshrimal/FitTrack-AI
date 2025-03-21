import React, { useRef, useState } from 'react';
import {Navigate} from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Webcam from 'react-webcam';
import './VideoFeed.css';

const VideoFeed = () => {

  const {auth} = useAuth();
  if(auth?.user?.userType !== 'trainee') {
    return <Navigate to="/access-denied" replace />;
  }

  const webcamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentExercise, setCurrentExercise] = useState('pushup');
  const [feedback, setFeedback] = useState(null);
  const [repCount, setRepCount] = useState(0);

  const exercises = [
    { id: 'pushup', name: 'Push-ups' },
    { id: 'pullup', name: 'Pull-ups' },
    { id: 'squat', name: 'Squats' },
    { id: 'crunch', name: 'Crunches' },
    { id: 'bicepcurl', name: 'Bicep Curls' }
  ];

  const startRecording = () => {
    setIsRecording(true);
    // Simulate exercise detection and rep counting
    const interval = setInterval(() => {
      setRepCount(prev => prev + 1);
      setFeedback({
        form: 'Good form! Keep your core tight.',
        confidence: Math.random() * 100
      });
    }, 3000);

    // Clear interval after 1 minute
    setTimeout(() => {
      clearInterval(interval);
      setIsRecording(false);
    }, 60000);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  return (
    <div className="video-feed">
      <div className="video-container">
        <div className="exercise-selector">
          <label htmlFor="exercise">Select Exercise:</label>
          <select
            className='exercise-select'
            id="exercise"
            value={currentExercise}
            onChange={(e) => setCurrentExercise(e.target.value)}
          >
            {exercises.map(exercise => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>

        <div className="webcam-container">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="webcam"
          />
          
          {feedback && (
            <div className="feedback-overlay">
              <div className="feedback-content">
                <p className="form-feedback">{feedback.form}</p>
                <div className="confidence-meter">
                  <div 
                    className="confidence-bar"
                    style={{ width: `${feedback.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="controls">
          {!isRecording ? (
            <button className="btn-start" onClick={startRecording}>
              Start Recording
            </button>
          ) : (
            <button className="btn-stop" onClick={stopRecording}>
              Stop Recording
            </button>
          )}
        </div>
      </div>

      <div className="stats-panel">
        <div className="stat-item">
          <h3>Exercise</h3>
          <p>{exercises.find(e => e.id === currentExercise)?.name}</p>
        </div>
        <div className="stat-item">
          <h3>Rep Count</h3>
          <p>{repCount}</p>
        </div>
        {feedback && (
          <div className="stat-item">
            <h3>Form Confidence</h3>
            <p>{Math.round(feedback.confidence)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoFeed;