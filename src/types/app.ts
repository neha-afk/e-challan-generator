import { ManufacturingOrder, Product } from './database';

/**
 * Extended Manufacturing Order type with related data and computed properties.
 * Used for UI display and frontend logic.
 */
export interface ManufacturingOrderWithDetails extends ManufacturingOrder {
    /**
     * The product associated with this order.
     * Joined from the products table.
     */
    product?: Product;

    /**
     * List of related Bill of Materials items (placeholder type)
     */
    bomItems?: any[];

    /**
     * Total number of work orders associated with this MO
     */
    workOrderCount: number;

    /**
     * Number of completed work orders
     */
    completedWorkOrderCount: number;

    /**
     * Computed property indicating if the order is overdue based on due_date
     */
    isOverdue: boolean;

    /**
     * Computed progress percentage (0-100) based on work order completion
     */
    progressPercentage: number;
}

/**
 * Filter options for the manufacturing order list
 */
export interface ManufacturingOrderFilter {
    status?: ManufacturingOrder['status'][];
    dateRange?: {
        start: Date;
        end: Date;
    };
    searchTerm?: string;
}
