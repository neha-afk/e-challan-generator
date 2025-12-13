import { createClient } from '@/lib/supabase/client';
import { Product } from '@/types/database';

export async function fetchProducts(): Promise<Product[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        throw error;
    }

    return data || [];
}
