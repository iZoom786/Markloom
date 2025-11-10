

import React, { useState, useMemo } from 'react';
import { InventoryItem, Material, Profile } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';
import { PencilIcon, AlertTriangleIcon, PlusIcon, Trash2Icon } from './icons';
import { supabase } from '../lib/supabaseClient';

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

interface InventoryProps {
    user: Profile;
    inventory: InventoryItem[];
    setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    materials: Material[];
}

const initialItemState: InventoryItem = {
    materialCode: '',
    quantityOnHand: 0,
    minStockLevel: 10,
    location: '',
    grn: '',
    poNumber: '',
};

const Inventory: React.FC<InventoryProps> = ({ user, inventory, setInventory, materials }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [itemInForm, setItemInForm] = useState<InventoryItem>(initialItemState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const materialsMap = useMemo(() => new Map(materials.map(m => [m.materialCode, m])), [materials]);
    const inventoryMap = useMemo(() => new Map(inventory.map(i => [i.materialCode, i])), [inventory]);

    const processedInventory = useMemo(() => {
        return inventory.filter(item => {
            const material = materialsMap.get(item.materialCode);
            const description = material?.description || '';
            return description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   item.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [inventory, searchTerm, materialsMap]);
    
    const availableMaterialsToAdd = useMemo(() => {
        return materials.filter(m => !inventoryMap.has(m.materialCode));
    }, [materials, inventoryMap]);

    const handleOpenAddModal = () => {
        setModalMode('add');
        setItemInForm(initialItemState);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item: InventoryItem) => {
        setModalMode('edit');
        setEditingItem(item);
        setItemInForm(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setItemInForm(initialItemState);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setItemInForm(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        if (modalMode === 'edit' && editingItem) {
            const itemToUpdate = {
                quantity_on_hand: itemInForm.quantityOnHand,
                min_stock_level: itemInForm.minStockLevel,
                location: itemInForm.location,
                grn: itemInForm.grn || null,
                po_number: itemInForm.poNumber || null,
            };

            const { error } = await supabase
                .from('inventory')
                .update(itemToUpdate)
                .eq('material_code', editingItem.materialCode);

            if (error) {
                alert(`Error updating inventory: ${error.message}`);
            } else {
                setInventory(prev => prev.map(item => item.materialCode === editingItem.materialCode ? itemInForm : item));
                handleCloseModal();
            }
        } else if (modalMode === 'add') {
             if (!itemInForm.materialCode) {
                 alert('Please select a material.');
                 setIsSubmitting(false);
                 return;
             }
             const itemToInsert = {
                 material_code: itemInForm.materialCode,
                 quantity_on_hand: itemInForm.quantityOnHand,
                 min_stock_level: itemInForm.minStockLevel,
                 location: itemInForm.location,
                 grn: itemInForm.grn || null,
                 po_number: itemInForm.poNumber || null,
             };
             const { data, error } = await supabase.from('inventory').insert(itemToInsert).select().single();
             if (error) {
                 alert(`Error adding item: ${error.message}`);
             } else if (data) {
                 setInventory(prev => [...prev, toCamelCase<InventoryItem>(data)]);
                 handleCloseModal();
             }
        }
        setIsSubmitting(false);
    };

    const handleDeleteItem = async (materialCode: string) => {
        if (!window.confirm(`Are you sure you want to delete the inventory record for ${materialCode}?`)) return;

        const { error } = await supabase.from('inventory').delete().eq('material_code', materialCode);
        if (error) {
            alert(`Error deleting inventory item: ${error.message}`);
        } else {
            setInventory(prev => prev.filter(item => item.materialCode !== materialCode));
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
                <button 
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Add Inventory Item</span>
                </button>
            </div>
            
            <Card>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by material code or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Material Code</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">GRN</th>
                                <th scope="col" className="px-6 py-3">PO Number</th>
                                <th scope="col" className="px-6 py-3 text-right">Qty On Hand</th>
                                <th scope="col" className="px-6 py-3 text-right">Min Stock</th>
                                <th scope="col" className="px-6 py-3">Location</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedInventory.map(item => {
                                const material = materialsMap.get(item.materialCode);
                                const isLowStock = item.quantityOnHand < item.minStockLevel;
                                return (
                                    <tr key={item.materialCode} className="bg-white border-b hover:bg-gray-50">
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {item.materialCode}
                                        </th>
                                        <td className="px-6 py-4">{material?.description || 'N/A'}</td>
                                        <td className="px-6 py-4">{item.grn || 'N/A'}</td>
                                        <td className="px-6 py-4">{item.poNumber || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right font-mono">{item.quantityOnHand} {material?.unitOfMeasure}</td>
                                        <td className="px-6 py-4 text-right font-mono">{item.minStockLevel}</td>
                                        <td className="px-6 py-4">{item.location}</td>
                                        <td className={`px-6 py-4 font-semibold ${isLowStock ? 'text-red-500' : 'text-green-500'}`}>
                                            <div className="flex items-center">
                                                {isLowStock ? 'Low Stock' : 'OK'}
                                                {/* FIX: The title attribute was not a valid prop for AlertTriangleIcon. Wrapped the icon in a span with a title to provide a tooltip. */}
                                                {isLowStock && <span title="Stock is below minimum level"><AlertTriangleIcon className="w-4 h-4 ml-2 text-red-500" /></span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-4">
                                                <button onClick={() => handleOpenEditModal(item)} className="text-blue-500 hover:text-blue-700" aria-label="Edit inventory item">
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                                 <button onClick={() => handleDeleteItem(item.materialCode)} className="text-red-500 hover:text-red-700" aria-label="Delete inventory item">
                                                    <Trash2Icon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'edit' ? `Edit Inventory: ${editingItem?.materialCode}` : 'Add New Inventory Item'}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Material</label>
                        {modalMode === 'add' ? (
                            <select name="materialCode" value={itemInForm.materialCode} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <option value="" disabled>Select a material</option>
                                {availableMaterialsToAdd.map(m => (
                                    <option key={m.materialCode} value={m.materialCode}>{m.materialCode} - {m.description}</option>
                                ))}
                            </select>
                        ) : (
                             <p className="mt-1 text-sm text-gray-900">{editingItem?.materialCode} - {materialsMap.get(editingItem?.materialCode || '')?.description}</p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity On Hand</label>
                            <input type="number" name="quantityOnHand" value={itemInForm.quantityOnHand} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Minimum Stock Level</label>
                            <input type="number" name="minStockLevel" value={itemInForm.minStockLevel} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input type="text" name="location" value={itemInForm.location} onChange={handleFormChange} required placeholder="e.g., Aisle 5, Bin 2" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">GRN Number (Optional)</label>
                            <input type="text" name="grn" value={itemInForm.grn || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">PO Number (Optional)</label>
                            <input type="text" name="poNumber" value={itemInForm.poNumber || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                           {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Inventory;
