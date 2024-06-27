import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminPage from './AdminPage';
import EditVolunteerAreas from './EditVolunteerAreas';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AdminPage />} />
                <Route path="/edit-volunteer-areas" element={<EditVolunteerAreas />} />
            </Routes>
        </Router>
    );
}

export default App;
