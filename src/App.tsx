import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Login';
import Registration from './Registration';
import AdminPage2 from './AdminPage2';

function App() {
  return (
    <Router>
      <Routes>
        {/* <Route path="/" element={<Login />} /> */}
        <Route path="/" element={<Registration />} />
        {/* <Route path="/AdminPage2" element={<AdminPage2 />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
