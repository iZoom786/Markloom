import React, { useState } from 'react';
import { Style, Profile } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';
import { PlusIcon, PencilIcon, Trash2Icon } from './icons';
import { supabase } from '../lib/supabaseClient';

// Helper to convert camelCase object keys to snake_case for Supabase
const toSnakeCase = (obj: Record<string, any>) => {
    const newObj: Record<string, any> = {};
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            newObj[snakeKey] = obj[key];
        }
    }
    return newObj;
};

// Helper to convert snake_case object keys to camelCase from Supabase
const toCamelCase = <T extends {}>(obj: any): T => {
    const newObj: any = {};
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newObj[camelKey] = obj[key];
        }
    }
    return newObj as T;
};


interface StylesProps {
    user: Profile;
    styles: Style[];
    setStyles: React.Dispatch<React.SetStateAction<Style[]>>;
    defaultCurrency: string;
}

const initialStyleState: Style = {
    styleCode: '',
    description: '',
    imageUrl: 'https://placehold.co/600x400/gray/white?text=Style',
    productCategory: '',
    brand: '',
    season: '',
    targetCostPrice: 0,
};

const Styles: React.FC<StylesProps> = ({ user, styles, setStyles, defaultCurrency }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStyle, setEditingStyle] = useState<Style | null>(null);
    const [styleInForm, setStyleInForm] = useState<Style>(initialStyleState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenAddModal = () => {
        setEditingStyle(null);
        setStyleInForm(initialStyleState);
        setIsModalOpen(true);
    };
    
    const handleOpenEditModal = (style: Style) => {
        setEditingStyle(style);
        setStyleInForm(style);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStyle(null);
        setStyleInForm(initialStyleState);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setStyleInForm(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (editingStyle) {
            // Update logic
            const { error } = await supabase
                .from('styles')
                .update(toSnakeCase(styleInForm))
                .eq('style_code', editingStyle.styleCode);

            if (error) {
                alert(`Error updating style: ${error.message}`);
            } else {
                setStyles(prev => prev.map(s => s.styleCode === editingStyle.styleCode ? styleInForm : s));
                handleCloseModal();
            }
        } else {
            // Create logic
            const { data, error } = await supabase
                .from('styles')
                .insert(toSnakeCase(styleInForm))
                .select()
                .single();

            if (error) {
                alert(`Error adding style: ${error.message}`);
            } else if (data) {
                const addedStyle = toCamelCase<Style>(data);
                setStyles(prev => [...prev, addedStyle]);
                handleCloseModal();
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteStyle = async (styleCode: string) => {
        if (!window.confirm(`Are you sure you want to delete style ${styleCode}? This may affect related SKUs and BOMs.`)) {
            return;
        }

        const { error } = await supabase.from('styles').delete().eq('style_code', styleCode);

        if (error) {
            alert(`Error deleting style: ${error.message}`);
        } else {
            setStyles(prev => prev.filter(s => s.styleCode !== styleCode));
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Styles Management</h1>
                <button 
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Add Style</span>
                </button>
            </div>
            
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Style Code</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">Brand</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3 text-right">Target Cost</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {styles.map(style => (
                                <tr key={style.styleCode} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{style.styleCode}</th>
                                    <td className="px-6 py-4">{style.description}</td>
                                    <td className="px-6 py-4">{style.brand}</td>
                                    <td className="px-6 py-4">{style.productCategory}</td>
                                    <td className="px-6 py-4 text-right font-mono">{defaultCurrency} {style.targetCostPrice.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleOpenEditModal(style)} className="text-blue-500 hover:text-blue-700" aria-label="Edit style">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteStyle(style.styleCode)} className="text-red-500 hover:text-red-700" aria-label="Delete style">
                                                <Trash2Icon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStyle ? `Edit Style: ${editingStyle.styleCode}` : "Add New Style"} size="lg" closeOnBackdropClick={false}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Style Code</label>
                        <input type="text" name="styleCode" value={styleInForm.styleCode} onChange={handleFormChange} required disabled={!!editingStyle} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" value={styleInForm.description} onChange={handleFormChange} required rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Image URL</label>
                        <input type="text" name="imageUrl" value={styleInForm.imageUrl} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Brand</label>
                            <input type="text" name="brand" value={styleInForm.brand} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Product Category</label>
                            <input type="text" name="productCategory" value={styleInForm.productCategory} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Season</label>
                            <input type="text" name="season" value={styleInForm.season} onChange={handleFormChange} placeholder="e.g., SS25" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Target Cost Price ({defaultCurrency})</label>
                            <input type="number" name="targetCostPrice" value={styleInForm.targetCostPrice} onChange={handleFormChange} required step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                           {isSubmitting ? 'Saving...' : (editingStyle ? 'Save Changes' : 'Save Style')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Styles;
