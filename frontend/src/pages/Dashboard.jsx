import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [selectedActivity, setSelectedActivity] = useState('pushup');
  const userType = useSelector((state) => state.auth.userType);
  
  // Placeholder data - would come from backend in production
  const activityStats = {
    pushup: { totalRecords: 25, totalReps: 500, avgReps: 20 },
    pullup: { totalRecords: 15, totalReps: 150, avgReps: 10 },
    squats: { totalRecords: 30, totalReps: 600, avgReps: 20 },
    crunches: { totalRecords: 20, totalReps: 400, avgReps: 20 },
    bicepcurl: { totalRecords: 18, totalReps: 360, avgReps: 20 }
  };

  const chartData = [
    { day: 'Mon', duration: 30, reps: 50, calories: 300 },
    { day: 'Tue', duration: 45, reps: 60, calories: 450 },
    { day: 'Wed', duration: 25, reps: 40, calories: 250 },
    { day: 'Thu', duration: 50, reps: 70, calories: 500 },
    { day: 'Fri', duration: 35, reps: 55, calories: 350 },
  ];

  const recentActivities = [
    { id: 1, type: 'Push-ups', reps: 20, duration: '10 mins', date: '2024-03-10' },
    { id: 2, type: 'Squats', reps: 30, duration: '15 mins', date: '2024-03-09' },
    { id: 3, type: 'Pull-ups', reps: 15, duration: '12 mins', date: '2024-03-08' },
  ];

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {userType === 'trainer' && (
        <div className="trainee-selector">
          <h2>Select Trainee</h2>
          <select>
            <option value="">Select a trainee</option>
            <option value="trainee1">John Doe</option>
            <option value="trainee2">Jane Smith</option>
          </select>
        </div>
      )}

      <div className="activity-tabs">
        {Object.keys(activityStats).map(activity => (
          <button
            key={activity}
            className={`tab ${selectedActivity === activity ? 'active' : ''}`}
            onClick={() => setSelectedActivity(activity)}
          >
            {activity.charAt(0).toUpperCase() + activity.slice(1)}
          </button>
        ))}
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Records</h3>
          <p>{activityStats[selectedActivity].totalRecords}</p>
        </div>
        <div className="stat-card">
          <h3>Total Reps</h3>
          <p>{activityStats[selectedActivity].totalReps}</p>
        </div>
        <div className="stat-card">
          <h3>Average Reps</h3>
          <p>{activityStats[selectedActivity].avgReps}</p>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart">
          <h3>Duration vs Day</h3>
          <LineChart width={500} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="duration" stroke="#8884d8" />
          </LineChart>
        </div>

        <div className="chart">
          <h3>Reps vs Day</h3>
          <BarChart width={500} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="reps" fill="#82ca9d" />
          </BarChart>
        </div>
      </div>

      <div className="recent-activities">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {recentActivities.map(activity => (
            <div key={activity.id} className="activity-item">
              <h3>{activity.type}</h3>
              <p>Reps: {activity.reps}</p>
              <p>Duration: {activity.duration}</p>
              <p>Date: {activity.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;