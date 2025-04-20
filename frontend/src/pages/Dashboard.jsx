import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import "./Dashboard.css";

const Dashboard = () => {
  const [selectedActivity, setSelectedActivity] = useState("pushup");
  const [selectedTrainee, setSelectedTrainee] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);
  const [activityData, setActivityData] = useState([]);
  const [connectedTrainees, setConnectedTrainees] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [fetchType, setFetchType] = useState("day");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  const activities = ["pushup", "pullup", "squats", "crunches", "bicepcurl"];
  const timeOptions = [7, 15, 30];

  // Fetch connected trainees if user is a trainer
  useEffect(() => {
    if (auth?.user?.userType === "trainer") {
      fetchConnectedTrainees();
    }
  }, [auth?.user?.userType]);

  // Fetch activity data based on user type and selections
  useEffect(() => {
    if (auth?.user?.userType === "trainee") {
      fetchTraineeActivityData(null, selectedActivity, selectedDays, fetchType);
    } else if (auth?.user?.userType === "trainer" && selectedTrainee) {
      fetchTrainerActivityData(
        selectedTrainee,
        selectedActivity,
        selectedDays,
        fetchType
      );
    }
  }, [
    auth?.user?.userType,
    selectedActivity,
    selectedTrainee,
    selectedDays,
    fetchType,
  ]);

  const fetchConnectedTrainees = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosPrivate.get(
        "/api/trainer/request/connected-trainees"
      );
      setConnectedTrainees(response.data.trainees || []);
    } catch (error) {
      console.error("Error fetching connected trainees:", error);
      setError("Failed to fetch connected trainees. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTraineeActivityData = async (
    traineeUsername,
    activity,
    days,
    fetchType
  ) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosPrivate.get(
        `api/trainee/workout/${fetchType}`,
        {
          params: {
            username: traineeUsername,
            exercise: activity,
            count: days,
          },
        }
      );

      if (response.data && response.data.records) {
        const records = response.data.records;
        setActivityData(records);

        // Transform data for charts
        const formattedData = records
          .map((record) => ({
            day: new Date(record.createdAt).toLocaleDateString(),
            reps: record.count,
            duration: parseFloat(record.duration.toFixed(2)),
          }))
          .reverse(); // Reverse to show oldest to newest
        setChartData(formattedData);
      }
    } catch (error) {
      console.error(`Error fetching trainee data for ${activity}:`, error);
      setError(`Failed to fetch data for ${activity}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrainerActivityData = async (
    traineeUsername,
    activity,
    days,
    fetchType
  ) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosPrivate.get(
        `api/trainer/workout/${fetchType}`,
        {
          params: {
            username: traineeUsername,
            exercise: activity,
            count: days,
          },
        }
      );

      if (response.data && response.data.records) {
        const records = response.data.records;
        setActivityData(records);
        console.log(records);
        
        // Transform data for charts
        const formattedData = records
          .map((record) => ({
            day: new Date(
              record.date?.replace("at", "") || record.createdAt
            ).toLocaleDateString("en-GB"),
            reps:
              fetchType === "record" ? record.count : record.totalCount || 0,
            duration:
              fetchType === "record"
                ? parseFloat((record.duration || 0).toFixed(2))
                : parseFloat((record.totalDuration || 0).toFixed(2)),
          }))
          .reverse(); // Reverse to show oldest to newest

        setChartData(formattedData);
      }
    } catch (error) {
      console.error(
        `Error fetching trainer data for ${traineeUsername}'s ${activity}:`,
        error
      );
      setError(
        `Failed to fetch data for ${traineeUsername}'s ${activity}. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTraineeChange = (e) => {
    setSelectedTrainee(e.target.value);
  };

  // Calculate stats from activity data
  const calculateStats = () => {
    if (!activityData || activityData.length === 0) {
      return {
        totalRecords: 0,
        totalReps: 0,
        avgReps: 0,
      };
    }

    const totalRecords = activityData.length;
    const totalReps =
      fetchType === "record"
        ? activityData.reduce((sum, record) => sum + (record.count || 0), 0)
        : activityData.reduce((sum, record) => sum + (record.totalCount || 0),0)
    const avgReps = totalReps / totalRecords;

    return {
      totalRecords,
      totalReps,
      avgReps: avgReps.toFixed(1),
    };
  };

  const stats = calculateStats();

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="dashboard-container">
        {auth?.user?.userType === "trainer" && (
          <div className="trainee-selector">
            <h2>Select Trainee</h2>
            <select
              value={selectedTrainee}
              onChange={handleTraineeChange}
              disabled={isLoading}
            >
              <option value="">Select a trainee</option>
              {connectedTrainees.map((trainee) => (
                <option key={trainee.username} value={trainee.username}>
                  {trainee.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {auth?.user?.userType === "trainer" && !selectedTrainee ? (
          <div className="placeholder-message">
            <p>Select trainee to show report</p>
          </div>
        ) : (
          <>
            <div className="controls-row">
              <div className="activity-tabs">
                <span>Activity: </span>
                {activities.map((activity) => (
                  <button
                    key={activity}
                    className={`tab ${
                      selectedActivity === activity ? "active" : ""
                    }`}
                    onClick={() => setSelectedActivity(activity)}
                    disabled={isLoading}
                  >
                    {activity.charAt(0).toUpperCase() + activity.slice(1)}
                  </button>
                ))}
              </div>

              <div className="time-period-selector">
                <span>Time period: </span>
                {timeOptions.map((days) => (
                  <button
                    key={days}
                    className={`time-btn tab ${
                      selectedDays === days ? "active" : ""
                    }`}
                    onClick={() => setSelectedDays(days)}
                    disabled={isLoading}
                  >
                    {days} days
                  </button>
                ))}
              </div>

              <div className="time-period-selector">
                <span>Fetch Type: </span>
                <button
                  className={`time-btn tab ${fetchType === "day" ? "active" : ""}`}
                  onClick={() => setFetchType("day")}
                  disabled={isLoading}
                >
                  Day Wise
                </button>
                <button
                  className={`time-btn tab ${fetchType === "record" ? "active" : ""}`}
                  onClick={() => setFetchType("record")}
                  disabled={isLoading}
                >
                  Individual
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="loading-indicator">Loading data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <>
                <div className="stats-cards">
                  <div className="stat-card">
                    <h3>Total Records</h3>
                    <p>{stats.totalRecords}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Reps</h3>
                    <p>{stats.totalReps}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Average Reps</h3>
                    <p>{stats.avgReps}</p>
                  </div>
                </div>

                <div className="content-grid">
                  <div className="chart-column">
                    <div className="chart">
                      <h3>Duration vs Day</h3>
                      {chartData.length > 0 ? (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="day"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="duration"
                                stroke="#8884d8"
                                activeDot={{ r: 8 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="no-data-message">No data available</p>
                      )}
                    </div>

                    <div className="chart">
                      <h3>Reps vs Day</h3>
                      {chartData.length > 0 ? (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="day"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="reps" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="no-data-message">No data available</p>
                      )}
                    </div>
                  </div>

                  <div className="recent-activities">
                    <h2>Recent Activities</h2>
                    {isLoading ? (
                      <div className="loading-indicator">Loading...</div>
                    ) : activityData.length > 0 ? (
                      <div className="activities-list">
                        {activityData.map((activity, index) => (
                          <div
                            key={activity._id || index}
                            className="activity-item"
                          >
                            <h3>{activity.name || selectedActivity}</h3>
                            <p>Reps: {fetchType==="record" ? activity?.count : activity?.totalCount || 0}</p>
                            <p>
                              Duration: {(fetchType==="record" ? activity.duration : activity.totalDuration || 0).toFixed(2)}{" "}
                              min
                            </p>
                            <p>
                              Date:{" "}
                              {activity.date ||
                                new Date(
                                  activity.createdAt
                                ).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data-message">
                        No recent activities available
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
