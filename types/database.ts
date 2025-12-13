export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            manufacturing_orders: {
                Row: {
                    id: string
                    created_at: string
                    product_id: string
                    quantity: number
                    status: 'draft' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
                    due_date: string | null
                    start_date: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    product_id: string
                    quantity: number
                    status?: 'draft' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
                    due_date?: string | null
                    start_date?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    product_id?: string
                    quantity?: number
                    status?: 'draft' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
                    due_date?: string | null
                    start_date?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "manufacturing_orders_product_id_fkey"
                        columns: ["product_id"]
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            products: {
                Row: {
                    id: string
                    name: string
                    sku: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    sku: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    sku?: string
                    created_at?: string
                }
                Relationships: []
            }
            bill_of_materials: {
                Row: {
                    id: string
                    product_id: string
                    name: string
                    version: string
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id: string
                    name: string
                    version?: string
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    product_id?: string
                    name?: string
                    version?: string
                    is_active?: boolean
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "bill_of_materials_product_id_fkey"
                        columns: ["product_id"]
                        referencedRelation: "products"
                        created_at: string
                    }
                Insert: {
                        id?: string
                        product_id: string
                        quantity_change: number
                        reason: string
                        created_at?: string
                    }
                Update: {
                        id?: string
                        product_id?: string
                        quantity_change?: number
                        reason?: string
                        created_at?: string
                    }
                Relationships: [
                        {
                            foreignKeyName: "stock_ledger_product_id_fkey"
                            columns: ["product_id"]
                            referencedRelation: "products"
                            referencedColumns: ["id"]
                        }
                    ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}

export type ManufacturingOrder = Database['public']['Tables']['manufacturing_orders']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type BillOfMaterial = Database['public']['Tables']['bill_of_materials']['Row']
export type BomItem = Database['public']['Tables']['bom_items']['Row']
export type WorkOrder = Database['public']['Tables']['work_orders']['Row']
export type StockLedgerEntry = Database['public']['Tables']['stock_ledger']['Row']
