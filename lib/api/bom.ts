import { createClient } from '@/lib/supabase/client';
import { BillOfMaterial, BomItem, Product } from '@/types/database';

export type BomWithItems = BillOfMaterial & {
    items: (BomItem & {
        component: Product
    })[]
};

export type BomWithProduct = BillOfMaterial & {
    product: Product;
    items_count?: number; // Added via aggregation or join in query
};

export async function fetchAllBOMs(): Promise<BomWithProduct[]> {
    const supabase = createClient();

    // Fetch BOMs with Product details
    const { data: boms, error } = await supabase
        .from('bill_of_materials')
        .select(`
            *,
            product:products(*)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch counts - simple N+1 for this demo, usually better with a view
    const bomsWithCounts = await Promise.all(boms.map(async (bom) => {
        const { count } = await supabase
            .from('bom_items')
            .select('*', { count: 'exact', head: true })
            .eq('bom_id', bom.id);

        return {
            ...bom,
            items_count: count || 0
        };
    }));

    return bomsWithCounts as BomWithProduct[];
}

export async function fetchActiveBOM(productId: string): Promise<BomWithItems | null> {
    const supabase = createClient();

    // First fetch the active BOM
    const { data: bomData, error: bomError } = await supabase
        .from('bill_of_materials')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .single();

    if (bomError) {
        // It's possible there is no active BOM
        if (bomError.code === 'PGRST116') return null; // No rows found
        console.error('Error fetching BOM:', bomError);
        throw bomError;
    }

    if (!bomData) return null;

    // Then fetch the items for this BOM
    const { data: itemsData, error: itemsError } = await supabase
        .from('bom_items')
        .select(`
      *,
      component:products(*)
    `)
        .eq('bom_id', bomData.id);

    if (itemsError) {
        console.error('Error fetching BOM items:', itemsError);
        throw itemsError;
    }

    return {
        ...bomData,
        items: itemsData as (BomItem & { component: Product })[]
    };
}

export async function createBOM(productId: string, name: string, items: { componentId: string, quantity: number, unit: string }[]): Promise<string> {
    const supabase = createClient();

    // 1. Create BOM
    const { data: bom, error: bomError } = await supabase
        .from('bill_of_materials')
        .insert({
            product_id: productId,
            name: name,
            version: '1.0',
            is_active: true
        })
        .select('id')
        .single();

    if (bomError) throw bomError;

    // 2. Insert Items
    const toInsert = items.map(item => ({
        bom_id: bom.id,
        component_product_id: item.componentId,
        quantity: item.quantity,
        unit: item.unit
    }));

    const { error: itemsError } = await supabase
        .from('bom_items')
        .insert(toInsert);

    if (itemsError) throw itemsError;

    return bom.id;
}
