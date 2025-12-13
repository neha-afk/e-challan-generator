import { createClient } from '@/lib/supabase/client';
import { StockLedgerEntry } from '@/types/database';

export async function getCurrentStock(productId: string): Promise<number> {
    const supabase = createClient();
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

export async function fetchAllStockLevels(): Promise<Record<string, number>> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('stock_ledger')
        .select('product_id, quantity_change');

    if (error) {
        console.error('Error fetching stock ledger:', error);
        throw error;
    }

    const stockLevels: Record<string, number> = {};
    (data || []).forEach(entry => {
        stockLevels[entry.product_id] = (stockLevels[entry.product_id] || 0) + entry.quantity_change;
    });

    return stockLevels;
}

export interface StockLedgerWithProduct extends StockLedgerEntry {
    product: {
        name: string;
        sku: string;
    };
    running_balance?: number; // Calculated on client
}

export async function fetchStockLedger(productId?: string): Promise<StockLedgerWithProduct[]> {
    const supabase = createClient();
    let query = supabase
        .from('stock_ledger')
        .select(`
            *,
            product:products(name, sku)
        `)
        .order('created_at', { ascending: false });

    if (productId && productId !== 'all') {
        query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching stock ledger:', error);
        throw error;
    }

    return data as StockLedgerWithProduct[];
}

export async function checkMaterialAvailability(bomItems: { component_product_id: string; quantity: number; component: { name: string } }[], quantityToProduce: number): Promise<{
    available: boolean;
    missingItems: { name: string; required: number; available: number }[];
}> {
    const missingItems = [];

    for (const item of bomItems) {
        const required = item.quantity * quantityToProduce;
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
