import React, { useState, useEffect } from 'react';
import { Profile } from './types';
import Auth, { AuthDetails } from './components/Auth';
import MainApp from './components/MainApp';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

// Helper to convert snake_case object keys to camelCase from Supabase
const toCamelCase = <T extends {}>(obj: any): T => {
    if (!obj || typeof obj !== 'object') return obj as T;
    const newObj: any = {};
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newObj[camelKey] = obj[key];
        }
    }
    return newObj as T;
};


const AppContent: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [authError, setAuthError] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        const fetchProfile = async (userId: string, attempts = 2): Promise<Profile | null> => {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (error) {
                if (error.code === 'PGRST116' && attempts > 1) { // "PGRST116" is for "0 rows found"
                    // Wait and retry for new users
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return fetchProfile(userId, attempts - 1);
                }
                
                // Definitive fix for the [object Object] error. This will log the full error.
                console.error("Profile fetch error:", JSON.stringify(error, null, 2));
                setAuthError(`Your user profile could not be loaded: ${error.message}. Please check console for details.`);
                return null;
            }
            return toCamelCase<Profile>(data);
        };

        const setupUser = async (session: Session | null) => {
            if (session?.user) {
                const profile = await fetchProfile(session.user.id);
                if (profile) {
                    if (!profile.isActive) {
                        setAuthError('Your account is inactive. Please contact an administrator.');
                        await supabase.auth.signOut();
                        setCurrentUser(null);
                    } else {
                        setCurrentUser({ ...profile, email: session.user.email || '' });
                        setAuthError('');
                    }
                } else {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            setupUser(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user.id !== currentUser?.id) {
                setLoading(true);
                setupUser(session);
            }
        });

        return () => subscription.unsubscribe();
    }, [currentUser?.id]);


    const handleLogin = async (details: AuthDetails) => {
        setAuthError('');
        const { error } = await supabase.auth.signInWithPassword({
            email: details.email,
            password: details.password,
        });
        if (error) setAuthError(error.message);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
    };
    
    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex justify-center items-center"><p className="text-gray-900">Loading...</p></div>;
    }

    if (!currentUser) {
        return <Auth onLogin={handleLogin} error={authError} />;
    }

    return <MainApp user={currentUser} onLogout={handleLogout} />;
};


const App: React.FC = () => {
    return (
        <AppContent />
    );
};


export default App;