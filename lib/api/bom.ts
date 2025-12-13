import { createClient } from '@/lib/supabase/client';
import { BillOfMaterial, BomItem, Product } from '@/types/database';

export type BomWithItems = BillOfMaterial & {
    items: (BomItem & {
        component: Product
    })[]
};

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
        items: itemsData as any // Casting because Supabase types with joins can be tricky
    };
}
