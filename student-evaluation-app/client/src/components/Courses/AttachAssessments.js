// student-evaluation-app/client/src/components/Courses/AttachAssessments.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const AttachAssessments = () => {
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCoursesAndQuizzes = async () => {
      try {
        const [coursesRes, quizzesRes] = await Promise.all([
          axios.get(`${URL}/api/courses`),
          axios.get(`${URL}/api/quizzes`),
        ]);
        setCourses(coursesRes.data);
        setQuizzes(quizzesRes.data);
      } catch (error) {
        setMessage('Error fetching data: ' + error.message);
      }
    };
    fetchCoursesAndQuizzes();
  }, []);

  const handleAttach = async () => {
    try {
      await axios.put(`${URL}/api/courses/${selectedCourse}/attach-quiz`, {
        quizId: selectedQuiz,
      });
      setMessage('Quiz attached to course successfully.');
    } catch (error) {
      setMessage('Error attaching quiz: ' + error.message);
    }
  };

  return (
    <div className="attach-assessments-container">
      <h2>Attach Assessments to Courses</h2>
      {message && <p>{message}</p>}
      <label>
        Select Course:
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          required
        >
          <option value="">--Select Course--</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Select Quiz:
        <select
          value={selectedQuiz}
          onChange={(e) => setSelectedQuiz(e.target.value)}
          required
        >
          <option value="">--Select Quiz--</option>
          {quizzes.map((quiz) => (
            <option key={quiz._id} value={quiz._id}>
              {quiz.title}
            </option>
          ))}
        </select>
      </label>
      <button onClick={handleAttach}>Attach Quiz</button>
    </div>
  );
};

export default AttachAssessments;
