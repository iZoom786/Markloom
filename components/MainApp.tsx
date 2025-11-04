
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    User, Style, SKU, Material, InventoryItem, PurchaseOrder, WorkOrder, BOM, Supplier, SettingItem, Currency, PurchaseOrderItem
} from '../types';
import Header from './Header';
import Dashboard from './Dashboard';
import Styles from './Styles';
import SKUs from './SKUs';
import Materials from './Materials';
import Inventory from './Inventory';
import BOMBuilder from './BOMBuilder';
import PurchaseOrders from './PurchaseOrders';
import WorkOrders from './WorkOrders';
import Suppliers from './Suppliers';
import Settings from './Settings';
import { 
    HomeIcon, ShirtIcon, BarcodeIcon, LayersIcon, PackageIcon, ClipboardIcon, FileTextIcon, 
    ShoppingCartIcon, UsersIcon, SettingsIcon 
} from './icons';

interface MainAppProps {
    user: User;
    onLogout: () => void;
}

type View = 'dashboard' | 'styles' | 'skus' | 'materials' | 'inventory' | 'boms' | 'purchaseOrders' | 'workOrders' | 'suppliers' | 'settings';

const toCamelCase = <T extends {}>(obj: any): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase) as any;

    const newObj: any = {};
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newObj[camelKey] = toCamelCase(obj[key]);
        }
    }
    return newObj as T;
};

