import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminPage from './AdminPage';
import EditVolunteerAreas from './EditVolunteerAreas';
import Registration from './Registration';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AdminPage />} />
                <Route path="/edit-volunteer-areas" element={<EditVolunteerAreas />} />

                {/* <Route path="/" element={<Registration />} /> */}

            </Routes>
        </Router>
    );
}

export default App;
