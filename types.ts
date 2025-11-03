// types.ts

export interface User {
    id: string;
    email: string;
    name: string;
}

export interface SettingItem {
    id: number;
    value: string;
}

export interface Currency {
    id: number;
    value: string;
    is_default: boolean;
}

export interface Style {
    styleCode: string;
    description: string;
    imageUrl: string;
    productCategory: string;
    brand: string;
    season: string;
    targetCostPrice: number;
    userId?: string;
}

export interface SKU {
    skuCode: string;
    styleCode: string;
    description: string | null;
    color: string;
    size: string;
    barcode: string | null;
    retailPrice: number;
    wholesalePrice: number | null;
    imageUrl: string;
    isActive: boolean;
}

export interface Material {
    materialCode: string;
    description: string;
    category: string;
    unitOfMeasure: string;
    costPerUnit: number;
    supplier: string;
    minOrderQuantity: number;
}

export interface InventoryItem {
    materialCode: string;
    quantityOnHand: number;
    minStockLevel: number;
    location: string;
    grn?: string;
    poNumber?: string;
}

export enum POStatus {
    Draft = 'Draft',
    Ordered = 'Ordered',
    Delivered = 'Delivered',
    Cancelled = 'Cancelled',
}

export interface PurchaseOrder {
    poNumber: string;
    supplierId: string;
    orderDate: string;
    deliveryDate: string;
    status: POStatus;
}

export interface POItem {
    poItemId: number;
    poNumber: string;
    materialCode: string;
    quantityOrdered: number;
    unitPrice: number;
}

export enum WorkOrderStatus {
    Pending = 'Pending',
    InProgress = 'In Progress',
    Completed = 'Completed',
    OnHold = 'On Hold',
}

export interface WorkOrder {
    woNumber: string;
    skuCode: string;
    quantity: number;
    startDate: string;
    endDate: string;
    status: WorkOrderStatus;
}

export interface BOM {
    bomId: number;
    skuCode: string;
    styleCode: string;
    materialCode: string;
    consumptionPerGarment: number;
    wastagePercentage: number;
}