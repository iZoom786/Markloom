
import React, { useState } from 'react';
import Card from './common/Card';

export interface AuthDetails {
    email: string;
    password: string;
}

interface AuthProps {
    onLogin: (details: AuthDetails) => void;
    error: string;
}

const Auth: React.FC<AuthProps> = ({ onLogin, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin({ email, password });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Marklooms ERP</h1>
            <p className="text-gray-600 mb-6">Please sign in to continue</p>
            <Card className="w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
                    Sign In
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        Sign In
                    </button>
                </form>
            </Card>
        </div>
    );
};

export default Auth;