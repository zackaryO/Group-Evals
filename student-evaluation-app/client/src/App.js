import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import EvaluationForm from './components/Evaluation/EvaluationForm';
import Gradebook from './components/Evaluation/Gradebook';
import DefineAreas from './components/Instructor/DefineAreas';
import ManageStudents from './components/Instructor/ManageStudents';

const App = () => (
  <Router>
    <Navbar />
    <Switch>
      <Route path="/" exact component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/evaluation" component={EvaluationForm} />
      <Route path="/gradebook" component={Gradebook} />
      <Route path="/define-areas" component={DefineAreas} />
      <Route path="/manage-students" component={ManageStudents} />
    </Switch>
  </Router>
);

export default App;
