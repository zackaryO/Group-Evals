import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import URL from '../../backEndURL';
import './QuizGradebook.css'; // Import the CSS

const QuizGradebook = ({ user }) => {
  const [grades, setGrades] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        let response;
        if (user.role === 'instructor') {
          response = await axios.get(`${URL}/api/grades/`);
        } else {
          response = await axios.get(`${URL}/api/grades/${user._id}`);
        }
        console.log('Grades fetched: ', response.data);
        setGrades(response.data);
      } catch (error) {
        setMessage('Error fetching grades: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [user]);

  const handleDelete = async (submissionId) => {
    try {
      await axios.delete(`${URL}/api/grades/${submissionId}`);
      setGrades((prevGrades) => prevGrades.filter((grade) => grade._id !== submissionId));
      setMessage('Submission deleted successfully.');
    } catch (error) {
      setMessage('Error deleting submission: ' + error.message);
    }
  };

  const handleQuizSelect = (quizId) => {
    setSelectedQuizId(quizId === selectedQuizId ? null : quizId);
  };

  const groupByStudent = (grades) => {
    const grouped = {};
    grades.forEach((grade) => {
      if (grade.student) {
        const studentId = grade.student._id;
        if (!grouped[studentId]) {
          grouped[studentId] = {
            student: grade.student,
            quizzes: [],
          };
        }
        grouped[studentId].quizzes.push(grade);
      }
    });
    console.log('Grouped Grades by Student: ', JSON.stringify(grouped, null, 2)); // Detailed logging
    return grouped;
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  const groupedGrades = groupByStudent(grades);

  return (
    <div className="quiz-gradebook-container">
      <h2>Quiz Gradebook</h2>
      {message && <p>{message}</p>}
      {user.role === 'instructor' && (
        <Link to="/missed-questions" className="missed-questions-link">
          View All Missed Questions
        </Link>
      )}
      {grades.length > 0 ? (
        <div className="student-grades">
          {Object.keys(groupedGrades).map((studentId) => {
            const studentData = groupedGrades[studentId].student;
            return (
              <div key={studentId} className="student-grade">
                <h3>{studentData.firstName} {studentData.lastName}</h3>
                <p>Username: {studentData.username}</p>
                <div className="quiz-list">
                  {groupedGrades[studentId].quizzes.map((quiz) => (
                    <div key={quiz._id} className="quiz-item">
                      <span onClick={() => handleQuizSelect(quiz._id)}>
                        {quiz.quiz?.title || "Quiz Title Missing"}: {quiz.score?.toFixed(2)}%, <strong>Click to see missed questions.</strong>
                      </span>
                      {user.role === 'instructor' && (
                        <button onClick={() => handleDelete(quiz._id)}>Delete</button>
                      )}
                      {selectedQuizId === quiz._id && (
                        <div className="incorrect-answers">
                          <h4>Incorrect Answers:</h4>
                          {quiz.answers
                            .filter(answer => !answer.isCorrect)
                            .map((answer, index) => (
                              <div key={index} className="answer-detail">
                                <p><strong>Question:</strong> {answer?.question?.questionText || "Question text missing"}</p>
                                <p><strong>Your Answer:</strong> {answer.selectedAnswer}</p>
                                <p><strong>Correct Answer:</strong> {answer?.question?.correctAnswer || "Correct answer missing"}</p>
                              </div>
                            ))}
                          {quiz.answers.filter(answer => !answer.isCorrect).length === 0 && (
                            <p>All answers were correct!</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No grades available.</p>
      )}
    </div>
  );
};

export default QuizGradebook;
