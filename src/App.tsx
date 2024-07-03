import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminPage from './AdminPage';
import EditVolunteerAreas from './EditVolunteerAreas';
import Registration from './Registration';
import AdminPage2 from './AdminPage2';

function App() {
    return (
        <Router>
            <Routes>
                {/* <Route path="/" element={<AdminPage />} />
                <Route path="/edit-volunteer-areas" element={<EditVolunteerAreas />} /> */}

                {/* <Route path="/" element={<Registration />} /> */}
                <Route path="/" element={<AdminPage2 />} />

            </Routes>
        </Router>
    );
}

export default App;
