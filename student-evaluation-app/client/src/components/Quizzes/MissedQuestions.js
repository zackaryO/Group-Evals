// student-evaluation-app\client\src\components\Quizzes\MissedQuestions.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './MissedQuestions.css'; // Optional: Create a CSS file for styling

const MissedQuestions = () => {
  const [missedQuestions, setMissedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeQuizId, setActiveQuizId] = useState(null);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setMessage('Authentication token missing. Please log in again.');
          return;
        }

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const response = await axios.get(`${URL}/api/grades/`, config);
        console.log('Grades fetched for Missed Questions:', response.data);

        const quizzesMap = new Map();

        response.data.forEach((grade) => {
          const quizId = grade.quiz?._id || `unknown-${grade._id}`;
          const quizTitle = grade.quiz?.title || 'Quiz Title Missing';

          if (!quizzesMap.has(quizId)) {
            quizzesMap.set(quizId, {
              quizId,
              quizTitle,
              questions: new Map(),
              totalMissedCount: 0,
            });
          }

          const quizEntry = quizzesMap.get(quizId);

          if (!Array.isArray(grade.answers)) {
            return;
          }

          grade.answers
            .filter((answer) => !answer.isCorrect)
            .forEach((answer) => {
              const questionId = answer.question?._id || answer._id || `${quizId}-unknown`;
              const questionText = answer.question?.questionText || 'Question text missing';
              const correctAnswer = answer.question?.correctAnswer || 'Correct answer missing';
              const selectedAnswer =
                typeof answer.selectedAnswer === 'string' && answer.selectedAnswer.trim() !== ''
                  ? answer.selectedAnswer
                  : 'No answer provided';

              if (!quizEntry.questions.has(questionId)) {
                quizEntry.questions.set(questionId, {
                  questionId,
                  questionText,
                  correctAnswer,
                  incorrectAnswers: new Map(),
                  missedCount: 0,
                });
              }

              const questionData = quizEntry.questions.get(questionId);
              questionData.missedCount += 1;
              quizEntry.totalMissedCount += 1;

              if (!questionData.incorrectAnswers.has(selectedAnswer)) {
                questionData.incorrectAnswers.set(selectedAnswer, 0);
              }

              questionData.incorrectAnswers.set(
                selectedAnswer,
                questionData.incorrectAnswers.get(selectedAnswer) + 1,
              );
            });
        });

        const quizzesArray = Array.from(quizzesMap.values())
          .map((quiz) => ({
            quizId: quiz.quizId,
            quizTitle: quiz.quizTitle,
            totalMissedCount: quiz.totalMissedCount,
            questions: Array.from(quiz.questions.values()).sort((a, b) => b.missedCount - a.missedCount),
          }))
          .sort((a, b) => a.quizTitle.localeCompare(b.quizTitle));

        setMissedQuestions(quizzesArray);
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          setMessage('You are not authorized to view missed questions.');
        } else {
          setMessage('Error fetching missed questions: ' + error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, []);

  const formatText = (text) => {
    if (text === null || text === undefined) {
      return <em>Not provided</em>;
    }

    const normalized = String(text);
    if (normalized.trim() === '') {
      return <em>Not provided</em>;
    }

    return normalized.split('\n').map((str, index) => (
      <React.Fragment key={index}>
        {str}
        <br />
      </React.Fragment>
    ));
  };

  const parseQuestionContent = (rawText) => {
    if (rawText === null || rawText === undefined) {
      return { prompt: null, options: [] };
    }

    const normalized = String(rawText).replace(/\r\n/g, '\n');
    if (normalized.trim() === '') {
      return { prompt: null, options: [] };
    }

    const lines = normalized.split('\n');
    const optionStartIndex = lines.findIndex((line) => /^[A-Da-d][\).]\s*/.test(line.trim()));

    if (optionStartIndex === -1) {
      return { prompt: normalized, options: [] };
    }

    const promptLines = lines.slice(0, optionStartIndex);
    const promptText = promptLines.join('\n').trim();

    const options = lines
      .slice(optionStartIndex)
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => {
        const match = line.match(/^([A-Da-d])[\).]?\s*(.*)$/);
        if (match) {
          return {
            label: match[1].toUpperCase(),
            text: match[2] || '',
          };
        }
        return {
          label: null,
          text: line,
        };
      });

    return {
      prompt: promptText || null,
      options,
    };
  };

  const handleQuizToggle = (quizId) => {
    setActiveQuizId((prevQuizId) => (prevQuizId === quizId ? null : quizId));
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="missed-questions-container">
      <h2>All Missed Questions</h2>
      {message && <p>{message}</p>}
      {missedQuestions.length > 0 ? (
        <ul className="quiz-groups">
          {missedQuestions.map((quiz) => (
            <li
              key={quiz.quizId}
              className={`quiz-group ${activeQuizId === quiz.quizId ? 'expanded' : ''}`}
            >
              <button
                type="button"
                className="quiz-toggle"
                onClick={() => handleQuizToggle(quiz.quizId)}
              >
                <span className="quiz-title">{quiz.quizTitle}</span>
                <span className="quiz-count">
                  {quiz.totalMissedCount} {quiz.totalMissedCount === 1 ? 'miss' : 'misses'}
                </span>
              </button>
              {activeQuizId === quiz.quizId && (
                <ul className="missed-questions-list">
                  {quiz.questions.map((question) => {
                    const { prompt, options } = parseQuestionContent(question.questionText);
                    return (
                      <li key={question.questionId} className="question-item">
                        <div className="question-prompt-block">
                          <p>
                            <strong>Question:</strong>
                          </p>
                          <div className="question-prompt">{formatText(prompt)}</div>
                        </div>
                        {options.length > 0 && (
                          <div className="question-options-block">
                            <p>
                              <strong>Choices:</strong>
                            </p>
                            <ul className="question-options">
                              {options.map((option, idx) => (
                                <li key={idx} className="question-option-item">
                                  {option.label && <span className="option-label">{option.label}.</span>}
                                  <span className="option-text">{formatText(option.text)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="question-correct-answer">
                          <p>
                            <strong>Correct Answer:</strong>
                          </p>
                          <div className="correct-answer">{formatText(question.correctAnswer)}</div>
                        </div>
                        <p>
                          <strong>Missed by:</strong> {question.missedCount}{' '}
                          {question.missedCount > 1 ? 'people' : 'person'}
                        </p>
                        <p>
                          <strong>Incorrect Answers Given:</strong>
                        </p>
                        <ul className="incorrect-answers-list">
                          {Array.from(question.incorrectAnswers.entries()).map(([incorrectAnswer, count], idx) => (
                            <li key={idx} className="incorrect-answer-item">
                              {formatText(incorrectAnswer)} ({count} {count > 1 ? 'times' : 'time'})
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
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
