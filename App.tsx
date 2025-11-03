import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth, { AuthDetails, SignUpDetails } from './components/Auth';
import MainApp from './components/MainApp';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session?.user) {
            const user: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || 'User',
            };
            setCurrentUser(user);
        } else {
            setCurrentUser(null);
        }
    }, [session]);


    const handleLogin = async (details: AuthDetails) => {
        setAuthError('');
        const { error } = await supabase.auth.signInWithPassword({
            email: details.email,
            password: details.password,
        });
        if (error) setAuthError(error.message);
    };

    const handleSignUp = async (details: SignUpDetails) => {
        setAuthError('');
        const { error } = await supabase.auth.signUp({
            email: details.email,
            password: details.password,
            options: {
                data: {
                    name: details.name,
                },
            },
        });
        if (error) setAuthError(error.message);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };
    
    if (loading) {
        return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center"><p className="text-white">Loading...</p></div>;
    }

    if (!currentUser) {
        return <Auth onLogin={handleLogin} onSignUp={handleSignUp} error={authError} />;
    }

    return <MainApp user={currentUser} onLogout={handleLogout} />;
};

export default App;
