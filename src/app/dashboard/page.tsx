"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database } from "../../../types/database"

type MOStatus = Database["public"]["Enums"]["mo_status"]
type FilterType = "all" | MOStatus

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<FilterType>("all")

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manufacturing Orders</h1>
                    <p className="text-muted-foreground">
                        Manage and track your production orders.
                    </p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Order
                </Button>
            </div>

            {/* Filters */}
            <Tabs defaultValue="all" className="w-full" onValueChange={(val) => setActiveTab(val as FilterType)}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="planned">Planned</TabsTrigger>
                    <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                    <TabsTrigger value="done">Done</TabsTrigger>
                    <TabsTrigger value="canceled">Canceled</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Orders List Placeholder */}
            <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed">
                <div className="max-w-md space-y-4">
                    <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto flex items-center justify-center">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-xl">No orders found</CardTitle>
                    <CardDescription>
                        {activeTab === "all"
                            ? "You haven't created any manufacturing orders yet."
                            : `You don't have any orders with status "${activeTab.replace('_', ' ')}".`}
                    </CardDescription>
                    {activeTab === "all" && (
                        <Button variant="outline">Create your first order</Button>
                    )}
                </div>
            </Card>

            {/* Debug Info (Optional, can remove later) */}
            <div className="text-xs text-muted-foreground mt-4">
                Current Filter: <span className="font-mono text-primary">{activeTab}</span>
            </div>
        </div>
    )
}
