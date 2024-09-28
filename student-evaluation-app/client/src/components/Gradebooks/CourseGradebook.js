// student-evaluation-app/client/src/components/Gradebooks/CourseGradebook.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import { useParams } from 'react-router-dom';

const CourseGradebook = ({ user }) => {
  const { courseId } = useParams();
  const [grades, setGrades] = useState([]);
  const [course, setCourse] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const [courseRes, gradesRes] = await Promise.all([
          axios.get(`${URL}/api/courses/${courseId}`),
          axios.get(`${URL}/api/grades/course/${courseId}?studentId=${user._id}`),
        ]);
        setCourse(courseRes.data);
        setGrades(gradesRes.data);
      } catch (error) {
        setMessage('Error fetching data: ' + error.message);
      }
    };
    fetchGrades();
  }, [courseId, user._id]);

  return (
    <div className="course-gradebook-container">
      <h2>Course Gradebook: {course ? course.title : 'Loading...'}</h2>
      {message && <p>{message}</p>}
      {grades.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Type</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade._id}>
                <td>{grade.assessmentTitle}</td>
                <td>{grade.type}</td>
                <td>{grade.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No grades available.</p>
      )}
    </div>
  );
};

export default CourseGradebook;
