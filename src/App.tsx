
// import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// import Login from './Login';
// import AdminPage2 from './AdminPage2';
// import ProtectedRoute from './ProtectedRoute.tsx';

// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<Login />} />
//         <Route path="/AdminPage2" element={<ProtectedRoute><AdminPage2 /></ProtectedRoute>} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Registration from './Registration';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Registration />} />
      </Routes>
    </Router>
  );
}

export default App;
