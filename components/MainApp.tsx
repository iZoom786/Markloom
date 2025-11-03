import React, { useState, useEffect, useMemo } from 'react';
import { User, Style, SKU, Material, InventoryItem, PurchaseOrder, POItem, WorkOrder, BOM, SettingItem, Currency } from '../types';
import { supabase } from '../lib/supabaseClient';
import Header from './Header';
import Dashboard from './Dashboard';
import Styles from './Styles';
import SKUs from './SKUs';
import Materials from './Materials';
import Inventory from './Inventory';
import PurchaseOrders from './PurchaseOrders';
import WorkOrders from './WorkOrders';
import BOMBuilder from './BOMBuilder';
import Settings from './Settings';
import { HomeIcon, ShirtIcon, BarcodeIcon, WrenchIcon, PackageIcon, WarehouseIcon, ClipboardIcon, SettingsIcon, TruckIcon } from './icons';

interface MainAppProps {
    user: User;
    onLogout: () => void;
}

// Helper to convert snake_case object keys to camelCase from Supabase
const toCamelCase = <T extends {}>(data: any): T => {
    if (data === null || typeof data !== 'object') {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(item => toCamelCase(item)) as any;
    }
    const newObj: any = {};
    for (let key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newObj[camelKey] = toCamelCase(data[key]);
        }
    }
    return newObj as T;
};

const MainApp: React.FC<MainAppProps> = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [styles, setStyles] = useState<Style[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [poItems, setPoItems] = useState<POItem[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [boms, setBoms] = useState<BOM[]>([]);
    
    // Settings state
    const [settings, setSettings] = useState({
        currencies: [] as Currency[],
        colors: [] as SettingItem[],
        sizes: [] as SettingItem[],
        materialTypes: [] as SettingItem[],
        unitsOfMeasure: [] as SettingItem[],
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [
                    stylesRes,
                    skusRes,
                    materialsRes,
                    inventoryRes,
                    poRes,
                    poItemsRes,
                    woRes,
                    bomsRes,
                    currenciesRes,
                    colorsRes,
                    sizesRes,
                    materialTypesRes,
                    unitsOfMeasureRes,
                ] = await Promise.all([
                    supabase.from('styles').select('*'),
                    supabase.from('skus').select('*'),
                    supabase.from('materials').select('*'),
                    supabase.from('inventory').select('*'),
                    supabase.from('purchase_orders').select('*').order('po_number', { ascending: false }),
                    supabase.from('po_items').select('*'),
                    supabase.from('work_orders').select('*').order('wo_number', { ascending: false }),
                    supabase.from('boms').select('*'),
                    supabase.from('currencies').select('*'),
                    supabase.from('colors').select('id, value'),
                    supabase.from('sizes').select('id, value'),
                    supabase.from('material_types').select('id, value'),
                    supabase.from('units_of_measure').select('id, value'),
                ]);

                const errors = [stylesRes.error, skusRes.error, materialsRes.error, inventoryRes.error, poRes.error, poItemsRes.error, woRes.error, bomsRes.error, currenciesRes.error, colorsRes.error, sizesRes.error, materialTypesRes.error, unitsOfMeasureRes.error].filter(Boolean);
                if (errors.length > 0) {
                    throw new Error(errors.map(e => e?.message).join(', '));
                }

                // Process and set settings
                const newSettings = {
                    currencies: toCamelCase<Currency[]>(currenciesRes.data || []),
                    colors: colorsRes.data || [],
                    sizes: sizesRes.data || [],
                    materialTypes: materialTypesRes.data || [],
                    unitsOfMeasure: unitsOfMeasureRes.data || [],
                };
                setSettings(newSettings);

                setStyles(toCamelCase<Style[]>(stylesRes.data));
                setSkus(toCamelCase<SKU[]>(skusRes.data));
                setMaterials(toCamelCase<Material[]>(materialsRes.data));
                setInventory(toCamelCase<InventoryItem[]>(inventoryRes.data));
                setPurchaseOrders(toCamelCase<PurchaseOrder[]>(poRes.data));
                setPoItems(toCamelCase<POItem[]>(poItemsRes.data));
                setWorkOrders(toCamelCase<WorkOrder[]>(woRes.data));
                setBoms(toCamelCase<BOM[]>(bomsRes.data));

            } catch (err: any) {
                setError(`Failed to fetch data: ${err.message || String(err)}`);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const defaultCurrency = useMemo(() => {
        return settings.currencies.find(c => c.is_default)?.value || 'Rs';
    }, [settings.currencies]);

    const settingsForChildren = useMemo(() => ({
        ...settings,
    }), [settings]);

    const renderView = () => {
        if (loading) return <div className="text-center p-8">Loading data...</div>;
        if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

        switch (activeView) {
            case 'dashboard':
                return <Dashboard styles={styles} inventory={inventory} purchaseOrders={purchaseOrders} workOrders={workOrders} skus={skus} />;
            case 'styles':
                return <Styles user={user} styles={styles} setStyles={setStyles} defaultCurrency={defaultCurrency} />;
            case 'skus':
                return <SKUs user={user} skus={skus} setSkus={setSkus} styles={styles} settings={settingsForChildren} defaultCurrency={defaultCurrency} />;
            case 'materials':
                return <Materials user={user} materials={materials} setMaterials={setMaterials} settings={settingsForChildren} defaultCurrency={defaultCurrency} />;
            case 'inventory':
                return <Inventory user={user} inventory={inventory} setInventory={setInventory} materials={materials} />;
            case 'purchase-orders':
                return <PurchaseOrders user={user} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} poItems={poItems} setPoItems={setPoItems} materials={materials} defaultCurrency={defaultCurrency} />;
            case 'work-orders':
                return <WorkOrders user={user} workOrders={workOrders} setWorkOrders={setWorkOrders} styles={styles} skus={skus} boms={boms} materials={materials} inventory={inventory} />;
            case 'bom-builder':
                return <BOMBuilder user={user} styles={styles} skus={skus} materials={materials} boms={boms} setBoms={setBoms} defaultCurrency={defaultCurrency} />;
            case 'settings':
                return <Settings settings={settings} setSettings={setSettings} />;
            default:
                return <Dashboard styles={styles} inventory={inventory} purchaseOrders={purchaseOrders} workOrders={workOrders} skus={skus} />;
        }
    };
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon className="w-5 h-5" /> },
        { id: 'styles', label: 'Styles', icon: <ShirtIcon className="w-5 h-5" /> },
        { id: 'skus', label: 'SKUs', icon: <BarcodeIcon className="w-5 h-5" /> },
        { id: 'materials', label: 'Materials', icon: <WrenchIcon className="w-5 h-5" /> },
        { id: 'purchase-orders', label: 'Purchase Orders', icon: <PackageIcon className="w-5 h-5" /> },
        { id: 'inventory', label: 'Inventory', icon: <WarehouseIcon className="w-5 h-5" /> },
        { id: 'bom-builder', label: 'BOM Builder', icon: <TruckIcon className="w-5 h-5" /> },
        { id: 'work-orders', label: 'Work Orders', icon: <ClipboardIcon className="w-5 h-5" /> },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col flex-shrink-0">
                <div className="p-4 border-b dark:border-gray-700">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Marklooms ERP</h1>
                </div>
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                                activeView === item.id 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {item.icon}
                            <span className="ml-3">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={onLogout} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default MainApp;