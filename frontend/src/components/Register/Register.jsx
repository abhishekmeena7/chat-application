
import { useState } from 'react';
import './Register.css';

const Register = ({ onRegister }) => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		if (!username.trim() || !password.trim()) {
			setError('Please fill in all fields');
			setLoading(false);
			return;
		}

		// Username must contain at least one letter (disallow numbers-only)
		const trimmedUsername = username.trim();
		if (!/[A-Za-z]/.test(trimmedUsername)) {
			setError('Username must contain letters (not numbers only)');
			setLoading(false);
			return;
		}

		try {
			const response = await fetch(`${API_URL}/api/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Something went wrong');
				setLoading(false);
				return;
			}

			// Store user data in localStorage
			localStorage.setItem('user', JSON.stringify(data.user));
			onRegister(data.user);
		} catch (err) {
			setError('Failed to connect to server');
		}
		setLoading(false);
	};

	return (
		<div className="register-container">
			<div className="register-box">
				<div className="register-header">
					<h1>Register</h1>
					<p>Create your account</p>
				</div>
				<form onSubmit={handleSubmit} className="register-form">
					<div className="form-group">
						<label htmlFor="username">Username</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="Enter your username"
							aria-invalid={!!error}
							aria-describedby="username-help"
							disabled={loading}
						/>
						<small id="username-help" className="input-help">Username should include letters; numbers-only are not allowed.</small>
					</div>
					<div className="form-group">
						<label htmlFor="password">Password</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Enter your password"
							disabled={loading}
						/>
					</div>
					{error && <div className="error-message">{error}</div>}
					<button type="submit" className="submit-btn" disabled={loading}>
						{loading ? 'Please wait...' : 'Register'}
					</button>
				</form>
			</div>
		</div>
	);
};

export default Register;
