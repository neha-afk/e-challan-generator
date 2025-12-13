import { createClient } from '@/lib/supabase/client';
import { ManufacturingOrderWithDetails, ManufacturingOrderFilter } from '@/types/app';

export async function fetchManufacturingOrders(filter?: ManufacturingOrderFilter): Promise<ManufacturingOrderWithDetails[]> {
    const supabase = createClient();
    let query = supabase
        .from('manufacturing_orders')
        .select(`
      *,
      product:products(*)
    `)
        .order('created_at', { ascending: false });

    if (filter?.status && filter.status.length > 0) {
        query = query.in('status', filter.status);
    }

    // TODO: Add date range and search term logic when needed

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching manufacturing orders:', error);
        throw error;
    }

    // Transform data to match ManufacturingOrderWithDetails
    // Mocking the extra fields for now since they aren't in the DB yet
    return (data || []).map((order: any) => ({
        ...order,
        bomItems: [], // Placeholder
        workOrderCount: Math.floor(Math.random() * 5) + 1, // Mock
        completedWorkOrderCount: Math.floor(Math.random() * 2), // Mock
        isOverdue: false, // Mock logic
        progressPercentage: Math.floor(Math.random() * 100), // Mock
    }));
}

export async function createManufacturingOrder(data: {
    product_id: string;
    quantity: number;
    start_date: string; // ISO string
    due_date?: string; // ISO string
    status: 'draft' | 'confirmed';
}): Promise<string> {
    const supabase = createClient();

    const { data: newOrder, error } = await supabase
        .from('manufacturing_orders')
        .insert({
            product_id: data.product_id,
            quantity: data.quantity,
            start_date: data.start_date,
            due_date: data.due_date,
            status: data.status,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error creating manufacturing order:', error);
        throw error;
    }

    return newOrder.id;
}
