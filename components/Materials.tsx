import React, { useState } from 'react';
import { Material, User, SettingItem } from '../types';
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


interface MaterialsProps {
    user: User;
    materials: Material[];
    setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
    settings: {
        materialTypes: SettingItem[];
        unitsOfMeasure: SettingItem[];
    };
    defaultCurrency: string;
}

const initialMaterialState: Omit<Material, 'materialCode'> = {
    description: '',
    category: '',
    unitOfMeasure: '',
    costPerUnit: 0,
    minOrderQuantity: 1,
};

const Materials: React.FC<MaterialsProps> = ({ user, materials, setMaterials, settings, defaultCurrency }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [materialInForm, setMaterialInForm] = useState<Omit<Material, 'materialCode'>>(initialMaterialState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenAddModal = () => {
        setEditingMaterial(null);
        const defaultState = {
            ...initialMaterialState,
            category: settings.materialTypes?.[0]?.value || '',
            unitOfMeasure: settings.unitsOfMeasure?.[0]?.value || '',
        };
        setMaterialInForm(defaultState);
        setIsModalOpen(true);
    };
    
    const handleOpenEditModal = (material: Material) => {
        setEditingMaterial(material);
        setMaterialInForm(material);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingMaterial(null);
        setMaterialInForm(initialMaterialState);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setMaterialInForm(prev => ({
            ...prev,
            [name]: (e.target as HTMLInputElement).type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (editingMaterial) {
            // Update logic
            const { error } = await supabase
                .from('materials')
                .update(toSnakeCase(materialInForm))
                .eq('material_code', editingMaterial.materialCode);

            if (error) {
                alert(`Error updating material: ${error.message}`);
            } else {
                setMaterials(prev => prev.map(m => m.materialCode === editingMaterial.materialCode ? ({...materialInForm, materialCode: editingMaterial.materialCode}) : m));
                handleCloseModal();
            }
        } else {
            // Create logic
            const materialToInsert = {
                ...materialInForm,
                material_code: `MAT-${Date.now()}` // Generate a simple unique code
            };

            const { data, error } = await supabase
                .from('materials')
                .insert(toSnakeCase(materialToInsert))
                .select()
                .single();

            if (error) {
                alert(`Error adding material: ${error.message}`);
            } else if (data) {
                const addedMaterial = toCamelCase<Material>(data);
                setMaterials(prev => [...prev, addedMaterial]);
                handleCloseModal();
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteMaterial = async (materialCode: string) => {
        if (!window.confirm(`Are you sure you want to delete material ${materialCode}? This may affect BOMs and inventory.`)) {
            return;
        }

        const { error } = await supabase.from('materials').delete().eq('material_code', materialCode);

        if (error) {
            alert(`Error deleting material: ${error.message}`);
        } else {
            setMaterials(prev => prev.filter(m => m.materialCode !== materialCode));
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Materials Management</h1>
                <button 
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Add Material</span>
                </button>
            </div>
            
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Material Code</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3 text-right">Cost Per Unit</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map(material => (
                                <tr key={material.materialCode} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{material.materialCode}</th>
                                    <td className="px-6 py-4">{material.description}</td>
                                    <td className="px-6 py-4">{material.category}</td>
                                    <td className="px-6 py-4 text-right font-mono">{defaultCurrency} {material.costPerUnit.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleOpenEditModal(material)} className="text-blue-500 hover:text-blue-700" aria-label="Edit material">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteMaterial(material.materialCode)} className="text-red-500 hover:text-red-700" aria-label="Delete material">
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

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMaterial ? `Edit Material: ${editingMaterial.materialCode}` : "Add New Material"} size="lg">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {editingMaterial && 
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Material Code</label>
                            <input type="text" value={editingMaterial.materialCode} disabled className="mt-1 block w-full px-3 py-2 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm" />
                        </div>
                    }
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea name="description" value={materialInForm.description} onChange={handleFormChange} required rows={2} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                        <select name="category" value={materialInForm.category} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            <option value="" disabled>Select category</option>
                            {(settings.materialTypes || []).map(type => <option key={type.id} value={type.value}>{type.value}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost Per Unit ({defaultCurrency})</label>
                            <input type="number" name="costPerUnit" value={materialInForm.costPerUnit} onChange={handleFormChange} required step="0.01" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit of Measure</label>
                             <select name="unitOfMeasure" value={materialInForm.unitOfMeasure} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <option value="" disabled>Select unit</option>
                                {(settings.unitsOfMeasure || []).map(uom => <option key={uom.id} value={uom.value}>{uom.value}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Min. Order Qty</label>
                            <input type="number" name="minOrderQuantity" value={materialInForm.minOrderQuantity} onChange={handleFormChange} required step="1" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                           {isSubmitting ? 'Saving...' : (editingMaterial ? 'Save Changes' : 'Save Material')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Materials;