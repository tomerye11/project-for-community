import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const isAuthenticated = username === 'admin' && password === 'minhal468!';

        if (isAuthenticated) {
            localStorage.setItem('isAuthenticated', 'true');
            navigate('/AdminPage2');
        } else {
            setError('שם המשתמש או הסיסמה שגויים');
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
                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
};

export default Login;
