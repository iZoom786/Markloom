import React, { useState } from 'react';
import Card from './common/Card';
import { XIcon, StarIcon } from './icons';
import { supabase } from '../lib/supabaseClient';
import { SettingItem, Currency, AppSettings } from '../types';

interface SettingsProps {
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

// Helper to convert snake_case object keys to camelCase from Supabase
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

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
    const [newValues, setNewValues] = useState({
        currency: '',
        color: '',
        size: '',
        materialType: '',
        unitOfMeasure: '',
        poStatus: ''
    });

    const [apiKey, setApiKey] = useState(settings.edgeFunctionApiKey);
    const [isSavingKey, setIsSavingKey] = useState(false);

    const handleSaveApiKey = async () => {
        setIsSavingKey(true);
        const { error } = await supabase
            .from('configuration')
            .upsert({ key: 'edge_function_api_key', value: apiKey });

        if (error) {
            alert('Failed to save API key: ' + error.message);
        } else {
            alert('API Key saved successfully.');
            setSettings(prev => ({ ...prev, edgeFunctionApiKey: apiKey }));
        }
        setIsSavingKey(false);
    };

    const handleAddItem = async (
        type: 'currencies' | 'colors' | 'sizes' | 'materialTypes' | 'unitsOfMeasure' | 'poStatuses',
        table: 'currencies' | 'colors' | 'sizes' | 'material_types' | 'units_of_measure' | 'po_statuses'
    ) => {
        const keyMap = { currencies: 'currency', colors: 'color', sizes: 'size', materialTypes: 'materialType', unitsOfMeasure: 'unitOfMeasure', poStatuses: 'poStatus' };
        const value = newValues[keyMap[type]].trim();
        
        if (!value) return;
        
        const insertData: { value: string, is_default?: boolean } = { value };
        if (table === 'currencies') {
            insertData.is_default = false;
        }

        const { data, error } = await supabase.from(table).insert(insertData).select().single();
        
        if (error) {
            alert(`Error adding item: ${error.message}`);
        } else if (data) {
            const newItem = toCamelCase(data);
            setSettings((prev: AppSettings) => ({ ...prev, [type]: [...prev[type], newItem] }));
            setNewValues(prev => ({ ...prev, [keyMap[type]]: '' }));
        }
    };
    
    const handleRemoveItem = async (
        id: number,
        type: 'currencies' | 'colors' | 'sizes' | 'materialTypes' | 'unitsOfMeasure' | 'poStatuses',
        table: 'currencies' | 'colors' | 'sizes' | 'material_types' | 'units_of_measure' | 'po_statuses'
    ) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            alert(`Error removing item: ${error.message}`);
        } else {
            setSettings((prev: AppSettings) => ({
                ...prev,
                [type]: prev[type].filter((item: SettingItem | Currency) => item.id !== id)
            }));
        }
    };
    
    const handleSetDefaultCurrency = async (currencyId: number) => {
        // First, set all other currencies to not be the default
        const { error: unsetError } = await supabase
            .from('currencies')
            .update({ is_default: false })
            .neq('id', currencyId);

        if (unsetError) {
            alert(`Error unsetting default currency: ${unsetError.message}`);
            return;
        }

        // Then, set the selected currency as the default
        const { data, error: setError } = await supabase
            .from('currencies')
            .update({ is_default: true })
            .eq('id', currencyId)
            .select()
            .single();

        if (setError) {
            alert(`Error setting default currency: ${setError.message}`);
        } else if (data) {
             setSettings((prev: AppSettings) => {
                const updatedCurrencies = prev.currencies.map(c => ({
                    ...c,
                    isDefault: c.id === currencyId
                }));
                return { ...prev, currencies: updatedCurrencies };
            });
        }
    };

    const renderCurrencyManager = () => {
        return (
            <div>
                 <label className="block text-sm font-medium text-gray-700">Manage Currencies</label>
                 <div className="mt-2 flex flex-wrap gap-2">
                    {(settings.currencies || []).map((currency: Currency) => (
                        <span key={currency.id} className="flex items-center bg-gray-200 text-sm font-medium px-3 py-1 rounded-full">
                            {currency.value}
                            <button onClick={() => handleSetDefaultCurrency(currency.id)} className="ml-2 text-gray-500 hover:text-yellow-500" title="Set as default">
                                <StarIcon className={`w-4 h-4 ${currency.isDefault ? 'fill-current text-yellow-500' : ''}`} />
                            </button>
                            <button onClick={() => handleRemoveItem(currency.id, 'currencies', 'currencies')} className="ml-2 text-gray-500 hover:text-gray-800">
                                <XIcon className="w-3 h-3"/>
                            </button>
                        </span>
                    ))}
                 </div>
                 <div className="mt-3 flex gap-2">
                    <input
                        type="text"
                        value={newValues.currency}
                        onChange={(e) => setNewValues(prev => ({...prev, currency: e.target.value}))}
                        placeholder="Add new currency (e.g., USD)"
                        className="w-full md:w-1/3 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <button type="button" onClick={() => handleAddItem('currencies', 'currencies')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add</button>
                </div>
            </div>
        )
    }

    const renderListManager = (
        title: string,
        type: 'colors' | 'sizes' | 'materialTypes' | 'unitsOfMeasure' | 'poStatuses',
        table: 'colors' | 'sizes' | 'material_types' | 'units_of_measure' | 'po_statuses'
    ) => {
        const keyMap = { colors: 'color', sizes: 'size', materialTypes: 'materialType', unitsOfMeasure: 'unitOfMeasure', poStatuses: 'poStatus' };
        const valueKey = keyMap[type];

        return (
            <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700">{title}</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {(settings[type] || []).map((item: SettingItem) => (
                        <span key={item.id} className="flex items-center bg-gray-200 text-sm font-medium px-3 py-1 rounded-full">
                            {item.value}
                            <button onClick={() => handleRemoveItem(item.id, type, table)} className="ml-2 text-gray-500 hover:text-gray-800">
                                <XIcon className="w-3 h-3"/>
                            </button>
                        </span>
                    ))}
                </div>
                <div className="mt-3 flex gap-2">
                    <input
                        type="text"
                        value={newValues[valueKey]}
                        onChange={(e) => setNewValues(prev => ({...prev, [valueKey]: e.target.value}))}
                        placeholder={`Add new ${valueKey.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                        className="w-full md:w-1/3 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <button type="button" onClick={() => handleAddItem(type, table)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add</button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900">Application Settings</h1>
            
            <Card>
                <div className="space-y-6">
                    {renderCurrencyManager()}
                    {renderListManager('Product Colors', 'colors', 'colors')}
                    {renderListManager('Product Sizes', 'sizes', 'sizes')}
                    {renderListManager('Material Types', 'materialTypes', 'material_types')}
                    {renderListManager('Units of Measure', 'unitsOfMeasure', 'units_of_measure')}
                    {renderListManager('Purchase Order Statuses', 'poStatuses', 'po_statuses')}
                     <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900">Integrations</h3>
                        <p className="text-sm text-gray-500 mt-1">Manage API keys for external services.</p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Edge Function API Key</label>
                            <div className="mt-2 flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter the API key for user creation"
                                    className="w-full md:w-2/3 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveApiKey}
                                    disabled={isSavingKey}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                                    {isSavingKey ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This key is used to authorize the 'create-user' edge function.</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Settings;
