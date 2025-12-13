
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
    console.log('Testing Supabase Connection...');

    // 1. Check Products and Stock
    console.log('\n--- Products & Stock Levels ---');
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('name, sku, current_stock_computed:stock_ledger(quantity)'); // Note: using simple join/calculation or just querying separate since I added a function?

    // Wait, I added get_stock_available function. Let's call it or just sum manually.
    // Or check the 'stock_ledger' directly.

    if (prodError) {
        console.error('Error fetching products:', prodError);
    } else {
        // Manually aggregate for display if needed, or if I had a view. 
        // The previous migration added `get_stock_available`. We can call that via RPC or select.
        // Let's just list products first.
        console.table(products?.map(p => ({
            name: p.name,
            sku: p.sku
            // stock: ... (would need to fetch via RPC)
        })));
    }

    // 2. Check Manufacturing Orders
    console.log('\n--- Manufacturing Orders ---');
    const { data: mos, error: moError } = await supabase
        .from('manufacturing_orders')
        .select(`
      id,
      quantity,
      status,
      product:products(name),
      work_orders(id, status, description)
    `);

    if (moError) {
        console.error('Error fetching MOs:', moError);
    } else {
        mos?.forEach(mo => {
            console.log(`MO for ${mo.quantity} x ${(mo.product as any).name} [${mo.status}]`);
            mo.work_orders.forEach((wo: any) => {
                console.log(`  - WO: ${wo.description} (${wo.status})`);
            });
        });
    }

    // 3. BOM Verification
    console.log('\n--- BOMs ---');
    const { data: boms, error: bomError } = await supabase
        .from('bill_of_materials')
        .select(`
      name,
      product:products(name),
      bom_components(quantity, component:products(name)),
      bom_operations(description, duration_minutes)
    `);

    if (bomError) console.error(bomError);
    else {
        boms?.forEach(bom => {
            console.log(`BOM: ${bom.name} for ${(bom.product as any).name}`);
            console.log('  Components:');
            bom.bom_components.forEach((c: any) => console.log(`    - ${c.quantity} x ${(c.component as any).name}`));
            console.log('  Operations:');
            bom.bom_operations.forEach((op: any) => console.log(`    - ${op.description} (${op.duration_minutes} min)`));
        });
    }
}

testDatabase();
