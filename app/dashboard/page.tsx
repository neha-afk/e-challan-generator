"use client"

import { useState } from "react"
import { Layers, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { OrdersTable } from "@/components/features/manufacturing/orders-table"
import { CreateOrderForm } from "@/components/features/manufacturing/create-order-form"
import { AnalyticsCards } from "@/components/features/dashboard/analytics-cards"

const TABS = [
    { value: 'all', label: 'All Orders' },
    { value: 'confirmed', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
]

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('all')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleOrderCreated = () => {
        setIsDialogOpen(false)
        setRefreshTrigger(prev => prev + 1) // Trigger table refresh
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Manufacturing Orders</h2>
                <div className="flex items-center space-x-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Order
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Create Manufacturing Order</DialogTitle>
                                <DialogDescription>
                                    Schedule a new production run. BOM will be loaded automatically.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <CreateOrderForm onSuccess={handleOrderCreated} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <AnalyticsCards />

            <div className="space-y-4">
                {/* Custom Tabs specific for this page */}
                <div className="flex space-x-1 rounded-lg bg-muted p-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`
                        flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all
                        ${activeTab === tab.value
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                                }
                    `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <OrdersTable key={refreshTrigger} statusFilter={activeTab} />
            </div>
        </div>
    )
}
