
import React, { useState, useMemo } from 'react';
import { PurchaseOrder, POStatus, PurchaseOrderItem, Material, User, Supplier, SettingItem } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';
import { PlusIcon, PencilIcon, Trash2Icon, EyeIcon } from './icons';
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

interface PurchaseOrdersProps {
    user: User;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    materials: Material[];
    suppliers: Supplier[];
    poStatuses: SettingItem[];
    defaultCurrency: string;
}

const initialPOState: Omit<PurchaseOrder, 'poNumber'> = {
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    status: POStatus.Draft,
    notes: '',
};

const getStatusChip = (status: POStatus) => {
    const styles = {
        [POStatus.Draft]: "text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-300",
        [POStatus.Ordered]: "text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
        [POStatus.Shipped]: "text-purple-800 bg-purple-100 dark:bg-purple-900 dark:text-purple-300",
        [POStatus.Received]: "text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300",
        [POStatus.Cancelled]: "text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300",
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ user, purchaseOrders, setPurchaseOrders, materials, suppliers, poStatuses, defaultCurrency }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
    const [poInForm, setPoInForm] = useState(initialPOState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const materialsMap = useMemo(() => new Map(materials.map(m => [m.materialCode, m])), [materials]);
    const suppliersMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers]);

    const handleOpenEditModal = (po: PurchaseOrder) => {
        setEditingPO(po);
        setPoInForm(po);
        setIsCreateModalOpen(true);
    };

    const handleOpenCreateModal = () => {
        setEditingPO(null);
        const defaultStatus = poStatuses.length > 0 ? poStatuses[0].value as POStatus : POStatus.Draft;
        const defaultSupplier = suppliers.length > 0 ? suppliers[0].id : '';
        setPoInForm({ ...initialPOState, status: defaultStatus, supplierId: defaultSupplier });
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingPO(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setPoInForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (editingPO) {
            // Update logic
            const poDataForUpdate = {
                supplier_id: poInForm.supplierId,
                order_date: poInForm.orderDate,
                delivery_date: poInForm.deliveryDate,
                status: poInForm.status,
                notes: poInForm.notes,
            };
            const { error } = await supabase
                .from('purchase_orders')
                .update(poDataForUpdate)
                .eq('po_number', editingPO.poNumber);

            if (error) {
                alert(`Error updating PO: ${error.message}`);
            } else {
                setPurchaseOrders(prev => prev.map(p => p.poNumber === editingPO.poNumber ? { ...editingPO, ...poInForm } : p));
                handleCloseModal();
            }
        } else {
            // Create logic
            const poNumber = `PO-${Date.now()}`;
            const poToInsert = { ...poInForm, poNumber };
            const { data, error } = await supabase
                .from('purchase_orders')
                .insert(toSnakeCase(poToInsert))
                .select()
                .single();

            if (error) {
                alert(`Error creating PO: ${error.message}`);
            } else if (data) {
                setPurchaseOrders(prev => [...prev, toCamelCase<PurchaseOrder>(data)]);
                handleCloseModal();
            }
        }

        setIsSubmitting(false);
    };

    const handleDeletePO = async (poNumber: string) => {
        if (!window.confirm(`Are you sure you want to delete PO ${poNumber}?`)) return;

        const { error } = await supabase.from('purchase_orders').delete().eq('po_number', poNumber);
        if (error) {
            alert(`Error deleting PO: ${error.message}`);
        } else {
            setPurchaseOrders(prev => prev.filter(p => p.poNumber !== poNumber));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Create PO</span>
                </button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">PO Number</th>
                                <th scope="col" className="px-6 py-3">Supplier</th>
                                <th scope="col" className="px-6 py-3">Order Date</th>
                                <th scope="col" className="px-6 py-3">Delivery Date</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.map(po => (
                                <tr key={po.poNumber} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{po.poNumber}</th>
                                    <td className="px-6 py-4">{suppliersMap.get(po.supplierId)?.supplierName || po.supplierId}</td>
                                    <td className="px-6 py-4">{new Date(po.orderDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">{getStatusChip(po.status)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleOpenEditModal(po)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDeletePO(po.poNumber)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isCreateModalOpen} onClose={handleCloseModal} title={editingPO ? `Edit PO: ${editingPO.poNumber}` : "Create New Purchase Order"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                        <select
                            name="supplierId"
                            value={poInForm.supplierId}
                            onChange={handleFormChange}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="" disabled>Select a supplier</option>
                            {suppliers.map(supplier => (
                                <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Date</label>
                            <input type="date" name="orderDate" value={poInForm.orderDate} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Delivery Date</label>
                            <input type="date" name="deliveryDate" value={poInForm.deliveryDate} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select name="status" value={poInForm.status} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            {poStatuses.map(s => <option key={s.id} value={s.value}>{s.value}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                        <textarea name="notes" value={poInForm.notes || ''} onChange={handleFormChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    {/* A full PO item editor would go here. For simplicity, we are managing only the PO header. */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                            {isSubmitting ? 'Saving...' : (editingPO ? 'Save Changes' : 'Create PO')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PurchaseOrders;