import React, { useState } from 'react';
import { Profile, userRoles, UserRole } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';
import { PlusIcon, PencilIcon } from './icons';
import { supabase, supabaseUrl } from '../lib/supabaseClient';

// Helper to convert snake_case object keys to camelCase from Supabase
const toCamelCase = <T extends {}>(obj: any): T => {
    if (!obj || typeof obj !== 'object') return obj as T;
    if (Array.isArray(obj)) return obj.map(toCamelCase) as any;

    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            newObj[camelKey] = toCamelCase(obj[key]);
        }
    }
    return newObj as T;
};


interface UsersProps {
    currentUser: Profile;
    allUsers: Profile[];
    setAllUsers: React.Dispatch<React.SetStateAction<Profile[]>>;
    edgeFunctionApiKey: string;
}

const initialAddUserState = {
    password: '',
    fullName: '',
    role: 'viewer' as UserRole,
    profileEmail: '',
};


const Users: React.FC<UsersProps> = ({ currentUser, allUsers, setAllUsers, edgeFunctionApiKey }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    
    const [addUserForm, setAddUserForm] = useState(initialAddUserState);
    const [editUserForm, setEditUserForm] = useState<Partial<Profile>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleAddFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAddUserForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setEditUserForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const refetchUsers = async () => {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) {
            alert('Could not refresh user list.');
        } else {
            setAllUsers(toCamelCase<Profile[]>(data || []));
        }
    };
    
    const handleAddUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!edgeFunctionApiKey) {
            alert('Error: The Edge Function API Key is not configured. Please ask an administrator to set it in the Settings page.');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
                method: 'POST',
                headers: {
                    'apikey': edgeFunctionApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: addUserForm.profileEmail,
                    password: addUserForm.password,
                    full_name: addUserForm.fullName,
                    role: addUserForm.role,
                    profile_email: addUserForm.profileEmail
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorJson;
                try {
                    errorJson = JSON.parse(errorText);
                } catch {
                    errorJson = { message: errorText || response.statusText };
                }
                throw new Error(errorJson.message || `An error occurred: ${response.statusText}`);
            }
            
            setIsAddModalOpen(false);
            setAddUserForm(initialAddUserState);
            alert('User created successfully!');
            await refetchUsers();

        } catch (error: any) {
             let detailedErrorMessage = `Error creating user: ${error.message}`;

            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                detailedErrorMessage = `A network error occurred, which is likely a CORS issue.

This must be fixed in your Supabase Edge Function's code. The function must:
1. Handle HTTP 'OPTIONS' requests (preflight requests).
2. Return an 'Access-Control-Allow-Origin' header (e.g., '*').
3. Return an 'Access-Control-Allow-Headers' header that includes 'apikey' and 'content-type'.

Please consult the Supabase documentation on CORS for Edge Functions.`;
                alert(detailedErrorMessage);
            } else {
                alert(detailedErrorMessage);
            }
            console.error("User creation error details:", error);
        }
        
        setIsSubmitting(false);
    };

    const handleOpenEditModal = (profile: Profile) => {
        setEditingProfile(profile);
        setEditUserForm(profile);
        setIsEditModalOpen(true);
    };

    const handleEditUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProfile) return;
        setIsSubmitting(true);
        
        const updates = {
            full_name: editUserForm.fullName,
            role: editUserForm.role,
            is_active: editUserForm.isActive,
        };

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', editingProfile.id)
            .select()
            .single();

        if (error) {
            alert(`Error updating user: ${error.message}`);
        } else if (data) {
            const updatedProfile = toCamelCase<Profile>(data);
            setAllUsers(prevUsers => prevUsers.map(u => u.id === updatedProfile.id ? {...u, ...updatedProfile} : u));
            setIsEditModalOpen(false);
            setEditingProfile(null);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Add User</span>
                </button>
            </div>

            <Card>
               <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Full Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(user => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{user.fullName}</th>
                                    <td className="px-6 py-4">{user.profileEmail || user.email || 'N/A'}</td>
                                    <td className="px-6 py-4 capitalize">{user.role.replace('_', ' ')}</td>
                                    <td className="px-6 py-4 text-center">
                                         <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleOpenEditModal(user)} 
                                            className="text-blue-500 hover:text-blue-700" 
                                            aria-label="Edit user"
                                            disabled={user.id === currentUser.id}
                                            title={user.id === currentUser.id ? "Cannot edit yourself" : "Edit User"}
                                        >
                                            <PencilIcon className={`w-5 h-5 ${user.id === currentUser.id ? 'text-gray-400' : ''}`} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add User Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New User">
                <form onSubmit={handleAddUserSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900">Full Name</label>
                        <input type="text" name="fullName" value={addUserForm.fullName} onChange={handleAddFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900">Email</label>
                        <input type="email" name="profileEmail" value={addUserForm.profileEmail} onChange={handleAddFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900">Password</label>
                        <input type="password" name="password" value={addUserForm.password} onChange={handleAddFormChange} required minLength={8} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-900">Role</label>
                        <select name="role" value={addUserForm.role} onChange={handleAddFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm capitalize">
                            {userRoles.map(role => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                            {isSubmitting ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit User Modal */}
            {editingProfile && (
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit User: ${editingProfile.fullName}`}>
                    <form onSubmit={handleEditUserSubmit} className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-900">Email (Read-only)</label>
                            <input type="email" value={editingProfile.profileEmail || editingProfile.email || ''} disabled className="mt-1 block w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900">Full Name</label>
                            <input type="text" name="fullName" value={editUserForm.fullName || ''} onChange={handleEditFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900">Role</label>
                            <select name="role" value={editUserForm.role || ''} onChange={handleEditFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm capitalize">
                                {userRoles.map(role => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" name="isActive" checked={editUserForm.isActive || false} onChange={handleEditFormChange} id="isActiveEdit" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <label htmlFor="isActiveEdit" className="ml-2 block text-sm text-gray-900">User is Active</label>
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Users;