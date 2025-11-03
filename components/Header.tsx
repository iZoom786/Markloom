import React from 'react';
import { User } from '../types';
import { LogOutIcon } from './icons';

interface HeaderProps {
    user: User;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-end items-center z-10 shrink-0">
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Logout"
                >
                    <LogOutIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};

export default Header;
