import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import './Auth.css'; // We'll define the purple theme here

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(formData);
            navigate('/my-rooms'); // Redirect to Home/Rooms after success
        } catch (err) {
            alert("Login failed. Check your credentials.");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-left">
                <h1>Welcome back <br/> to the room</h1>
            </div>
            <div className="auth-card">
                <h2>Sign In</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required 
                        />
                    </div>
                    <button type="submit" className="auth-btn">Sign In</button>
                </form>
                <Link to="/signup" className="auth-link">Don't have an account? sign up instead</Link>
            </div>
        </div>
    );
};

export default Login;