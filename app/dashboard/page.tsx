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

// Simple Tabs implementation since we didn't scaffold the full Tabs component yet
// or we can use state for tabs. State is easier for now to ensure it works without more files.
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
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Manufacturing Order</DialogTitle>
                                <DialogDescription>
                                    Create Order Form Coming Soon
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

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

                <OrdersTable statusFilter={activeTab} />
            </div>
        </div>
    )
}
