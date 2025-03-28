import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import useAuth from '../hooks/useAuth';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [selectedActivity, setSelectedActivity] = useState('pushup');
  const [selectedTrainee, setSelectedTrainee] = useState('');
  const [activityStats, setActivityStats] = useState({});
  const [chartData, setChartData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [connectedTrainees, setConnectedTrainees] = useState([]);
  const { auth } = useAuth();

  const activities = ['pushup', 'pullup', 'squats', 'crunches', 'bicepcurl'];

  // Fetch connected trainees if user is a trainer
  useEffect(() => {
    if (auth?.user?.userType === 'trainer') {
      fetchConnectedTrainees();
    }
  }, [auth?.user?.userType]);

  // Fetch activity data based on user type and selections
  useEffect(() => {
    if (auth?.user?.userType === 'trainee') {
      fetchTraineeActivityData(selectedActivity);
    } else if (auth?.user?.userType === 'trainer' && selectedTrainee) {
      fetchTrainerActivityData(selectedTrainee, selectedActivity);
    }
  }, [auth?.user?.userType, selectedActivity, selectedTrainee]);

  const fetchConnectedTrainees = async () => {
    try {
      const response = await axios.get('api/trainer/request/connected-trainee');
      setConnectedTrainees(response.data);
    } catch (error) {
      console.error('Error fetching connected trainees:', error);
    }
  };

  const fetchTraineeActivityData = async (activity) => {
    try {
      const response = await axios.get(`api/trainee/view-report/${activity}`);
      const data = response.data;
      
      // Update state with fetched data
      setActivityStats({
        [activity]: data.stats // Assuming API returns stats in required format
      });
      setChartData(data.chartData);
      setRecentActivities(data.recentActivities);
    } catch (error) {
      console.error(`Error fetching trainee data for ${activity}:`, error);
    }
  };

  const fetchTrainerActivityData = async (traineeUsername, activity) => {
    try {
      const response = await axios.get(`api/trainer/view-report/${activity}`, {
        params: { username: traineeUsername }
      });
      const data = response.data;
      
      // Update state with fetched data
      setActivityStats({
        [activity]: data.stats
      });
      setChartData(data.chartData);
      setRecentActivities(data.recentActivities);
    } catch (error) {
      console.error(`Error fetching trainer data for ${traineeUsername}'s ${activity}:`, error);
    }
  };

  const handleTraineeChange = (e) => {
    setSelectedTrainee(e.target.value);
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {auth?.user?.userType === 'trainer' && (
        <div className="trainee-selector">
          <h2>Select Trainee</h2>
          <select value={selectedTrainee} onChange={handleTraineeChange}>
            <option value="">Select a trainee</option>
            {connectedTrainees.map(trainee => (
              <option key={trainee.username} value={trainee.username}>
                {trainee.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="activity-tabs">
        {activities.map(activity => (
          <button
            key={activity}
            className={`tab ${selectedActivity === activity ? 'active' : ''}`}
            onClick={() => setSelectedActivity(activity)}
          >
            {activity.charAt(0).toUpperCase() + activity.slice(1)}
          </button>
        ))}
      </div>

      {(auth?.user?.userType === 'trainee' || 
        (auth?.user?.userType === 'trainer' && selectedTrainee)) && (
        <>
          <div className="stats-cards">
            {activityStats[selectedActivity] && (
              <>
                <div className="stat-card">
                  <h3>Total Records</h3>
                  <p>{activityStats[selectedActivity].totalRecords || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Reps</h3>
                  <p>{activityStats[selectedActivity].totalReps || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Average Reps</h3>
                  <p>{activityStats[selectedActivity].avgReps || 0}</p>
                </div>
              </>
            )}
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
        </>
      )}
    </div>
  );
};

export default Dashboard;