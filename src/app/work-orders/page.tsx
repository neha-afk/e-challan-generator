"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { WorkOrderWithMO, fetchWorkOrders } from "@/lib/api/work-orders"
import { WorkOrderCard } from "@/components/features/manufacturing/work-order-card"
import { TimelineView } from "@/components/features/manufacturing/timeline-view"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type GroupedWorkOrders = Record<string, {
    moId: string;
    productName: string;
    orders: WorkOrderWithMO[];
}>;

export default function WorkOrdersPage() {
    const [workOrders, setWorkOrders] = useState<WorkOrderWithMO[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'my_work' | 'in_progress'>('all')

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchWorkOrders(filter)
            setWorkOrders(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [filter])

    // Group by MO
    const groupedOrders: GroupedWorkOrders = workOrders.reduce((acc, wo) => {
        const moId = wo.manufacturing_order_id;
        if (!acc[moId]) {
            acc[moId] = {
                moId: moId,
                productName: wo.manufacturing_order?.product?.name || 'Unknown Product',
                orders: []
            }
        }
        acc[moId].orders.push(wo);
        return acc;
    }, {} as GroupedWorkOrders);

    const sortedGroups = Object.values(groupedOrders).sort((a, b) => b.moId.localeCompare(a.moId));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Work Orders</h2>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground mr-2">Filter:</span>
                    <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Work Orders</SelectItem>
                            <SelectItem value="my_work">My Work Orders</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="space-y-8">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedGroups.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">No work orders found.</div>
                    ) : (
                        sortedGroups.map((group) => (
                            <div key={group.moId} className="rounded-lg border bg-card p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">{group.productName}</h3>
                                        <p className="text-sm text-muted-foreground">MO #{group.moId.split('-')[0]}</p>
                                    </div>
                                    <div className="hidden md:block">
                                        <TimelineView steps={group.orders} />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {group.orders.map(order => (
                                        <WorkOrderCard
                                            key={order.id}
                                            workOrder={order}
                                            onUpdate={loadData}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
