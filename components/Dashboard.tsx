import React, { useMemo } from 'react';
import { InventoryItem, PurchaseOrder, Style, WorkOrder, POStatus, WorkOrderStatus, SKU } from '../types';
import Card from './common/Card';
import { AlertTriangleIcon, PackageIcon, ClipboardIcon, ShirtIcon, BarcodeIcon } from './icons';

interface DashboardProps {
    styles: Style[];
    inventory: InventoryItem[];
    purchaseOrders: PurchaseOrder[];
    workOrders: WorkOrder[];
    skus: SKU[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
    <Card className="flex items-center p-4">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    </Card>
);

const Dashboard: React.FC<DashboardProps> = ({ styles, inventory, purchaseOrders, workOrders, skus }) => {
    const lowStockItems = inventory.filter(item => item.quantityOnHand < item.minStockLevel).length;
    const activePOs = purchaseOrders.filter(po => po.status === POStatus.Ordered).length;
    const inProgressWOs = workOrders.filter(wo => wo.status === WorkOrderStatus.InProgress).length;
    
    const skusMap = useMemo(() => new Map(skus.map(s => [s.skuCode, s])), [skus]);
    
    const pendingPOs = useMemo(() => 
        purchaseOrders.filter(po => po.status === POStatus.Ordered),
    [purchaseOrders]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Styles" 
                    value={styles.length} 
                    icon={<ShirtIcon className="w-6 h-6 text-blue-500" />}
                    color="bg-blue-100 dark:bg-blue-900/50"
                />
                <StatCard 
                    title="Total SKUs" 
                    value={skus.length} 
                    icon={<BarcodeIcon className="w-6 h-6 text-purple-500" />}
                    color="bg-purple-100 dark:bg-purple-900/50"
                />
                <StatCard 
                    title="Items with Low Stock" 
                    value={lowStockItems} 
                    icon={<AlertTriangleIcon className="w-6 h-6 text-red-500" />}
                    color="bg-red-100 dark:bg-red-900/50"
                />
                <StatCard 
                    title="Active Purchase Orders" 
                    value={activePOs} 
                    icon={<PackageIcon className="w-6 h-6 text-green-500" />}
                    color="bg-green-100 dark:bg-green-900/50"
                />
                <StatCard 
                    title="Work Orders in Progress" 
                    value={inProgressWOs} 
                    icon={<ClipboardIcon className="w-6 h-6 text-yellow-500" />}
                    color="bg-yellow-100 dark:bg-yellow-900/50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <h2 className="text-lg font-semibold mb-4">Recent Work Orders</h2>
                    <ul className="space-y-2">
                        {workOrders.length > 0 ? (
                            workOrders.slice(0, 5).map(wo => {
                                const sku = skusMap.get(wo.skuCode);
                                return (
                                    <li key={wo.woNumber} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                        <span>{wo.woNumber} - {sku?.styleCode || 'N/A'}</span>
                                        <span className="font-mono">{wo.quantity} units</span>
                                        <span className="font-medium">{wo.status}</span>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="text-sm text-gray-500 dark:text-gray-400 p-2">No recent work orders found.</li>
                        )}
                    </ul>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold mb-4">Pending Deliveries</h2>
                     <ul className="space-y-2">
                        {pendingPOs.length > 0 ? (
                            pendingPOs.slice(0, 5).map(po => (
                                <li key={po.poNumber} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                    <span>{po.poNumber}</span>
                                    <span className="font-medium">{po.supplierId}</span>
                                    <span>Due: {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : 'N/A'}</span>
                                </li>
                            ))
                        ) : (
                             <li className="text-sm text-gray-500 dark:text-gray-400 p-2">No pending deliveries.</li>
                        )}
                    </ul>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;