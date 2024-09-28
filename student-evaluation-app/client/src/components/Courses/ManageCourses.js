// student-evaluation-app/client/src/components/Courses/ManageCourses.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${URL}/api/courses`);
        setCourses(response.data);
      } catch (error) {
        setMessage('Error fetching courses: ' + error.message);
      }
    };
    fetchCourses();
  }, []);

  const handleDelete = async (courseId) => {
    try {
      await axios.delete(`${URL}/api/courses/${courseId}`);
      setCourses((prev) => prev.filter((course) => course._id !== courseId));
      setMessage('Course deleted successfully.');
    } catch (error) {
      setMessage('Error deleting course: ' + error.message);
    }
  };

  return (
    <div className="manage-courses-container">
      <h2>Manage Courses</h2>
      {message && <p>{message}</p>}
      {courses.length > 0 ? (
        <ul>
          {courses.map((course) => (
            <li key={course._id}>
              <p>Title: {course.title}</p>
              <p>Description: {course.description}</p>
              <button onClick={() => handleDelete(course._id)}>Delete</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No courses available.</p>
      )}
    </div>
  );
};

export default ManageCourses;
