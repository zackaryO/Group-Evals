// student-evaluation-app/client/src/components/Student/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import { Link } from 'react-router-dom';
import { ProgressBar } from 'react-bootstrap'; // You may need to install react-bootstrap

const StudentDashboard = ({ user }) => {
  const [progress, setProgress] = useState(0);
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Fetch courses the student is enrolled in
        const coursesRes = await axios.get(`${URL}/api/courses/student/${user._id}`);
        setCourses(coursesRes.data);

        // Fetch overall progress (this is a placeholder implementation)
        const progressRes = await axios.get(`${URL}/api/progress/${user._id}`);
        setProgress(progressRes.data.progress);
      } catch (error) {
        setMessage('Error fetching data: ' + error.message);
      }
    };
    fetchProgress();
  }, [user._id]);

  return (
    <div className="student-dashboard-container">
      <h2>Welcome, {user.firstName}</h2>
      {message && <p>{message}</p>}
      <div className="progress-section">
        <h3>Your Progress</h3>
        <ProgressBar now={progress} label={`${progress}%`} />
      </div>
      <div className="courses-section">
        <h3>Your Courses</h3>
        {courses.length > 0 ? (
          <ul>
            {courses.map((course) => (
              <li key={course._id}>
                <Link to={`/course-gradebook/${course._id}`}>{course.title}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>You are not enrolled in any courses.</p>
        )}
      </div>
      <div className="gradebooks-section">
        <h3>Gradebooks</h3>
        <ul>
          <li>
            <Link to="/quiz-gradebook">Quiz Gradebook</Link>
          </li>
          <li>
            <Link to="/eval-gradebook">Evaluation Gradebook</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StudentDashboard;
