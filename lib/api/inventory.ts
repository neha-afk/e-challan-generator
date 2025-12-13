import { createClient } from '@/lib/supabase/client';

export async function getCurrentStock(productId: string): Promise<number> {
    const supabase = createClient();

    // Supabase doesn't support sum() easily in client-side queries without RPC or Views, 
    // but for this demo/prototype we can fetch all ledger entries and sum in JS.
    // In production, use a Database Function or View.

    const { data, error } = await supabase
        .from('stock_ledger')
        .select('quantity_change')
        .eq('product_id', productId);

    if (error) {
        console.error('Error fetching stock ledger:', error);
        throw error;
    }

    const currentStock = (data || []).reduce((acc, entry) => acc + entry.quantity_change, 0);
    return currentStock;
}

export async function checkMaterialAvailability(bomItems: any[], quantityToProduce: number): Promise<{
    available: boolean;
    missingItems: { name: string; required: number; available: number }[];
}> {
    const missingItems = [];

    for (const item of bomItems) {
        const required = item.quantity * quantityToProduce;
        // Optimization: Could run these in parallel
        const available = await getCurrentStock(item.component_product_id);

        if (available < required) {
            missingItems.push({
                name: item.component.name,
                required,
                available
            });
        }
    }

    return {
        available: missingItems.length === 0,
        missingItems
    };
}
