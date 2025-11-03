export interface User {
    id: string;
    email: string;
    name: string;
}

export enum POStatus {
    Draft = 'Draft',
    Ordered = 'Ordered',
    Shipped = 'Shipped',
    Received = 'Received',
    Cancelled = 'Cancelled',
}

export enum WorkOrderStatus {
    Pending = 'Pending',
    InProgress = 'In Progress',
    Completed = 'Completed',
    OnHold = 'On Hold',
}

export interface Style {
    styleCode: string;
    description: string;
    imageUrl?: string;
    productCategory: string;
    brand: string;
    season: string;
    targetCostPrice: number;
}

export interface SKU {
    skuCode: string;
    styleCode: string;
    description?: string;
    color: string;
    size: string;
    barcode?: string;
    retailPrice: number;
    wholesalePrice: number;
    imageUrl?: string;
    isActive: boolean;
}

export interface Material {
    materialCode: string;
    description: string;
    category: string;
    unitOfMeasure: string;
    costPerUnit: number;
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

export interface PurchaseOrder {
    poNumber: string;
    supplierId: string;
    orderDate: string;
    deliveryDate: string;
    status: POStatus;
    notes?: string;
}

export interface PurchaseOrderItem {
    id?: number;
    poNumber: string;
    materialCode: string;
    quantity: number;
    unitCost: number;
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

export interface Supplier {
    id: string;
    supplierName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface SettingItem {
    id: number;
    value: string;
}

export interface Currency extends SettingItem {
    is_default: boolean;
}
