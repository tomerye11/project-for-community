import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Registration from './Registration';
import AdminPage from './AdminPage';
import EditVolunteerAreas from './EditVolunteerAreas'

// import EditVolunteerAreas from './EditVolunteerAreas'; // צריך ליצור דף זה

function App(){
    return <div><AdminPage/></div>;
    }

export default App;