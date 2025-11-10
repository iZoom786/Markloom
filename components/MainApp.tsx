import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Style, SKU, Material, InventoryItem, PurchaseOrder, WorkOrder, BOM, Supplier, SettingItem, Currency, PurchaseOrderItem, Profile, AppSettings
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
import Users from './Users';
import { 
    HomeIcon, ShirtIcon, BarcodeIcon, LayersIcon, PackageIcon, ClipboardIcon, FileTextIcon, 
    ShoppingCartIcon, UsersIcon, SettingsIcon 
} from './icons';

interface MainAppProps {
    user: Profile;
    onLogout: () => void;
}

type View = 'dashboard' | 'styles' | 'skus' | 'materials' | 'inventory' | 'boms' | 'purchaseOrders' | 'workOrders' | 'suppliers' | 'settings' | 'users';

// Convert snake_case → camelCase
const toCamelCase = <T extends {}>(obj: any): T => {
    if (!obj || typeof obj !== 'object') return obj as T;
    if (Array.isArray(obj)) return obj.map(toCamelCase) as any;

    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            newObj[camelKey] = toCamelCase(obj[key]);
        }
    }
    return newObj as T;
};

const MainApp: React.FC<MainAppProps> = ({ user, onLogout }) => {
    const [view, setView] = useState<View>('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    const [allUsers, setAllUsers] = useState<Profile[]>([]);
    
    const [settings, setSettings] = useState<AppSettings>({
        currencies: [],
        colors: [],
        sizes: [],
        materialTypes: [],
        unitsOfMeasure: [],
        poStatuses: [],
        edgeFunctionApiKey: '',
    });

    // Compute defaultCurrency only after settings loaded
    const defaultCurrency = settings.currencies.find(c => c.isDefault)?.value || 'USD';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const dataPromises = [
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
                    supabase.from('configuration').select('value').eq('key', 'edge_function_api_key').maybeSingle(),
                ];

                if (user.role === 'admin') {
                    dataPromises.push(supabase.from('profiles').select('*'));
                }

                const responses = await Promise.all(dataPromises);
                
                const [
                    stylesRes, skusRes, materialsRes, inventoryRes, poRes, poItemsRes, woRes, bomsRes,
                    suppliersRes, currenciesRes, colorsRes, sizesRes, materialTypesRes,
                    uomRes, poStatusesRes, apiKeyRes, profilesRes
                ] = responses;

                const responseMap = [
                    { name: 'styles', res: stylesRes }, { name: 'skus', res: skusRes },
                    { name: 'materials', res: materialsRes }, { name: 'inventory', res: inventoryRes },
                    { name: 'purchase_orders', res: poRes }, { name: 'po_items', res: poItemsRes },
                    { name: 'work_orders', res: woRes }, { name: 'boms', res: bomsRes },
                    { name: 'suppliers', res: suppliersRes },
                    { name: 'currencies', res: currenciesRes }, { name: 'colors', res: colorsRes },
                    { name: 'sizes', res: sizesRes }, { name: 'material_types', res: materialTypesRes },
                    { name: 'units_of_measure', res: uomRes }, { name: 'po_statuses', res: poStatusesRes },
                    { name: 'apiKey', res: apiKeyRes }, { name: 'profiles', res: profilesRes },
                ];

                for (const { name, res } of responseMap) {
                    if (res && res.error) {
                        console.error(`Error fetching ${name}:`, res.error);
                        throw new Error(`Failed to load ${name}: ${res.error.message}`);
                    }
                }

                const setSafe = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, data: any[] | null) => {
                    if (!data) {
                        setter([]);
                        return;
                    }
                    const camelData = toCamelCase<T[]>(data);
                    setter(Array.isArray(camelData) ? camelData : []);
                };

                // FIX: Cast data from Supabase responses to the expected type.
                // This is necessary because Promise.all with a mix of queries returning arrays
                // and single objects results in a union type that TypeScript cannot safely infer.
                setSafe(setStyles, stylesRes.data as any[]);
                setSafe(setSkus, skusRes.data as any[]);
                setSafe(setMaterials, materialsRes.data as any[]);
                setSafe(setInventory, inventoryRes.data as any[]);
                setSafe(setPurchaseOrders, poRes.data as any[]);
                setSafe(setWorkOrders, woRes.data as any[]);
                setSafe(setBoms, bomsRes.data as any[]);
                setSafe(setSuppliers, suppliersRes.data as any[]);
                if (profilesRes) setSafe(setAllUsers, profilesRes.data as any[]);

                const poItems = (poItemsRes.data as any[]) || [];
                setPurchaseOrderItems(poItems.map((item: any) => ({
                    id: item.id || item.po_item_id,
                    poNumber: item.po_number,
                    materialCode: item.material_code,
                    quantity: item.quantity_ordered || item.quantity,
                    unitCost: item.unit_price || item.unit_cost,
                })));

                setSettings({
                    currencies: toCamelCase<Currency[]>((currenciesRes.data as any[]) || []),
                    colors: toCamelCase<SettingItem[]>((colorsRes.data as any[]) || []),
                    sizes: toCamelCase<SettingItem[]>((sizesRes.data as any[]) || []),
                    materialTypes: toCamelCase<SettingItem[]>((materialTypesRes.data as any[]) || []),
                    unitsOfMeasure: toCamelCase<SettingItem[]>((uomRes.data as any[]) || []),
                    poStatuses: toCamelCase<SettingItem[]>((poStatusesRes.data as any[]) || []),
                    edgeFunctionApiKey: (apiKeyRes?.data as { value: string } | null)?.value || '',
                });

            } catch (err: any) {
                console.error('Data fetch failed:', err);
                setError(err.message || 'Failed to load data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user.id, user.role]);

    const renderView = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg">Loading data...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            );
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
                return (
                    <PurchaseOrders 
                        user={user} 
                        purchaseOrders={purchaseOrders} 
                        setPurchaseOrders={setPurchaseOrders} 
                        purchaseOrderItems={purchaseOrderItems}
                        setPurchaseOrderItems={setPurchaseOrderItems}
                        materials={materials} 
                        suppliers={suppliers} 
                        poStatuses={settings.poStatuses} 
                        defaultCurrency={defaultCurrency} 
                    />
                );
            case 'workOrders':
                return <WorkOrders user={user} workOrders={workOrders} setWorkOrders={setWorkOrders} styles={styles} skus={skus} boms={boms} materials={materials} inventory={inventory} />;
            case 'suppliers':
                return <Suppliers user={user} suppliers={suppliers} setSuppliers={setSuppliers} />;
            case 'users':
                return <Users currentUser={user} allUsers={allUsers} setAllUsers={setAllUsers} edgeFunctionApiKey={settings.edgeFunctionApiKey} />;
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
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
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
                
                {user.role === 'admin' && (
                    <div>
                        <div className="my-4 border-t"></div>
                        <h2 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Administration</h2>
                        <NavLink currentView={view} targetView="users" onClick={setView} icon={<UsersIcon className="w-5 h-5"/>}>Users</NavLink>
                        <NavLink currentView={view} targetView="settings" onClick={setView} icon={<SettingsIcon className="w-5 h-5"/>}>Settings</NavLink>
                    </div>
                )}
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={onLogout} />
                <div className="flex-1 overflow-y-auto p-6">
                    {renderView()}
                </div>
                <footer className="bg-gray-800 text-white p-4 text-center text-sm shrink-0">
                    <p>All rights reserved @2025 - POC by Asif Iqbal Paracha</p>
                </footer>
            </main>
        </div>
    );
};

export default MainApp;