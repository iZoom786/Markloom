import React, { useMemo, useState } from 'react';
import { PurchaseOrder, POItem, Material, POStatus, User } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';
import { PlusIcon, Trash2Icon, PencilIcon } from './icons';
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

interface PurchaseOrdersProps {
    user: User;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    poItems: POItem[];
    setPoItems: React.Dispatch<React.SetStateAction<POItem[]>>;
    materials: Material[];
    defaultCurrency: string;
}

const initialPOState: Omit<PurchaseOrder, 'poNumber'> = {
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0], // Default to today
    deliveryDate: '',
    status: POStatus.Draft,
};

const initialNewItemState = {
    materialCode: '',
    quantityOrdered: 1,
    unitPrice: 0,
};

const getStatusChip = (status: POStatus) => {
    const styles = {
        [POStatus.Ordered]: "text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
        [POStatus.Delivered]: "text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300",
        [POStatus.Draft]: "text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-300",
        [POStatus.Cancelled]: "text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-300",
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ user, purchaseOrders, setPurchaseOrders, poItems, setPoItems, materials, defaultCurrency }) => {
    const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
    const [poInForm, setPoInForm] = useState<Omit<PurchaseOrder, 'poNumber'>>(initialPOState);
    
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [newItem, setNewItem] = useState(initialNewItemState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const materialsMap = useMemo(() => new Map(materials.map(m => [m.materialCode, m])), [materials]);

    const poTotals = useMemo(() => {
        const totals = new Map<string, number>();
        poItems.forEach(item => {
            const currentTotal = totals.get(item.poNumber) || 0;
            const lineTotal = item.quantityOrdered * item.unitPrice;
            totals.set(item.poNumber, currentTotal + lineTotal);
        });
        return totals;
    }, [poItems]);
    
    const suppliers = useMemo(() => {
        const supplierSet = new Set(materials.map(m => m.supplier));
        return Array.from(supplierSet).sort();
    }, [materials]);

    const handleOpenCreateModal = () => {
        setEditingPO(null);
        setPoInForm(initialPOState);
        setIsHeaderModalOpen(true);
    };

    const handleOpenEditModal = (po: PurchaseOrder) => {
        setEditingPO(po);
        setPoInForm(po);
        setIsHeaderModalOpen(true);
    };
    
    const handleCloseHeaderModal = () => {
        setEditingPO(null);
        setIsHeaderModalOpen(false);
    };

    const handleHeaderFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPoInForm(prev => ({ ...prev, [name]: value }));
    };

    const handleHeaderFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!poInForm.supplierId || !poInForm.deliveryDate) {
            alert('Please select a supplier and a delivery date.');
            return;
        }
        setIsSubmitting(true);

        if (editingPO) {
            // Update logic
            const { data, error } = await supabase
                .from('purchase_orders')
                .update(toSnakeCase(poInForm))
                .eq('po_number', editingPO.poNumber)
                .select()
                .single();

            if (error) {
                alert(`Error updating PO: ${error.message}`);
            } else if (data) {
                const updatedPO = toCamelCase<PurchaseOrder>(data);
                setPurchaseOrders(prev => prev.map(p => p.poNumber === updatedPO.poNumber ? updatedPO : p));
                handleCloseHeaderModal();
            }
        } else {
            // Create logic
            const poNumber = `PO-${Date.now()}`;
            const poToInsert = {
                po_number: poNumber,
                supplier_id: poInForm.supplierId,
                order_date: poInForm.orderDate,
                delivery_date: poInForm.deliveryDate,
                status: poInForm.status,
            };

            const { data, error } = await supabase
                .from('purchase_orders')
                .insert(poToInsert)
                .select()
                .single();
                
            if (error) {
                alert(`Error creating PO: ${error.message}`);
            } else if (data) {
                const createdPO = toCamelCase<PurchaseOrder>(data);
                setPurchaseOrders(prev => [...prev, createdPO].sort((a, b) => a.poNumber.localeCompare(b.poNumber)));
                handleCloseHeaderModal();
            }
        }
        setIsSubmitting(false);
    };

    const handleDeletePO = async (poNumber: string) => {
        if (!window.confirm(`Are you sure you want to delete Purchase Order ${poNumber}? All associated items will also be deleted.`)) {
            return;
        }
        
        // Assuming RLS/cascade delete handles po_items
        const { error } = await supabase.from('purchase_orders').delete().eq('po_number', poNumber);
        
        if (error) {
            alert(`Error deleting PO: ${error.message}`);
        } else {
            setPurchaseOrders(prev => prev.filter(p => p.poNumber !== poNumber));
            setPoItems(prev => prev.filter(item => item.poNumber !== poNumber));
        }
    };

    const handleOpenDetailModal = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setSelectedPO(null);
        setIsDetailModalOpen(false);
        setNewItem(initialNewItemState);
    };

    const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumeric = type === 'number';

        setNewItem(prev => {
            const updated = { ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value };
            if (name === 'materialCode') {
                const material = materialsMap.get(value);
                if (material) updated.unitPrice = material.costPerUnit;
            }
            return updated;
        });
    };

    const handleAddItemToPO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPO || !newItem.materialCode || newItem.quantityOrdered <= 0) {
            alert("Please select a material and enter a valid quantity.");
            return;
        }
        setIsSubmitting(true);

        const itemToInsert = { po_number: selectedPO.poNumber, material_code: newItem.materialCode, quantity_ordered: newItem.quantityOrdered, unit_price: newItem.unitPrice };
        const { data, error } = await supabase.from('po_items').insert(itemToInsert).select().single();
        
        if (error) {
            alert(`Error adding item: ${error.message}`);
        } else if (data) {
            const addedItem = toCamelCase<POItem>(data);
            setPoItems(prev => [...prev, addedItem]);
            setNewItem(initialNewItemState);
        }
        setIsSubmitting(false);
    };

    const handleDeleteItem = async (poItemId: number) => {
        if (!window.confirm("Are you sure you want to remove this item?")) return;
        const { error } = await supabase.from('po_items').delete().eq('po_item_id', poItemId);
        if (error) alert(`Error deleting item: ${error.message}`);
        else setPoItems(prev => prev.filter(item => item.poItemId !== poItemId));
    };
    
    const selectedPOItems = useMemo(() => poItems.filter(item => item.poNumber === selectedPO?.poNumber), [poItems, selectedPO]);
    const materialsForSupplier = useMemo(() => {
        if (!selectedPO) return [];
        const existingItemCodes = new Set(selectedPOItems.map(item => item.materialCode));
        return materials.filter(m => m.supplier === selectedPO.supplierId && !existingItemCodes.has(m.materialCode));
    }, [materials, selectedPO, selectedPOItems]);
    const selectedPOTotal = poTotals.get(selectedPO?.poNumber || '') || 0;

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
                                <th scope="col" className="px-6 py-3">Delivery Date</th>
                                <th scope="col" className="px-6 py-3 text-right">Total</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.map(po => (
                                <tr key={po.poNumber} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" onClick={() => handleOpenDetailModal(po)} className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap hover:underline cursor-pointer">
                                        {po.poNumber}
                                    </th>
                                    <td className="px-6 py-4">{po.supplierId}</td>
                                    <td className="px-6 py-4">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right font-mono">{defaultCurrency} {(poTotals.get(po.poNumber) || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">{getStatusChip(po.status)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleOpenEditModal(po)} className="text-blue-500 hover:text-blue-700" aria-label="Edit PO">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeletePO(po.poNumber)} className="text-red-500 hover:text-red-700" aria-label="Delete PO">
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

            <Modal isOpen={isHeaderModalOpen} onClose={handleCloseHeaderModal} title={editingPO ? `Edit PO ${editingPO.poNumber}` : "Create New Purchase Order"}>
                <form onSubmit={handleHeaderFormSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                        <select name="supplierId" value={poInForm.supplierId} onChange={handleHeaderFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            <option value="" disabled>Select a supplier</option>
                            {suppliers.map(supplier => <option key={supplier} value={supplier}>{supplier}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Date</label>
                            <input type="date" name="orderDate" value={poInForm.orderDate.split('T')[0]} onChange={handleHeaderFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Delivery Date</label>
                            <input type="date" name="deliveryDate" value={poInForm.deliveryDate.split('T')[0]} onChange={handleHeaderFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select name="status" value={poInForm.status} onChange={handleHeaderFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            {Object.values(POStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseHeaderModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                           {isSubmitting ? 'Saving...' : (editingPO ? 'Save Changes' : 'Create PO')}
                        </button>
                    </div>
                </form>
            </Modal>

            {selectedPO && (
                <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title={`Details for ${selectedPO.poNumber}`} size="xl">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Order Items</h3>
                            <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-2">Material</th>
                                            <th className="px-4 py-2 text-right">Quantity</th>
                                            <th className="px-4 py-2 text-right">Unit Price</th>
                                            <th className="px-4 py-2 text-right">Line Total</th>
                                            <th className="px-4 py-2 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPOItems.map(item => {
                                            const material = materialsMap.get(item.materialCode);
                                            return (
                                                <tr key={item.poItemId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                    <td className="px-4 py-2 font-medium">{material?.description || item.materialCode}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{item.quantityOrdered}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{defaultCurrency} {item.unitPrice.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{defaultCurrency} {(item.quantityOrdered * item.unitPrice).toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button onClick={() => handleDeleteItem(item.poItemId)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-2 font-bold text-right">Total</td>
                                            <td className="px-4 py-2 font-bold text-right font-mono">{defaultCurrency} {selectedPOTotal.toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div>
                             <h3 className="text-lg font-semibold mb-2">Add New Item</h3>
                             <form onSubmit={handleAddItemToPO} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg md:flex md:items-end md:gap-4 space-y-4 md:space-y-0">
                                <div className="flex-grow">
                                    <label className="block text-xs font-medium mb-1">Material</label>
                                    <select name="materialCode" value={newItem.materialCode} onChange={handleNewItemChange} required className="w-full p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md text-sm">
                                        <option value="" disabled>Select material</option>
                                        {materialsForSupplier.map(m => <option key={m.materialCode} value={m.materialCode}>{m.description}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Quantity</label>
                                    <input type="number" name="quantityOrdered" value={newItem.quantityOrdered} onChange={handleNewItemChange} min="1" required className="w-full p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Unit Price ({defaultCurrency})</label>
                                    <input type="number" name="unitPrice" value={newItem.unitPrice} onChange={handleNewItemChange} step="0.01" min="0" required className="w-full p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md text-sm" />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto flex items-center justify-center px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                                    <PlusIcon className="w-5 h-5 mr-1" />
                                    {isSubmitting ? 'Adding...' : 'Add Item'}
                                </button>
                             </form>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default PurchaseOrders;