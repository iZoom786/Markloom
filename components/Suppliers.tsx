
import React, { useState } from 'react';
import { Supplier, User } from '../types';
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

interface SuppliersProps {
    user: User;
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}

const initialSupplierState: Omit<Supplier, 'id'> = {
    supplierName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
};

const Suppliers: React.FC<SuppliersProps> = ({ user, suppliers, setSuppliers }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [supplierInForm, setSupplierInForm] = useState<Omit<Supplier, 'id'>>(initialSupplierState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenAddModal = () => {
        setEditingSupplier(null);
        setSupplierInForm(initialSupplierState);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setSupplierInForm(supplier);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
        setSupplierInForm(initialSupplierState);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSupplierInForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (editingSupplier) {
            // Update logic
            const { error } = await supabase
                .from('suppliers')
                .update(toSnakeCase(supplierInForm))
                .eq('id', editingSupplier.id);

            if (error) {
                alert(`Error updating supplier: ${error.message}`);
            } else {
                setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...supplierInForm, id: editingSupplier.id } : s));
                handleCloseModal();
            }
        } else {
            // Create logic
            const { data, error } = await supabase
                .from('suppliers')
                .insert(toSnakeCase(supplierInForm))
                .select()
                .single();

            if (error) {
                alert(`Error adding supplier: ${error.message}`);
            } else if (data) {
                setSuppliers(prev => [...prev, toCamelCase<Supplier>(data)]);
                handleCloseModal();
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        if (!window.confirm(`Are you sure you want to delete this supplier? This may affect purchase orders.`)) {
            return;
        }

        const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);

        if (error) {
            alert(`Error deleting supplier: ${error.message}`);
        } else {
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Suppliers Management</h1>
                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Add Supplier</span>
                </button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Supplier Name</th>
                                <th scope="col" className="px-6 py-3">Contact Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Phone</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(supplier => (
                                <tr key={supplier.id} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{supplier.supplierName}</th>
                                    <td className="px-6 py-4">{supplier.contactName}</td>
                                    <td className="px-6 py-4">{supplier.email}</td>
                                    <td className="px-6 py-4">{supplier.phone}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleOpenEditModal(supplier)} className="text-blue-500 hover:text-blue-700" aria-label="Edit supplier">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteSupplier(supplier.id)} className="text-red-500 hover:text-red-700" aria-label="Delete supplier">
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

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSupplier ? `Edit Supplier: ${editingSupplier.supplierName}` : "Add New Supplier"} size="lg">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                        <input type="text" name="supplierName" value={supplierInForm.supplierName} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                        <input type="text" name="contactName" value={supplierInForm.contactName || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" name="email" value={supplierInForm.email || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input type="text" name="phone" value={supplierInForm.phone || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea name="address" value={supplierInForm.address || ''} onChange={handleFormChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                            {isSubmitting ? 'Saving...' : (editingSupplier ? 'Save Changes' : 'Save Supplier')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Suppliers;