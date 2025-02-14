// student-evaluation-app\client\src\components\Home.js

import React from 'react';
import { Link } from 'react-router-dom';
import StudentProgress from './StudentProgress';
import './Home.css';

const Home = ({ user }) => {
  return (
    <div className="home-container">
      <h1>Welcome to the Student Group Eval and Quiz Site</h1>
      {user && user.role === 'student' && <StudentProgress user={user} />}
      <div className="card-container">
        {/* Evaluation Card */}
        <div className="home-card">
          <h2>Evaluations</h2>
          <div className="button-list">
            {/* {user && user.role === ('student' || 'instructor') && ( */}
              <Link to="/evaluation" className="home-button">
                Evaluation Form
              </Link>
            {/* // )} */}
            {user && user.role === 'instructor' && (
              <Link to="/define-areas" className="home-button">
                Edit Evaluation
              </Link>
            )}
          </div>
        </div>

        {/* Quiz Card */}
        <div className="home-card">
          <h2>Quizzes</h2>
          <div className="button-list">
            {/* {user && user.role === 'student' && (
              <Link to="/take-quiz" className="home-button">
                Take Quiz
              </Link>
            )} */}
            {user && user.role === 'instructor' && (
              <>
                {/* <Link to="/create-quiz" className="home-button">
                  Create Quiz
                </Link>
                <Link to="/manage-quizzes" className="home-button">
                  Manage Quizzes
                </Link> */}
              </>
            )}
          </div>
        </div>

        {/* Courses and Assignments Card
        <div className="home-card">
          <h2>Courses & Assignments</h2>
          <div className="button-list">
            {user && user.role === 'student' && (
              <>
                <Link to="/courses" className="home-button">
                  View Courses
                </Link>
                <Link to="/assignments" className="home-button">
                  View Assignments
                </Link>
              </>
            )}
            {user && user.role === 'instructor' && (
              <>
                <Link to="/create-course" className="home-button">
                  Create Course
                </Link>
                <Link to="/manage-courses" className="home-button">
                  Manage Courses
                </Link>
                <Link to="/post-assignment" className="home-button">
                  Create Assignment
                </Link>
                <Link to="/manage-assignments" className="home-button">
                  Manage Assignments
                </Link>
              </>
            )}
          </div>
        </div> */}

        {/* Gradebooks Card */}
        <div className="home-card">
          <h2>Gradebooks</h2>
          <div className="button-list">
            {user && (
              <>
                <Link to="/eval-gradebook" className="home-button">
                  Eval Gradebook
                </Link>
                {/* <Link to="/quiz-gradebook" className="home-button">
                  Quiz Gradebook
                </Link> */}
                {/* <Link to="/course-gradebook" className="home-button">
                  Course Gradebook
                </Link>
                {user.role === 'instructor' && (
                  <Link to="/master-gradebook" className="home-button">
                    Master Gradebook
                  </Link>
                )} */}
              </>
            )}
          </div>
        </div>

        {/* Admin Card (Instructor Only) */}
        {user && user.role === 'instructor' && (
          <div className="home-card">
            <h2>Admin</h2>
            <div className="button-list">
              <Link to="/manage-users" className="home-button">
                Manage Users
              </Link>
              {/* <Link to="/manage-cohorts" className="home-button">
                Manage Cohorts
              </Link> */}
              <Link to="/eval-gradebook" className="home-button">
                Eval Gradebook
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
