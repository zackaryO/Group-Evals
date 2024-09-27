// student-evaluation-app\client\src\components\Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css'; // Ensure you have this CSS file for styling

const Home = ({ user }) => {
  return (
    <div className="home-container">
      <h1>Welcome to the Student Group Eval and Quiz site</h1>
      <div className="card-container">
        {/* Evaluation Card */}
        <div className="home-card">
          <h2>Evaluations</h2>
          <div className="button-list">
            <Link to="/evaluation" className="home-button">
              Evaluation Form
            </Link>
            <Link to="/eval-gradebook" className="home-button">
              Eval Gradebook
            </Link>
            {user && user.role === 'instructor' && (
              <>
                <Link to="/define-areas" className="home-button">
                  Edit Evaluation
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Quiz Card */}
        <div className="home-card">
          <h2>Quizzes</h2>
          <div className="button-list">
            <Link to="/quiz-gradebook" className="home-button">
              Quiz Gradebook
            </Link>
            {user && user.role === 'instructor' && (
              <>
                <Link to="/create-quiz" className="home-button">
                  Create Quiz
                </Link>
                <Link to="/manage-quizzes" className="home-button">
                  Manage Quizzes
                </Link>
              </>
            )}
            {user && user.role === 'student' && (
              <Link to="/take-quiz" className="home-button">
                Take Quiz
              </Link>
            )}
          </div>
        </div>

        {/* Manage Users Card (Instructor Only) */}
        {user && user.role === 'instructor' && (
          <div className="home-card">
            <h2>Admin</h2>
            <div className="button-list">
              <Link to="/register" className="home-button">
                Manage Users
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
    
  );
};

export default Home;
