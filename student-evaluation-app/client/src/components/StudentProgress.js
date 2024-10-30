// client/src/components/StudentProgress.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../backEndURL';
import './StudentProgress.css';

const StudentProgress = ({ user }) => {
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${URL}/api/grades/student/${user._id}/progress`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProgressData(response.data);
      } catch (error) {
        console.error('Error fetching progress data:', error);
      }
    };

    fetchProgress();
  }, [user._id]);

  if (!progressData) {
    return <div>Loading...</div>;
  }

  // Check if coursesProgress exists and is an array before mapping
  if (!progressData.coursesProgress || !Array.isArray(progressData.coursesProgress)) {
    return <div>No course progress data available.</div>;
  }

  return (
    <div className="progress-container">
      <h2>Overall Progress</h2>
      <ProgressBar progress={progressData.overallProgress} />
      <h2>Course Progress</h2>
      {progressData.coursesProgress.map((course) => (
        <div key={course.courseId}>
          <h3>{course.courseTitle}</h3>
          <ProgressBar progress={course.progress} />
        </div>
      ))}
    </div>
  );
};

const ProgressBar = ({ progress }) => (
  <div className="progress-bar">
    <div
      className="progress-bar-fill"
      style={{ width: `${progress}%` }}
    ></div>
    <span className="progress-bar-text">{progress}%</span>
  </div>
);

export default StudentProgress;
