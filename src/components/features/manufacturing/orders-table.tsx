"use client"

import { useEffect, useState } from "react"
import { Edit, Trash2 } from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { fetchManufacturingOrders } from "@/lib/api/manufacturing-orders"
import { ManufacturingOrderWithDetails } from "@/types/app"

interface OrdersTableProps {
    statusFilter?: string
}

export function OrdersTable({ statusFilter }: OrdersTableProps) {
    const [orders, setOrders] = useState<ManufacturingOrderWithDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        const loadOrders = async () => {
            setLoading(true)
            setError(null)
            try {
                const filter = statusFilter && statusFilter !== 'all' ? { status: [statusFilter as any] } : undefined
                const data = await fetchManufacturingOrders(filter)
                setOrders(data)
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch orders'))
            } finally {
                setLoading(false)
            }
        }

        loadOrders()
    }, [statusFilter])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': // Planned
                return 'default' // Blue-ish usually for primary
            case 'in_progress':
                return 'secondary' // Yellow/Orange often mapped here or custom
            case 'done':
                return 'default' // Green - we might need a specific success variant but default works for now
            case 'cancelled':
                return 'secondary' // Gray
            default:
                return 'outline'
        }
    }

    // Helper to format date
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString()
    }

    if (loading) {
        return <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    }

    if (error) {
        return <div className="p-4 text-red-500">Error: {error.message}</div>
    }

    if (orders.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No orders found matching the criteria.</div>
    }

    return (
        <>
            {/* Mobile View - Cards */}
            <div className="grid gap-4 md:hidden">
                {orders.map((order) => (
                    <Card key={order.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {order.id.substring(0, 8)}...
                            </CardTitle>
                            <Badge variant={getStatusColor(order.status) as any}>
                                {order.status}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{order.product?.name || 'Unknown Product'}</div>
                            <p className="text-xs text-muted-foreground">
                                Qty: {order.quantity} | Due: {formatDate(order.due_date)}
                            </p>
                            <div className="mt-4 flex justify-end space-x-2">
                                <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden rounded-md border md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                                <TableCell>{order.product?.name}</TableCell>
                                <TableCell>{order.quantity}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusColor(order.status) as any}>
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{formatDate(order.start_date)}</TableCell>
                                <TableCell>Unassigned</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}
