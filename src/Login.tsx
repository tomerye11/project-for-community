import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // בצע כאן את האימות של שם המשתמש והסיסמה
        const isAuthenticated = username === 'admin' && password === 'password'; // יש להחליף בבדיקה מול השרת

        if (isAuthenticated) {
            navigate('/AdminPage2'); 
        } else {
            alert('שם המשתמש או הסיסמה שגויים');
        }
    };

    return (
        <div className="login-container">
            <div className="login">
                <h2>התחברות כמנהל</h2>
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="שם משתמש"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="סיסמה"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit">התחבר</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
