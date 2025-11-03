import React, { useState, useMemo } from 'react';
import { WorkOrder, Style, WorkOrderStatus, BOM, Material, InventoryItem, User, SKU } from '../types';
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

interface WorkOrdersProps {
    user: User;
    workOrders: WorkOrder[];
    setWorkOrders: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
    styles: Style[];
    skus: SKU[];
    boms: BOM[];
    materials: Material[];
    inventory: InventoryItem[];
}

const initialWOState: Omit<WorkOrder, 'woNumber'> = {
    skuCode: '',
    quantity: 0,
    startDate: new Date().toISOString().split('T')[0], // Default to today
    endDate: '',
    status: WorkOrderStatus.Pending,
};


const getStatusChip = (status: WorkOrderStatus) => {
    const styles = {
        [WorkOrderStatus.Pending]: "text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300",
        [WorkOrderStatus.InProgress]: "text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
        [WorkOrderStatus.Completed]: "text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300",
        [WorkOrderStatus.OnHold]: "text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-300",
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
}

const WorkOrders: React.FC<WorkOrdersProps> = ({ user, workOrders, setWorkOrders, styles, skus, boms, materials, inventory }) => {
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
    const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
    const [newWorkOrder, setNewWorkOrder] = useState(initialWOState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const stylesMap = useMemo(() => new Map<string, Style>(styles.map(s => [s.styleCode, s])), [styles]);
    const skusMap = useMemo(() => new Map<string, SKU>(skus.map(s => [s.skuCode, s])), [skus]);
    const materialsMap = useMemo(() => new Map<string, Material>(materials.map(m => [m.materialCode, m])), [materials]);
    const inventoryMap = useMemo(() => new Map<string, InventoryItem>(inventory.map(i => [i.materialCode, i])), [inventory]);

    const handleWoClick = (wo: WorkOrder) => {
        setSelectedWorkOrder(wo);
        setIsDetailModalOpen(true);
    };
    
    const handleEditClick = (wo: WorkOrder) => {
        setEditingWorkOrder(wo);
        setIsEditModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedWorkOrder(null);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const stateSetter = isEditModalOpen ? setEditingWorkOrder : setNewWorkOrder;

        stateSetter(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
            };
        });
    };

    const handleCreateWorkOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkOrder.skuCode || newWorkOrder.quantity <= 0 || !newWorkOrder.endDate) {
            alert('Please select a SKU, enter a valid quantity, and set an end date.');
            return;
        }
        setIsSubmitting(true);
        
        const woNumber = `WO-${Date.now()}`;

        const woToInsert = {
            wo_number: woNumber,
            sku_code: newWorkOrder.skuCode,
            quantity: newWorkOrder.quantity,
            start_date: newWorkOrder.startDate,
            end_date: newWorkOrder.endDate,
            status: newWorkOrder.status,
        };
        
        const { data, error } = await supabase
            .from('work_orders')
            .insert(woToInsert)
            .select()
            .single();

        if (error) {
            alert(`Error creating work order: ${error.message}`);
        } else if (data) {
            const createdWO = toCamelCase<WorkOrder>(data);
            setWorkOrders(prev => [...prev, createdWO].sort((a,b) => b.woNumber.localeCompare(a.woNumber)));
            setIsCreateModalOpen(false);
            setNewWorkOrder(initialWOState);
        }
        setIsSubmitting(false);
    };

    const handleUpdateWorkOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWorkOrder) return;
        
        setIsSubmitting(true);
        
        const woToUpdate = {
            sku_code: editingWorkOrder.skuCode,
            quantity: editingWorkOrder.quantity,
            start_date: editingWorkOrder.startDate,
            end_date: editingWorkOrder.endDate,
            status: editingWorkOrder.status,
        };

        const { data, error } = await supabase
            .from('work_orders')
            .update(woToUpdate)
            .eq('wo_number', editingWorkOrder.woNumber)
            .select()
            .single();
            
        if (error) {
            alert(`Error updating work order: ${error.message}`);
        } else if (data) {
            const updatedWO = toCamelCase<WorkOrder>(data);
            setWorkOrders(prev => prev.map(wo => wo.woNumber === updatedWO.woNumber ? updatedWO : wo));
            setIsEditModalOpen(false);
            setEditingWorkOrder(null);
        }
        setIsSubmitting(false);
    };
    
    const handleDeleteWorkOrder = async (woNumber: string) => {
        if (!window.confirm("Are you sure you want to delete this work order? This action cannot be undone.")) {
            return;
        }

        const { error } = await supabase
            .from('work_orders')
            .delete()
            .eq('wo_number', woNumber);
            
        if (error) {
            alert(`Error deleting work order: ${error.message}`);
        } else {
            setWorkOrders(prev => prev.filter(wo => wo.woNumber !== woNumber));
        }
    };


    const selectedSku = selectedWorkOrder ? skusMap.get(selectedWorkOrder.skuCode) : null;
    const workOrderBOMs = selectedWorkOrder ? boms.filter(b => b.skuCode === selectedWorkOrder.skuCode) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work Orders</h1>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Create Work Order</span>
                </button>
            </div>
            
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">WO Number</th>
                                <th scope="col" className="px-6 py-3">SKU</th>
                                <th scope="col" className="px-6 py-3 text-right">Quantity</th>
                                <th scope="col" className="px-6 py-3">Start Date</th>
                                <th scope="col" className="px-6 py-3">End Date</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workOrders.map(wo => (
                                <tr key={wo.woNumber} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        {wo.woNumber}
                                    </th>
                                    <td className="px-6 py-4 font-medium">
                                        {wo.skuCode}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">{wo.quantity}</td>
                                    <td className="px-6 py-4">{new Date(wo.startDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{new Date(wo.endDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">{getStatusChip(wo.status)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleWoClick(wo)} className="text-gray-500 hover:text-blue-700" aria-label="View work order details">
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleEditClick(wo)} className="text-blue-500 hover:text-blue-700" aria-label="Edit work order">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteWorkOrder(wo.woNumber)} className="text-red-500 hover:text-red-700" aria-label="Delete work order">
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

            {/* Detail Modal */}
            {selectedWorkOrder && (
                <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title={`Details for ${selectedWorkOrder.woNumber}`} size="xl" closeOnBackdropClick={false}>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-lg">{selectedWorkOrder.skuCode}</h4>
                             <p className="text-sm text-gray-500 dark:text-gray-400">
                                Color: {selectedSku?.color || 'N/A'} / Size: {selectedSku?.size || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Quantity: <span className="font-bold">{selectedWorkOrder.quantity} units</span> | Status: <span className="font-bold">{selectedWorkOrder.status}</span>
                            </p>
                        </div>
                        <div className="border-t dark:border-gray-700 pt-4">
                            <h5 className="font-semibold mb-2">Material Requirements</h5>
                            <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-2">Material</th>
                                            <th className="px-4 py-2 text-right">Total Required</th>
                                            <th className="px-4 py-2 text-right">On Hand</th>
                                            <th className="px-4 py-2 text-right">Shortfall</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workOrderBOMs.map(bom => {
                                            const material = materialsMap.get(bom.materialCode);
                                            const inventory = inventoryMap.get(bom.materialCode);
                                            const requiredQty = bom.consumptionPerGarment * selectedWorkOrder.quantity * (1 + bom.wastagePercentage / 100);
                                            const onHandQty = inventory?.quantityOnHand || 0;
                                            const shortfall = requiredQty - onHandQty;

                                            return (
                                                <tr key={bom.bomId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{material?.description || bom.materialCode}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{requiredQty.toFixed(2)} {material?.unitOfMeasure}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{onHandQty}</td>
                                                    <td className={`px-4 py-2 text-right font-mono font-bold ${shortfall > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {shortfall > 0 ? shortfall.toFixed(2) : '0'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            
            {/* Common Form for Create/Edit */}
            {(isCreateModalOpen || isEditModalOpen) && 
                <Modal 
                    isOpen={isCreateModalOpen || isEditModalOpen} 
                    onClose={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingWorkOrder(null); }} 
                    title={isEditModalOpen ? `Edit Work Order ${editingWorkOrder?.woNumber}` : "Create New Work Order"}
                    closeOnBackdropClick={false}
                >
                    <form onSubmit={isEditModalOpen ? handleUpdateWorkOrder : handleCreateWorkOrder} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
                            {/* FIX: Use `|| ''` to prevent undefined value for controlled component */}
                            <select name="skuCode" value={(isEditModalOpen ? editingWorkOrder?.skuCode : newWorkOrder.skuCode) || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <option value="" disabled>Select a SKU</option>
                                {skus.map(sku => {
                                    const style = stylesMap.get(sku.styleCode);
                                    return (
                                        <option key={sku.skuCode} value={sku.skuCode}>
                                            {sku.skuCode} ({style?.description}, {sku.color}, {sku.size})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                            {/* FIX: Use `|| 0` to prevent undefined value for controlled component */}
                            <input type="number" name="quantity" value={(isEditModalOpen ? editingWorkOrder?.quantity : newWorkOrder.quantity) || 0} onChange={handleFormChange} required min="1" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                {/* FIX: Use `|| ''` to prevent undefined value for controlled component */}
                                <input type="date" name="startDate" value={(isEditModalOpen ? editingWorkOrder?.startDate : newWorkOrder.startDate) || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                {/* FIX: Use `|| ''` to prevent undefined value for controlled component */}
                                <input type="date" name="endDate" value={(isEditModalOpen ? editingWorkOrder?.endDate : newWorkOrder.endDate) || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            </div>
                        </div>
                         {isEditModalOpen && (
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                {/* FIX: Use `|| ''` to prevent undefined value for controlled component */}
                                <select name="status" value={editingWorkOrder?.status || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    {Object.values(WorkOrderStatus).map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                             </div>
                         )}
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingWorkOrder(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                               {isSubmitting ? 'Saving...' : (isEditModalOpen ? 'Save Changes' : 'Create Work Order')}
                            </button>
                        </div>
                    </form>
                </Modal>
            }
        </div>
    );
};

export default WorkOrders;