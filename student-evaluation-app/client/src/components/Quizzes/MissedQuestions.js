// student-evaluation-app\client\src\components\Quizzes\MissedQuestions.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './MissedQuestions.css'; // Optional: Create a CSS file for styling

const MissedQuestions = () => {
  const [missedQuestions, setMissedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await axios.get(`${URL}/api/grades/`);
        console.log('Grades fetched for Missed Questions:', response.data);

        const allMissedQuestions = new Map();

        response.data.forEach((grade) => {
          grade.answers
            .filter(answer => !answer.isCorrect)
            .forEach((answer) => {
              const questionText = answer.question?.questionText || "Question text missing";
              const correctAnswer = answer.question?.correctAnswer || "Correct answer missing";

              if (questionText) {
                if (!allMissedQuestions.has(questionText)) {
                  allMissedQuestions.set(questionText, {
                    questionText,
                    correctAnswer,
                    incorrectAnswers: new Map(),
                    missedCount: 0,
                  });
                }
                const questionData = allMissedQuestions.get(questionText);
                questionData.missedCount += 1;

                if (!questionData.incorrectAnswers.has(answer.selectedAnswer)) {
                  questionData.incorrectAnswers.set(answer.selectedAnswer, 0);
                }
                questionData.incorrectAnswers.set(answer.selectedAnswer, questionData.incorrectAnswers.get(answer.selectedAnswer) + 1);
              }
            });
        });

        setMissedQuestions(Array.from(allMissedQuestions.values()));
      } catch (error) {
        setMessage('Error fetching missed questions: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, []);

  const formatText = (text) => {
    return text.split('\n').map((str, index) => (
      <React.Fragment key={index}>
        {str}
        <br />
      </React.Fragment>
    ));
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="missed-questions-container">
      <h2>All Missed Questions</h2>
      {message && <p>{message}</p>}
      {missedQuestions.length > 0 ? (
        <ul className="missed-questions-list">
          {missedQuestions.map((questionData, index) => (
            <li key={index} className="question-item">
              <p><strong>Question:</strong> {formatText(questionData.questionText)}</p>
              <p><strong>Correct Answer:</strong> {formatText(questionData.correctAnswer)}</p>
              <p><strong>Missed by:</strong> {questionData.missedCount} {questionData.missedCount > 1 ? 'people' : 'person'}</p>
              <p><strong>Incorrect Answers Given:</strong></p>
              <ul className="incorrect-answers-list">
                {Array.from(questionData.incorrectAnswers.entries()).map(([incorrectAnswer, count], idx) => (
                  <li key={idx} className="incorrect-answer-item">
                    {formatText(incorrectAnswer)} ({count} {count > 1 ? 'times' : 'time'})
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p>No missed questions available.</p>
      )}
    </div>
  );
};

export default MissedQuestions;
