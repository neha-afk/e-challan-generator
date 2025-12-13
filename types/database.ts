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