const MainApp: React.FC<MainAppProps> = ({ user, onLogout }) => {
    const [view, setView] = useState<View>('dashboard');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [styles, setStyles] = useState<Style[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [purchaseOrderItems, setPurchaseOrderItems] = useState<PurchaseOrderItem[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [boms, setBoms] = useState<BOM[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [settings, setSettings] = useState({
        currencies: [] as Currency[],
        colors: [] as SettingItem[],
        sizes: [] as SettingItem[],
        materialTypes: [] as SettingItem[],
        unitsOfMeasure: [] as SettingItem[],
        poStatuses: [] as SettingItem[],
    });

    const defaultCurrency = settings.currencies.find(c => c.isDefault)?.value || 'USD';
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [
                    stylesRes, skusRes, materialsRes, inventoryRes, poRes, poItemsRes, woRes, bomsRes, suppliersRes,
                    currenciesRes, colorsRes, sizesRes, materialTypesRes, uomRes, poStatusesRes
                ] = await Promise.all([
                    supabase.from('styles').select('*'),
                    supabase.from('skus').select('*'),
                    supabase.from('materials').select('*'),
                    supabase.from('inventory').select('*'),
                    supabase.from('purchase_orders').select('*').order('order_date', { ascending: false }),
                    supabase.from('po_items').select('*'),
                    supabase.from('work_orders').select('*').order('start_date', { ascending: false }),
                    supabase.from('boms').select('*'),
                    supabase.from('suppliers').select('*'),
                    supabase.from('currencies').select('*'),
                    supabase.from('colors').select('*'),
                    supabase.from('sizes').select('*'),
                    supabase.from('material_types').select('*'),
                    supabase.from('units_of_measure').select('*'),
                    supabase.from('po_statuses').select('*'),
                ]);

                const results = [stylesRes, skusRes, materialsRes, inventoryRes, poRes, poItemsRes, woRes, bomsRes, suppliersRes, currenciesRes, colorsRes, sizesRes, materialTypesRes, uomRes, poStatusesRes];
                for (const res of results) {
                    if (res.error) throw res.error;
                }

                const setData = (setter: React.Dispatch<React.SetStateAction<any[]>>, data: any[] | null) => {
                    const camelCasedData = toCamelCase(data);
                    setter(Array.isArray(camelCasedData) ? camelCasedData : []);
                };

                setData(setStyles, stylesRes.data);
                setData(setSkus, skusRes.data);
                setData(setMaterials, materialsRes.data);
                setData(setInventory, inventoryRes.data);
                setData(setPurchaseOrders, poRes.data);
                setData(setWorkOrders, woRes.data);
                setData(setBoms, bomsRes.data);
                setData(setSuppliers, suppliersRes.data);
                
                // Custom mapping for PO Items due to different column naming conventions
                if (poItemsRes.data) {
                    setPurchaseOrderItems(poItemsRes.data.map((item: any) => ({
                        id: item.po_item_id,
                        poNumber: item.po_number,
                        materialCode: item.material_code,
                        quantity: item.quantity_ordered,
                        unitCost: item.unit_price,
                    })));
                } else {
                    setPurchaseOrderItems([]);
                }


                const getArrayData = (data: any[] | null) => {
                    const camelCasedData = toCamelCase(data);
                    return Array.isArray(camelCasedData) ? camelCasedData : [];
                };

                setSettings({
                    currencies: getArrayData(currenciesRes.data),
                    colors: getArrayData(colorsRes.data),
                    sizes: getArrayData(sizesRes.data),
                    materialTypes: getArrayData(materialTypesRes.data),
                    unitsOfMeasure: getArrayData(uomRes.data),
                    poStatuses: getArrayData(poStatusesRes.data),
                });

            } catch (error: any) {
                console.error("Error fetching data:", error);
                let errorMessage = "An unknown error occurred while fetching data.";
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (error && typeof error.message === 'string') {
                    errorMessage = error.message;
                } else if (typeof error === 'object' && error !== null) {
                    try {
                        errorMessage = JSON.stringify(error);
                    } catch {
                        errorMessage = "Could not stringify the error object."
                    }
                } else if (error) {
                    errorMessage = String(error);
                }
                alert("Could not fetch data: " + errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const renderView = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-full"><p>Loading data...</p></div>;
        }

        switch (view) {
            case 'dashboard':
                return <Dashboard styles={styles} inventory={inventory} purchaseOrders={purchaseOrders} workOrders={workOrders} skus={skus} />;
            case 'styles':
                return <Styles user={user} styles={styles} setStyles={setStyles} defaultCurrency={defaultCurrency} />;
            case 'skus':
                return <SKUs user={user} skus={skus} setSkus={setSkus} styles={styles} settings={{ colors: settings.colors, sizes: settings.sizes }} defaultCurrency={defaultCurrency} />;
            case 'materials':
                return <Materials user={user} materials={materials} setMaterials={setMaterials} settings={{ materialTypes: settings.materialTypes, unitsOfMeasure: settings.unitsOfMeasure }} defaultCurrency={defaultCurrency} />;
            case 'inventory':
                return <Inventory user={user} inventory={inventory} setInventory={setInventory} materials={materials} />;
            case 'boms':
                return <BOMBuilder user={user} styles={styles} skus={skus} materials={materials} boms={boms} setBoms={setBoms} defaultCurrency={defaultCurrency} />;
            case 'purchaseOrders':
                return <PurchaseOrders 
                            user={user} 
                            purchaseOrders={purchaseOrders} 
                            setPurchaseOrders={setPurchaseOrders} 
                            purchaseOrderItems={purchaseOrderItems}
                            setPurchaseOrderItems={setPurchaseOrderItems}
                            materials={materials} 
                            suppliers={suppliers} 
                            poStatuses={settings.poStatuses} 
                            defaultCurrency={defaultCurrency} 
                        />;
            case 'workOrders':
                return <WorkOrders user={user} workOrders={workOrders} setWorkOrders={setWorkOrders} styles={styles} skus={skus} boms={boms} materials={materials} inventory={inventory} />;
            case 'suppliers':
                return <Suppliers user={user} suppliers={suppliers} setSuppliers={setSuppliers} />;
            case 'settings':
                return <Settings settings={settings} setSettings={setSettings} />;
            default:
                return <Dashboard styles={styles} inventory={inventory} purchaseOrders={purchaseOrders} workOrders={workOrders} skus={skus} />;
        }
    };
    
    const NavLink: React.FC<{
        currentView: View;
        targetView: View;
        onClick: (view: View) => void;
        children: React.ReactNode;
        icon: React.ReactNode;
    }> = ({ currentView, targetView, onClick, children, icon }) => {
        const isActive = currentView === targetView;
        return (
            <button
                onClick={() => onClick(targetView)}
                className={`flex items-center w-full p-2 rounded-lg text-left transition-colors duration-200 ${
                    isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
                <span className="mr-3">{icon}</span>
                {children}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-gray-100 text-gray-900">
            <aside className="w-64 bg-white p-4 space-y-2 flex flex-col shadow-md">
                <h1 className="text-2xl font-bold text-blue-600 px-2 mb-4">Marklooms ERP</h1>
                <nav className="flex-grow">
                    <NavLink currentView={view} targetView="dashboard" onClick={setView} icon={<HomeIcon className="w-5 h-5"/>}>Dashboard</NavLink>
                    <div className="my-4 border-t"></div>
                    <h2 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Product</h2>
                    <NavLink currentView={view} targetView="styles" onClick={setView} icon={<ShirtIcon className="w-5 h-5"/>}>Styles</NavLink>
                    <NavLink currentView={view} targetView="skus" onClick={setView} icon={<BarcodeIcon className="w-5 h-5"/>}>SKUs</NavLink>
                    <NavLink currentView={view} targetView="boms" onClick={setView} icon={<FileTextIcon className="w-5 h-5"/>}>BOMs</NavLink>
                    <div className="my-4 border-t"></div>
                     <h2 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Supply Chain</h2>
                    <NavLink currentView={view} targetView="materials" onClick={setView} icon={<LayersIcon className="w-5 h-5"/>}>Materials</NavLink>
                    <NavLink currentView={view} targetView="suppliers" onClick={setView} icon={<UsersIcon className="w-5 h-5"/>}>Suppliers</NavLink>
                    <NavLink currentView={view} targetView="purchaseOrders" onClick={setView} icon={<ShoppingCartIcon className="w-5 h-5"/>}>Purchase Orders</NavLink>
                    <NavLink currentView={view} targetView="inventory" onClick={setView} icon={<PackageIcon className="w-5 h-5"/>}>Inventory</NavLink>
                    <div className="my-4 border-t"></div>
                    <h2 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Manufacturing</h2>
                    <NavLink currentView={view} targetView="workOrders" onClick={setView} icon={<ClipboardIcon className="w-5 h-5"/>}>Work Orders</NavLink>
                </nav>
                 <div>
                    <div className="my-4 border-t"></div>
                    <NavLink currentView={view} targetView="settings" onClick={setView} icon={<SettingsIcon className="w-5 h-5"/>}>Settings</NavLink>
                </div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={onLogout} />
                <div className="flex-1 overflow-y-auto p-6">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default MainApp;