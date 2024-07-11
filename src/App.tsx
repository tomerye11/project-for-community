import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Registration from './Registration';
import AdminPage2 from './AdminPage2';

function App() {
    return (
        <Router>
            <Routes>

                {/* <Route path="/" element={<Registration />} /> */}
                <Route path="/" element={<AdminPage2 />} />

            </Routes>
        </Router>
    );
}

export default App;
