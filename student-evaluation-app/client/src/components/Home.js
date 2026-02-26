// student-evaluation-app\client\src\components\Home.js

import React from 'react';
import { Link } from 'react-router-dom';
import StudentProgress from './StudentProgress';
import './Home.css';

const Home = ({ user }) => {
  return (
    <div className="home-container">
      <h1>Welcome to the Student Group Eval and Quiz Site</h1>

      {/**
       * This component shows progress if the user is a student.
       * We do not change or remove this existing functionality.
       */}
      {user && user.role === 'student' && <StudentProgress user={user} />}

      <div className="card-container">
        {/* EVALUATIONS CARD */}
        <div className="home-card">
          <h2>Evaluations</h2>
          <div className="button-list">
            <Link to="/evaluation" className="home-button">
              Evaluation Form
            </Link>
            {user && user.role === 'instructor' && (
              <Link to="/define-areas" className="home-button">
                Edit Evaluation
              </Link>
            )}
          </div>
        </div>

        {/* QUIZZES CARD */}
        <div className="home-card">
          <h2>Quizzes</h2>
          <div className="button-list">
            {user && user.role === 'student' && (
              <Link to="/take-quiz" className="home-button">
                Take Quiz
              </Link>
            )}
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
          </div>
        </div>

        {/* GRADEBOOKS CARD */}
        <div className="home-card">
          <h2>Gradebooks</h2>
          <div className="button-list">
            {user && (
              <>
                <Link to="/eval-gradebook" className="home-button">
                  Eval Gradebook
                </Link>
                <Link to="/quiz-gradebook" className="home-button">
                  Quiz Gradebook
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ADMIN CARD (Instructor Only) */}
        {user && user.role === 'instructor' && (
          <div className="home-card">
            <h2>Admin</h2>
            <div className="button-list">
              <Link to="/manage-users" className="home-button">
                Manage Users
              </Link>
              <Link to="/eval-gradebook" className="home-button">
                Eval Gradebook
              </Link>
              <Link to="/resume-builder" className="home-button">
                Resume Builder
              </Link>
            </div>
          </div>
        )}

        {/* FACILITY TOOLS & INVENTORY (Instructor Only) */}
        {user && user.role === 'instructor' && (
          <div className="home-card inventory-card">
            <h2>Facility Tools & Inventory</h2>

            {/**
             * We use a grid layout for these links to make them more visually appealing.
             */}
            <div className="inventory-grid">
              <Link to="/tools" className="inventory-link">
                Tools
              </Link>
              <Link to="/loaner-toolboxes" className="inventory-link">
                Loaner Toolboxes
              </Link>
              <Link to="/spare-parts" className="inventory-link">
                Spare Parts
              </Link>
              <Link to="/instructor-tools" className="inventory-link">
                Instructor Tools
              </Link>
              <Link to="/consumables" className="inventory-link">
                Consumables
              </Link>
              <Link to="/facility-needs" className="inventory-link">
                Facility Needs
              </Link>
              <Link to="/training-vehicles" className="inventory-link">
                Training Vehicles
              </Link>
              <Link to="/inventory-reports" className="inventory-link">
                Reports
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default Home;
