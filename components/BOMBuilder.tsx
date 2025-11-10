import React, { useState, useMemo } from 'react';
import { BOM, Style, SKU, Material, Profile } from '../types';
import Card from './common/Card';
import { PlusIcon, Trash2Icon } from './icons';
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


interface BOMBuilderProps {
    user: Profile;
    styles: Style[];
    skus: SKU[];
    materials: Material[];
    boms: BOM[];
    setBoms: React.Dispatch<React.SetStateAction<BOM[]>>;
    defaultCurrency: string;
}

const initialNewBomItemState = {
    materialCode: '',
    consumptionPerGarment: 0,
    wastagePercentage: 0,
};

const BOMBuilder: React.FC<BOMBuilderProps> = ({ user, styles, skus, materials, boms, setBoms, defaultCurrency }) => {
    const [selectedStyleCode, setSelectedStyleCode] = useState<string>('');
    const [selectedSkuCode, setSelectedSkuCode] = useState<string>('');
    const [newBomItem, setNewBomItem] = useState(initialNewBomItemState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const materialsMap = useMemo(() => new Map(materials.map(m => [m.materialCode, m])), [materials]);
    const skusForSelectedStyle = useMemo(() => skus.filter(s => s.styleCode === selectedStyleCode), [skus, selectedStyleCode]);
    const bomForSelectedSku = useMemo(() => boms.filter(b => b.skuCode === selectedSkuCode), [boms, selectedSkuCode]);

    const availableMaterials = useMemo(() => {
        const usedMaterialCodes = new Set(bomForSelectedSku.map(b => b.materialCode));
        return materials.filter(m => !usedMaterialCodes.has(m.materialCode));
    }, [materials, bomForSelectedSku]);

    const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStyleCode(e.target.value);
        setSelectedSkuCode(''); // Reset SKU when style changes
    };

    const handleSkuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSkuCode(e.target.value);
    };

    const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setNewBomItem(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleAddItemToBOM = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSkuCode || !newBomItem.materialCode || newBomItem.consumptionPerGarment <= 0) {
            alert('Please select an SKU, a material, and enter a valid consumption value.');
            return;
        }
        setIsSubmitting(true);

        const selectedSku = skus.find(s => s.skuCode === selectedSkuCode);
        if (!selectedSku) {
            setIsSubmitting(false);
            return;
        }

        const bomToInsert = {
            sku_code: selectedSkuCode,
            style_code: selectedSku.styleCode,
            material_code: newBomItem.materialCode,
            consumption_per_garment: newBomItem.consumptionPerGarment,
            wastage_percentage: newBomItem.wastagePercentage,
        };

        const { data, error } = await supabase.from('boms').insert(bomToInsert).select().single();

        if (error) {
            alert(`Error adding BOM item: ${error.message}`);
        } else if (data) {
            setBoms(prev => [...prev, toCamelCase<BOM>(data)]);
            setNewBomItem(initialNewBomItemState);
        }
        setIsSubmitting(false);
    };

    const handleDeleteBomItem = async (bomId: number) => {
        if (!window.confirm('Are you sure you want to remove this material from the BOM?')) {
            return;
        }

        const { error } = await supabase.from('boms').delete().eq('bom_id', bomId);

        if (error) {
            alert(`Error deleting BOM item: ${error.message}`);
        } else {
            setBoms(prev => prev.filter(b => b.bomId !== bomId));
        }
    };

    const totalBomCost = useMemo(() => {
        return bomForSelectedSku.reduce((total, bomItem) => {
            const material = materialsMap.get(bomItem.materialCode);
            if (!material) return total;
            const cost = bomItem.consumptionPerGarment * material.costPerUnit * (1 + bomItem.wastagePercentage / 100);
            return total + cost;
        }, 0);
    }, [bomForSelectedSku, materialsMap]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Bill of Materials (BOM) Builder</h1>
            
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Select Style</label>
                        <select
                            value={selectedStyleCode}
                            onChange={handleStyleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="" disabled>Choose a style</option>
                            {styles.map(style => (
                                <option key={style.styleCode} value={style.styleCode}>
                                    {style.styleCode} - {style.description}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Select SKU</label>
                        <select
                            value={selectedSkuCode}
                            onChange={handleSkuChange}
                            disabled={!selectedStyleCode}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200"
                        >
                            <option value="" disabled>Choose an SKU</option>
                            {skusForSelectedStyle.map(sku => (
                                <option key={sku.skuCode} value={sku.skuCode}>
                                    {sku.skuCode} ({sku.color}, {sku.size})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedSkuCode && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">BOM for {selectedSkuCode}</h2>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Material</th>
                                        <th scope="col" className="px-6 py-3 text-right">Consumption</th>
                                        <th scope="col" className="px-6 py-3 text-right">Wastage %</th>
                                        <th scope="col" className="px-6 py-3 text-right">Cost</th>
                                        <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bomForSelectedSku.map(item => {
                                        const material = materialsMap.get(item.materialCode);
                                        const cost = material ? item.consumptionPerGarment * material.costPerUnit * (1 + item.wastagePercentage / 100) : 0;
                                        return (
                                            <tr key={item.bomId} className="bg-white border-b">
                                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                                    {material?.description || item.materialCode}
                                                </th>
                                                <td className="px-6 py-4 text-right font-mono">{item.consumptionPerGarment.toFixed(2)} {material?.unitOfMeasure}</td>
                                                <td className="px-6 py-4 text-right font-mono">{item.wastagePercentage.toFixed(2)}%</td>
                                                <td className="px-6 py-4 text-right font-mono">{defaultCurrency} {cost.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => handleDeleteBomItem(item.bomId)} className="text-red-500 hover:text-red-700">
                                                        <Trash2Icon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-3 text-right font-bold">Total Estimated Cost</td>
                                        <td className="px-6 py-3 text-right font-bold font-mono">{defaultCurrency} {totalBomCost.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2">Add Material to BOM</h3>
                            <form onSubmit={handleAddItemToBOM} className="p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row md:items-end md:gap-4 space-y-4 md:space-y-0">
                                <div className="flex-grow">
                                    <label className="block text-xs font-medium mb-1">Material</label>
                                    <select name="materialCode" value={newBomItem.materialCode} onChange={handleNewItemChange} required className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm">
                                        <option value="" disabled>Select material</option>
                                        {availableMaterials.map(m => <option key={m.materialCode} value={m.materialCode}>{m.description}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Consumption per Garment</label>
                                    <input type="number" name="consumptionPerGarment" value={newBomItem.consumptionPerGarment} onChange={handleNewItemChange} step="0.01" min="0" required className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Wastage %</label>
                                    <input type="number" name="wastagePercentage" value={newBomItem.wastagePercentage} onChange={handleNewItemChange} step="0.01" min="0" required className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm" />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto flex items-center justify-center px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                                    <PlusIcon className="w-5 h-5 mr-1" />
                                    {isSubmitting ? 'Adding...' : 'Add to BOM'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default BOMBuilder;
