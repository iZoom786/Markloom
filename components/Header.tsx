import React from 'react';
import { Profile } from '../types';
import { LogOutIcon } from './icons';

interface HeaderProps {
    user: Profile;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    const displayName = user.fullName;
    return (
        <header className="bg-white shadow-sm p-4 flex justify-end items-center z-10 shrink-0">
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="font-semibold text-sm">{displayName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center p-2 rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Logout"
                >
                    <LogOutIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};

export default Header;
