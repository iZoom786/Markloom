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

export const userRoles = ['admin', 'purchase_manager', 'production_manager', 'inventory_manager', 'accountant', 'floor_supervisor', 'viewer'] as const;
export type UserRole = (typeof userRoles)[number];

export interface Profile {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    profileEmail?: string;
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
    isDefault: boolean;
}

export interface AppSettings {
    currencies: Currency[];
    colors: SettingItem[];
    sizes: SettingItem[];
    materialTypes: SettingItem[];
    unitsOfMeasure: SettingItem[];
    poStatuses: SettingItem[];
    edgeFunctionApiKey: string;
}
