import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Registration from './Registration';
import AdminPage2 from './AdminPage2';
import Login from './Login';

function App() {
    return (
        <Router>
            <Routes>
                {/* <Route path="/Registration" element={<Registration />} /> */}
                <Route path="/" element={<AdminPage2 />} />
                {/* <Route path="/login" element={<Login />} /> */}
                {/* <Route path="/AdminPage2" element={<AdminPage2 />} /> */}
            </Routes>
        </Router>
    );
}

export default App;
