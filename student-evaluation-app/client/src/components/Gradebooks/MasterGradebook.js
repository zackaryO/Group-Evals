// student-evaluation-app/client/src/components/Gradebooks/MasterGradebook.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MasterGradebook.css';

const MasterGradebook = ({ user }) => {
  const [progressData, setProgressData] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token');

        if (user.role === 'instructor') {
          // Fetch all students' progress
          const response = await axios.get('/api/grades/progress', {
            headers: {
              Authorization: token,
            },
          });
          setProgressData(response.data);
        } else if (user.role === 'student') {
          // Fetch this student's progress
          const response = await axios.get(`/api/grades/student/${user._id}/progress`, {
            headers: {
              Authorization: token,
            },
          });
          setProgressData({
            studentName: `${user.firstName} ${user.lastName}`,
            overallProgress: response.data.overallProgress,
            coursesProgress: response.data.coursesProgress,
          });
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };

    fetchProgress();
  }, [user]);

  const ProgressBar = ({ progress }) => (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      <span className="progress-bar-text">{progress}%</span>
    </div>
  );

  if (user.role === 'instructor') {
    return (
      <div className="gradebook-container">
        <h2>Master Gradebook</h2>
        <table className="gradebook-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Overall Progress</th>
            </tr>
          </thead>
          <tbody>
            {progressData.map((student) => (
              <tr key={student.studentId}>
                <td>{student.studentName}</td>
                <td>
                  <ProgressBar progress={student.overallProgress} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (user.role === 'student') {
    return (
      <div className="gradebook-container">
        <h2>My Progress</h2>
        <h3>Overall Progress</h3>
        <ProgressBar progress={progressData.overallProgress} />
        <h3>Course Progress</h3>
        {progressData.coursesProgress &&
          progressData.coursesProgress.map((course) => (
            <div key={course.courseId}>
              <h4>{course.courseTitle}</h4>
              <ProgressBar progress={course.progress} />
            </div>
          ))}
      </div>
    );
  } else {
    return <div>You do not have access to view this page.</div>;
  }
};

export default MasterGradebook;
