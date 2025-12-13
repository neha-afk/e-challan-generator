import { createClient } from '@/lib/supabase/client';
import { WorkOrder } from '@/types/database';

export interface WorkOrderWithMO extends WorkOrder {
    manufacturing_order: {
        id: string;
        product: {
            name: string;
        };
    };
}

export async function fetchWorkOrders(filter: 'all' | 'my_work' | 'in_progress' = 'all'): Promise<WorkOrderWithMO[]> {
    const supabase = createClient();
    let query = supabase
        .from('work_orders')
        .select(`
            *,
            manufacturing_order:manufacturing_orders(
                id,
                product:products(name)
            )
        `)
        .order('created_at', { ascending: true });

    if (filter === 'in_progress') {
        query = query.in('status', ['in_progress']);
    }
    // 'my_work' would normally filter by session user ID, but we'll skip that for this demo

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching work orders:', error);
        throw error;
    }

    return data as any;
}

export async function startWorkOrder(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('work_orders')
        .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) throw error;
}

export async function pauseWorkOrder(id: string, currentDuration: number): Promise<void> {
    const supabase = createClient();

    // Calculate additional duration since start (mock logic)
    // In real app, we'd subtract started_at from now

    const { error } = await supabase
        .from('work_orders')
        .update({
            status: 'pending',
            actual_duration: currentDuration + 5, // Mock adding 5 mins
        })
        .eq('id', id);

    if (error) throw error;
}

export async function completeWorkOrder(id: string, currentDuration: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('work_orders')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            actual_duration: currentDuration + 10, // Mock adding final duration
        })
        .eq('id', id);

    if (error) throw error;
}

export async function createWorkOrdersFromBOM(manufacturingOrderId: string, bomId: string): Promise<void> {
    const standardOperations = [
        { name: 'Material Staging', center: 'Warehouse', duration: 15 },
        { name: 'Assembly', center: 'Assembly Line 1', duration: 120 },
        { name: 'Quality Inspection', center: 'QA Station', duration: 30 },
        { name: 'Packaging', center: 'Packing Area', duration: 45 }
    ];

    const supabase = createClient();

    const workOrders = standardOperations.map(op => ({
        manufacturing_order_id: manufacturingOrderId,
        name: op.name,
        work_center: op.center,
        estimated_duration: op.duration,
        status: 'pending' as const,
        actual_duration: 0
    }));

    const { error } = await supabase
        .from('work_orders')
        .insert(workOrders);

    if (error) {
        console.error('Error creating work orders:', error);
    }
}
