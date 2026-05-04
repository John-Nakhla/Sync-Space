import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
import './Auth.css';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation for the confirm password field
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            // This hits your @PostMapping("/register") in AuthController
            await register({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });
            navigate('/login'); // Redirect to login after successful registration
        } catch (err) {
            console.error("Registration error", err);
            alert("Registration failed. Email might already be in use.");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-left">
                <h1>Create <br/> Connect <br/> Collaborate <br/> 
                <span className="accent-text">All in one space.</span></h1>
            </div>
            
            <div className="auth-card">
                <h2>Sign Up</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>User Name</label>
                        <input 
                            type="text" 
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            required 
                        />
                    </div>
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
                    <div className="input-group">
                        <label>Confirm Password</label>
                        <input 
                            type="password" 
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            required 
                        />
                    </div>
                    <button type="submit" className="auth-btn">Sign up</button>
                </form>
                <Link to="/login" className="auth-link">Already have an account? sign in instead</Link>
            </div>
        </div>
    );
};

export default Signup;