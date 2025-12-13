import { createClient } from '@/lib/supabase/client';

export async function createWorkOrdersFromBOM(manufacturingOrderId: string, bomId: string): Promise<void> {
    // In a real app, BOM would have "Operations" or "Routing". 
    // We'll mock standard operations for this demo since we didn't add an `operations` table.

    const standardOperations = [
        'Material Staging',
        'Assembly',
        'Quality Inspection',
        'Packaging'
    ];

    const supabase = createClient();

    const workOrders = standardOperations.map(opName => ({
        manufacturing_order_id: manufacturingOrderId,
        name: opName,
        status: 'pending' as const
    }));

    const { error } = await supabase
        .from('work_orders')
        .insert(workOrders);

    if (error) {
        console.error('Error creating work orders:', error);
        // Don't throw here to avoid failing the whole MO creation if WO creation fails, 
        // but ideally this should be in a transaction.
    }
}
