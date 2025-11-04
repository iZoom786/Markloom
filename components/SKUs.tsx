
import React, { useState, useMemo } from 'react';
import { SKU, Style, User, SettingItem } from '../types';
import Card from './common/Card';
import Modal from './common/Modal';
import { PlusIcon, PencilIcon, Trash2Icon } from './icons';
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

interface SKUsProps {
    user: User;
    skus: SKU[];
    setSkus: React.Dispatch<React.SetStateAction<SKU[]>>;
    styles: Style[];
    settings: {
        colors: SettingItem[];
        sizes: SettingItem[];
    };
    defaultCurrency: string;
}

const initialSkuState: SKU = {
    skuCode: '',
    styleCode: '',
    description: '',
    color: '',
    size: '',
    barcode: '',
    retailPrice: 0,
    wholesalePrice: 0,
    imageUrl: 'https://placehold.co/600x400/gray/white?text=SKU',
    isActive: true,
};


const SKUs: React.FC<SKUsProps> = ({ user, skus, setSkus, styles, settings, defaultCurrency }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSku, setEditingSku] = useState<SKU | null>(null);
    const [skuInForm, setSkuInForm] = useState<SKU>(initialSkuState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const stylesMap = useMemo(() => new Map(styles.map(s => [s.styleCode, s])), [styles]);

    const filteredSkus = useMemo(() => {
        return skus.filter(sku => 
            sku.skuCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sku.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            sku.styleCode.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [skus, searchTerm]);

    const handleOpenAddModal = () => {
        setEditingSku(null);
        // Pre-fill color/size if available
        const defaultState = {
            ...initialSkuState,
            color: settings.colors?.[0]?.value || '',
            size: settings.sizes?.[0]?.value || '',
        };
        setSkuInForm(defaultState);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (sku: SKU) => {
        setEditingSku(sku);
        setSkuInForm(sku);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSku(null);
        setSkuInForm(initialSkuState);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
             const checked = (e.target as HTMLInputElement).checked;
             setSkuInForm(prev => ({...prev, [name]: checked }));
        } else {
            const isNumeric = ['retailPrice', 'wholesalePrice'].includes(name);
            setSkuInForm(prev => ({
                ...prev,
                [name]: isNumeric ? parseFloat(value) || 0 : value,
            }));
        }
    };
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const generatedSkuCode = `${skuInForm.styleCode}-${skuInForm.color}-${skuInForm.size}`.toUpperCase().replace(/\s+/g, '-');
        const finalSkuInForm = { ...skuInForm, skuCode: generatedSkuCode };

        setIsSubmitting(true);

        if (editingSku) {
            // Update
            const { error } = await supabase
                .from('skus')
                .update(toSnakeCase(skuInForm))
                .eq('sku_code', editingSku.skuCode);
            
            if (error) {
                alert(`Error updating SKU: ${error.message}`);
            } else {
                setSkus(prev => prev.map(s => s.skuCode === editingSku.skuCode ? skuInForm : s));
                handleCloseModal();
            }
        } else {
            // Create
             const { data, error } = await supabase
                .from('skus')
                .insert(toSnakeCase(finalSkuInForm))
                .select()
                .single();

            if (error) {
                alert(`Error adding SKU: ${error.message}`);
            } else if (data) {
                const addedSku = toCamelCase<SKU>(data);
                setSkus(prev => [...prev, addedSku]);
                handleCloseModal();
            }
        }
        setIsSubmitting(false);
    };
    
    const handleDeleteSku = async (skuCode: string) => {
        if (!window.confirm(`Are you sure you want to delete SKU ${skuCode}?`)) return;

        const { error } = await supabase.from('skus').delete().eq('sku_code', skuCode);
        if (error) {
            alert(`Error deleting SKU: ${error.message}`);
        } else {
            setSkus(prev => prev.filter(s => s.skuCode !== skuCode));
        }
    };
    
    return (
         <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">SKU Management</h1>
                <button 
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center w-full md:w-auto px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <PlusIcon className="w-5 h-5" />
                    <span className="ml-2">Add SKU</span>
                </button>
            </div>

            <Card>
                 <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by SKU, style, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                             <tr>
                                <th scope="col" className="px-6 py-3">SKU Code</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">Style</th>
                                <th scope="col" className="px-6 py-3">Color/Size</th>
                                <th scope="col" className="px-6 py-3 text-right">Retail Price</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSkus.map(sku => (
                                <tr key={sku.skuCode} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{sku.skuCode}</th>
                                    <td className="px-6 py-4">{sku.description}</td>
                                    <td className="px-6 py-4">{stylesMap.get(sku.styleCode)?.description || sku.styleCode}</td>
                                    <td className="px-6 py-4">{sku.color} / {sku.size}</td>
                                    <td className="px-6 py-4 text-right font-mono">{defaultCurrency} {sku.retailPrice.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${sku.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {sku.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleOpenEditModal(sku)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDeleteSku(sku.skuCode)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSku ? `Edit SKU: ${editingSku.skuCode}` : "Add New SKU"} size="lg" closeOnBackdropClick={false}>
                 <form onSubmit={handleFormSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Style</label>
                        <select name="styleCode" value={skuInForm.styleCode} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            <option value="" disabled>Select a style</option>
                            {styles.map(style => <option key={style.styleCode} value={style.styleCode}>{style.styleCode} - {style.description}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" value={skuInForm.description || ''} onChange={handleFormChange} rows={2} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Color</label>
                            <select name="color" value={skuInForm.color} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <option value="" disabled>Select color</option>
                                {(settings.colors || []).map(color => <option key={color.id} value={color.value}>{color.value}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Size</label>
                             <select name="size" value={skuInForm.size} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <option value="" disabled>Select size</option>
                                {(settings.sizes || []).map(size => <option key={size.id} value={size.value}>{size.value}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Retail Price ({defaultCurrency})</label>
                            <input type="number" name="retailPrice" value={skuInForm.retailPrice} onChange={handleFormChange} required step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Wholesale Price ({defaultCurrency})</label>
                            <input type="number" name="wholesalePrice" value={skuInForm.wholesalePrice || ''} onChange={handleFormChange} step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Barcode (UPC/EAN)</label>
                        <input type="text" name="barcode" value={skuInForm.barcode || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="isActive" checked={skuInForm.isActive} onChange={handleFormChange} id="isActive" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">SKU is Active</label>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                           {isSubmitting ? 'Saving...' : (editingSku ? 'Save Changes' : 'Save SKU')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SKUs;