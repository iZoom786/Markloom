import React, { useState } from 'react';
import Card from './common/Card';
import { XIcon, StarIcon } from './icons';
import { supabase } from '../lib/supabaseClient';
import { SettingItem, Currency } from '../types';

interface SettingsData {
    currencies: Currency[];
    colors: SettingItem[];
    sizes: SettingItem[];
    materialTypes: SettingItem[];
    unitsOfMeasure: SettingItem[];
}

interface SettingsProps {
    settings: SettingsData;
    setSettings: React.Dispatch<React.SetStateAction<any>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
    const [newValues, setNewValues] = useState({
        currency: '',
        color: '',
        size: '',
        materialType: '',
        unitOfMeasure: ''
    });

    const handleAddItem = async (
        type: 'currencies' | 'colors' | 'sizes' | 'materialTypes' | 'unitsOfMeasure',
        table: 'currencies' | 'colors' | 'sizes' | 'material_types' | 'units_of_measure'
    ) => {
        const keyMap = { currencies: 'currency', colors: 'color', sizes: 'size', materialTypes: 'materialType', unitsOfMeasure: 'unitOfMeasure' };
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
            setSettings((prev: SettingsData) => ({ ...prev, [type]: [...prev[type], data] }));
            setNewValues(prev => ({ ...prev, [keyMap[type]]: '' }));
        }
    };
    
    const handleRemoveItem = async (
        id: number,
        type: 'currencies' | 'colors' | 'sizes' | 'materialTypes' | 'unitsOfMeasure',
        table: 'currencies' | 'colors' | 'sizes' | 'material_types' | 'units_of_measure'
    ) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            alert(`Error removing item: ${error.message}`);
        } else {
            setSettings((prev: SettingsData) => ({
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
             setSettings((prev: SettingsData) => {
                const updatedCurrencies = prev.currencies.map(c => ({
                    ...c,
                    is_default: c.id === currencyId
                }));
                return { ...prev, currencies: updatedCurrencies };
            });
        }
    };

    const renderCurrencyManager = () => {
        return (
            <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manage Currencies</label>
                 <div className="mt-2 flex flex-wrap gap-2">
                    {(settings.currencies || []).map((currency: Currency) => (
                        <span key={currency.id} className="flex items-center bg-gray-200 dark:bg-gray-600 text-sm font-medium px-3 py-1 rounded-full">
                            {currency.value}
                            <button onClick={() => handleSetDefaultCurrency(currency.id)} className="ml-2 text-gray-500 hover:text-yellow-500" title="Set as default">
                                <StarIcon className={`w-4 h-4 ${currency.is_default ? 'fill-current text-yellow-500' : ''}`} />
                            </button>
                            <button onClick={() => handleRemoveItem(currency.id, 'currencies', 'currencies')} className="ml-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
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
                        className="w-full md:w-1/3 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <button type="button" onClick={() => handleAddItem('currencies', 'currencies')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add</button>
                </div>
            </div>
        )
    }

    const renderListManager = (
        title: string,
        type: 'colors' | 'sizes' | 'materialTypes' | 'unitsOfMeasure',
        table: 'colors' | 'sizes' | 'material_types' | 'units_of_measure'
    ) => {
        const keyMap = { colors: 'color', sizes: 'size', materialTypes: 'materialType', unitsOfMeasure: 'unitOfMeasure' };
        const valueKey = keyMap[type];

        return (
            <div className="border-t dark:border-gray-700 pt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{title}</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {(settings[type] || []).map((item: SettingItem) => (
                        <span key={item.id} className="flex items-center bg-gray-200 dark:bg-gray-600 text-sm font-medium px-3 py-1 rounded-full">
                            {item.value}
                            <button onClick={() => handleRemoveItem(item.id, type, table)} className="ml-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
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
                        className="w-full md:w-1/3 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <button type="button" onClick={() => handleAddItem(type, table)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add</button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Application Settings</h1>
            
            <Card>
                <div className="space-y-6">
                    {renderCurrencyManager()}
                    {renderListManager('Product Colors', 'colors', 'colors')}
                    {renderListManager('Product Sizes', 'sizes', 'sizes')}
                    {renderListManager('Material Types', 'materialTypes', 'material_types')}
                    {renderListManager('Units of Measure', 'unitsOfMeasure', 'units_of_measure')}
                </div>
            </Card>
        </div>
    );
};

export default Settings;