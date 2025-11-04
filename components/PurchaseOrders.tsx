import React, { useState, useMemo, useEffect } from 'react';
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

interface POItemsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    po: PurchaseOrder;
    poItems: PurchaseOrderItem[];
    setPoItems: React.Dispatch<React.SetStateAction<PurchaseOrderItem[]>>;
    materials: Material[];
    defaultCurrency: string;
}

const POItemsManagerModal: React.FC<POItemsManagerModalProps> = ({ isOpen, onClose, po, poItems, setPoItems, materials, defaultCurrency }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newItem, setNewItem] = useState({ materialCode: '', quantity: 1, unitCost: 0 });

    const materialsMap = useMemo(() => new Map(materials.map(m => [m.materialCode, m])), [materials]);

    const itemsForThisPO = useMemo(() => poItems.filter(item => item.poNumber === po.poNumber), [poItems, po.poNumber]);
    
    const availableMaterials = useMemo(() => {
        const usedMaterialCodes = new Set(itemsForThisPO.map(item => item.materialCode));
        return materials.filter(m => !usedMaterialCodes.has(m.materialCode));
    }, [materials, itemsForThisPO]);


    const handleNewItemChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        let updatedValue: string | number = value;
        if (name === 'quantity' || name === 'unitCost') {
            updatedValue = parseFloat(value) || 0;
        }

        const updatedItem = { ...newItem, [name]: updatedValue };

        if (name === 'materialCode') {
            const material = materialsMap.get(value);
            if (material) {
                updatedItem.unitCost = material.costPerUnit;
            }
        }
        
        setNewItem(updatedItem);
    };
    
    useEffect(() => {
        // Pre-select first available material and its price
        if (availableMaterials.length > 0) {
            const firstMaterial = availableMaterials[0];
            setNewItem({
                materialCode: firstMaterial.materialCode,
                quantity: 1,
                unitCost: firstMaterial.costPerUnit
            });
        } else {
            setNewItem({ materialCode: '', quantity: 1, unitCost: 0 });
        }
    }, [availableMaterials]);


    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.materialCode || newItem.quantity <= 0) {
            alert('Please select a material and enter a valid quantity.');
            return;
        }
        setIsSubmitting(true);
        
        const itemToInsert = {
            po_number: po.poNumber,
            material_code: newItem.materialCode,
            quantity_ordered: newItem.quantity,
            unit_price: newItem.unitCost
        };

        const { data, error } = await supabase.from('po_items').insert(itemToInsert).select().single();
        
        if (error) {
            alert(`Error adding item: ${error.message}`);
        } else if (data) {
            const addedItem: PurchaseOrderItem = {
                id: data.po_item_id,
                poNumber: data.po_number,
                materialCode: data.material_code,
                quantity: data.quantity_ordered,
                unitCost: data.unit_price,
            };
            setPoItems(prev => [...prev, addedItem]);
            
            if (availableMaterials.length > 1) {
                const nextMaterial = availableMaterials.find(m => m.materialCode !== newItem.materialCode);
                 setNewItem({
                    materialCode: nextMaterial?.materialCode || '',
                    quantity: 1,
                    unitCost: nextMaterial?.costPerUnit || 0
                });
            } else {
                setNewItem({ materialCode: '', quantity: 1, unitCost: 0 });
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteItem = async (poItemId: number) => {
        if (!window.confirm('Are you sure you want to remove this item?')) return;
        
        const { error } = await supabase.from('po_items').delete().eq('po_item_id', poItemId);
        if (error) {
            alert(`Error deleting item: ${error.message}`);
        } else {
            setPoItems(prev => prev.filter(item => item.id !== poItemId));
        }
    };

    const totalValue = itemsForThisPO.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    const modalTitle = po.status === POStatus.Draft ? `Manage Items for ${po.poNumber}` : `View Items for ${po.poNumber}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
            <div className="space-y-4">
                <div className="overflow-x-auto border rounded-lg max-h-64">
                     <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Material</th>
                                <th className="px-4 py-2 text-right">Quantity</th>
                                <th className="px-4 py-2 text-right">Unit Cost</th>
                                <th className="px-4 py-2 text-right">Subtotal</th>
                                <th className="px-4 py-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsForThisPO.length > 0 ? itemsForThisPO.map(item => {
                                const material = materialsMap.get(item.materialCode);
                                return (
                                <tr key={item.id} className="bg-white border-b">
                                    <td className="px-4 py-2 font-medium">{material?.description || item.materialCode}</td>
                                    <td className="px-4 py-2 text-right font-mono">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right font-mono">{defaultCurrency} {item.unitCost.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-mono">{defaultCurrency} {(item.quantity * item.unitCost).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button 
                                            onClick={() => item.id && handleDeleteItem(item.id)} 
                                            className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            disabled={po.status !== POStatus.Draft}
                                            title={po.status === POStatus.Draft ? "Delete Item" : "Cannot delete items from a non-draft PO"}
                                        >
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                                )
                            }) : (
                                <tr><td colSpan={5} className="text-center p-4 text-gray-500">No items added yet.</td></tr>
                            )}
                        </tbody>
                         <tfoot className="bg-gray-100 sticky bottom-0">
                            <tr>
                                <td colSpan={3} className="px-4 py-2 text-right font-bold text-gray-900">Total</td>
                                <td className="px-4 py-2 text-right font-bold font-mono text-gray-900">{defaultCurrency} {totalValue.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
               
                {po.status === POStatus.Draft ? (
                    <form onSubmit={handleAddItem} className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1">Material</label>
                            <select name="materialCode" value={newItem.materialCode} onChange={handleNewItemChange} required className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm">
                                <option value="" disabled>Select material</option>
                                {availableMaterials.map(m => <option key={m.materialCode} value={m.materialCode}>{m.materialCode} - {m.description}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-medium mb-1">Quantity</label>
                            <input type="number" name="quantity" value={newItem.quantity} onChange={handleNewItemChange} min="1" required className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm" />
                        </div>
                        <button type="submit" disabled={isSubmitting || !newItem.materialCode} className="flex items-center justify-center px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                            <PlusIcon className="w-5 h-5 mr-1" />
                            {isSubmitting ? 'Adding...' : 'Add'}
                        </button>
                    </form>
                ) : (
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                        <p className="text-sm text-yellow-800">
                            Items can only be added to or removed from Purchase Orders with a 'Draft' status. This is a read-only view.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};


interface PurchaseOrdersProps {
    user: User;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    purchaseOrderItems: PurchaseOrderItem[];
    setPurchaseOrderItems: React.Dispatch<React.SetStateAction<PurchaseOrderItem[]>>;
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
        [POStatus.Draft]: "text-gray-800 bg-gray-100",
        [POStatus.Ordered]: "text-blue-800 bg-blue-100",
        [POStatus.Shipped]: "text-purple-800 bg-purple-100",
        [POStatus.Received]: "text-green-800 bg-green-100",
        [POStatus.Cancelled]: "text-red-800 bg-red-100",
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ user, purchaseOrders, setPurchaseOrders, purchaseOrderItems, setPurchaseOrderItems, materials, suppliers, poStatuses, defaultCurrency }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
    const [poInForm, setPoInForm] = useState(initialPOState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [selectedPOForItems, setSelectedPOForItems] = useState<PurchaseOrder | null>(null);

    const [filters, setFilters] = useState({
        poNumber: '',
        supplierId: '',
        orderDateStart: '',
        orderDateEnd: '',
        deliveryDateStart: '',
        deliveryDateEnd: '',
        status: '',
        noOfItems: '',
    });

    const suppliersMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers]);
    
    const poTotals = useMemo(() => {
        const totals = new Map<string, number>();
        purchaseOrderItems.forEach(item => {
            const currentTotal = totals.get(item.poNumber) || 0;
            totals.set(item.poNumber, currentTotal + item.quantity * item.unitCost);
        });
        return totals;
    }, [purchaseOrderItems]);

    const poItemCounts = useMemo(() => {
        const counts = new Map<string, number>();
        purchaseOrderItems.forEach(item => {
            counts.set(item.poNumber, (counts.get(item.poNumber) || 0) + 1);
        });
        return counts;
    }, [purchaseOrderItems]);

    const itemsForCurrentPOInForm = useMemo(() => {
        const poNumber = editingPO ? editingPO.poNumber : null;
        if (!poNumber) return []; // For new POs, there are no items
        return purchaseOrderItems.filter(item => item.poNumber === poNumber);
    }, [purchaseOrderItems, editingPO]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters({
            poNumber: '',
            supplierId: '',
            orderDateStart: '',
            orderDateEnd: '',
            deliveryDateStart: '',
            deliveryDateEnd: '',
            status: '',
            noOfItems: '',
        });
    };

    const filteredPurchaseOrders = useMemo(() => {
        return purchaseOrders.filter(po => {
            const mainFiltersPass = (
                (filters.poNumber ? po.poNumber.toLowerCase().includes(filters.poNumber.toLowerCase()) : true) &&
                (filters.supplierId ? po.supplierId === filters.supplierId : true) &&
                (filters.orderDateStart ? po.orderDate >= filters.orderDateStart : true) &&
                (filters.orderDateEnd ? po.orderDate <= filters.orderDateEnd : true) &&
                (filters.deliveryDateStart ? po.deliveryDate >= filters.deliveryDateStart : true) &&
                (filters.deliveryDateEnd ? po.deliveryDate <= filters.deliveryDateEnd : true) &&
                (filters.status ? po.status === filters.status : true)
            );

            if (!mainFiltersPass) return false;

            if (filters.noOfItems !== '') {
                const itemCount = poItemCounts.get(po.poNumber) || 0;
                const filterItemCount = parseInt(filters.noOfItems, 10);
                if (isNaN(filterItemCount) || itemCount !== filterItemCount) {
                    return false;
                }
            }
            
            return true;
        });
    }, [purchaseOrders, filters, poItemCounts]);

    const handleOpenEditModal = (po: PurchaseOrder) => {
        setEditingPO(po);
        setPoInForm(po);
        setIsCreateModalOpen(true);
    };

    const handleOpenItemsModal = (po: PurchaseOrder) => {
        setSelectedPOForItems(po);
        setIsItemsModalOpen(true);
    };

    const handleOpenCreateModal = () => {
        setEditingPO(null);
        const defaultSupplier = suppliers.length > 0 ? suppliers[0].id : '';
        // Explicitly set to Draft for new POs
        setPoInForm({ ...initialPOState, status: POStatus.Draft, supplierId: defaultSupplier }); 
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingPO(null);
    };

    const handleCloseItemsModal = () => {
        setIsItemsModalOpen(false);
        setSelectedPOForItems(null);
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
        if (!window.confirm(`Are you sure you want to delete PO ${poNumber}? This will also delete all associated items.`)) return;

        // First delete items, then the PO header for data integrity
        const { error: itemError } = await supabase.from('po_items').delete().eq('po_number', poNumber);
        if (itemError) {
            alert(`Could not delete PO items: ${itemError.message}`);
            return;
        }

        const { error } = await supabase.from('purchase_orders').delete().eq('po_number', poNumber);
        if (error) {
            alert(`Error deleting PO: ${error.message}`);
        } else {
            setPurchaseOrders(prev => prev.filter(p => p.poNumber !== poNumber));
            setPurchaseOrderItems(prev => prev.filter(item => item.poNumber !== poNumber));
        }
    };

    const commonInputStyle = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
    const commonLabelStyle = "block text-sm font-medium text-gray-700";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Create PO</span>
                </button>
            </div>

            <Card>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label htmlFor="poNumber" className={commonLabelStyle}>PO Number</label>
                            <input type="text" id="poNumber" name="poNumber" value={filters.poNumber} onChange={handleFilterChange} className={commonInputStyle} placeholder="Search PO..."/>
                        </div>
                        <div>
                            <label htmlFor="supplierId" className={commonLabelStyle}>Supplier</label>
                            <select id="supplierId" name="supplierId" value={filters.supplierId} onChange={handleFilterChange} className={commonInputStyle}>
                                <option value="">All Suppliers</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="status" className={commonLabelStyle}>Status</label>
                            <select id="status" name="status" value={filters.status} onChange={handleFilterChange} className={commonInputStyle}>
                                <option value="">All Statuses</option>
                                {poStatuses.map(s => <option key={s.id} value={s.value}>{s.value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="noOfItems" className={commonLabelStyle}>No. of Items</label>
                            <input type="number" id="noOfItems" name="noOfItems" value={filters.noOfItems} onChange={handleFilterChange} className={commonInputStyle} placeholder="e.g., 0"/>
                        </div>
                        <div>
                            <label htmlFor="orderDateStart" className={commonLabelStyle}>Order Date From</label>
                            <input type="date" id="orderDateStart" name="orderDateStart" value={filters.orderDateStart} onChange={handleFilterChange} className={commonInputStyle} />
                        </div>
                        <div>
                            <label htmlFor="orderDateEnd" className={commonLabelStyle}>Order Date To</label>
                            <input type="date" id="orderDateEnd" name="orderDateEnd" value={filters.orderDateEnd} onChange={handleFilterChange} className={commonInputStyle} />
                        </div>
                        <div>
                            <label htmlFor="deliveryDateStart" className={commonLabelStyle}>Delivery Date From</label>
                            <input type="date" id="deliveryDateStart" name="deliveryDateStart" value={filters.deliveryDateStart} onChange={handleFilterChange} className={commonInputStyle} />
                        </div>
                        <div>
                            <label htmlFor="deliveryDateEnd" className={commonLabelStyle}>Delivery Date To</label>
                            <input type="date" id="deliveryDateEnd" name="deliveryDateEnd" value={filters.deliveryDateEnd} onChange={handleFilterChange} className={commonInputStyle} />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={clearFilters} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Clear Filters</button>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">PO Number</th>
                                <th scope="col" className="px-6 py-3">Supplier</th>
                                <th scope="col" className="px-6 py-3 text-center">No. of Items</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Value</th>
                                <th scope="col" className="px-6 py-3">Order Date</th>
                                <th scope="col" className="px-6 py-3">Delivery Date</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchaseOrders.map(po => (
                                <tr key={po.poNumber} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{po.poNumber}</th>
                                    <td className="px-6 py-4">{suppliersMap.get(po.supplierId)?.supplierName || po.supplierId}</td>
                                    <td className="px-6 py-4 text-center font-mono">{poItemCounts.get(po.poNumber) || 0}</td>
                                    <td className="px-6 py-4 text-right font-mono">{defaultCurrency} {(poTotals.get(po.poNumber) || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4">{new Date(po.orderDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">{getStatusChip(po.status)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                                onClick={() => handleOpenItemsModal(po)} 
                                                className="text-gray-500 hover:text-green-700" 
                                                title="View/Manage Items"
                                            >
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleOpenEditModal(po)} className="text-blue-500 hover:text-blue-700" title="Edit PO Header"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDeletePO(po.poNumber)} className="text-red-500 hover:text-red-700" title="Delete PO"><Trash2Icon className="w-5 h-5" /></button>
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
                        <label className="block text-sm font-medium text-gray-700">Supplier</label>
                        <select
                            name="supplierId"
                            value={poInForm.supplierId}
                            onChange={handleFormChange}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="" disabled>Select a supplier</option>
                            {suppliers.map(supplier => (
                                <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Order Date</label>
                            <input type="date" name="orderDate" value={poInForm.orderDate} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Expected Delivery Date</label>
                            <input type="date" name="deliveryDate" value={poInForm.deliveryDate} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select name="status" value={poInForm.status} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            {poStatuses.map(s => (
                                <option 
                                    key={s.id} 
                                    value={s.value}
                                    disabled={itemsForCurrentPOInForm.length === 0 && s.value !== POStatus.Draft}
                                >
                                    {s.value}
                                </option>
                            ))}
                        </select>
                        {itemsForCurrentPOInForm.length === 0 && poInForm.status === POStatus.Draft && (
                            <p className="mt-1 text-xs text-gray-500">
                                PO must have at least one item to change status from 'Draft'.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea name="notes" value={poInForm.notes || ''} onChange={handleFormChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                            {isSubmitting ? 'Saving...' : (editingPO ? 'Save Changes' : 'Create PO')}
                        </button>
                    </div>
                </form>
            </Modal>
            
            {selectedPOForItems && (
                <POItemsManagerModal
                    isOpen={isItemsModalOpen}
                    onClose={handleCloseItemsModal}
                    po={selectedPOForItems}
                    poItems={purchaseOrderItems}
                    setPoItems={setPurchaseOrderItems}
                    materials={materials}
                    defaultCurrency={defaultCurrency}
                />
            )}
        </div>
    );
};

export default PurchaseOrders;