"use client"

import { useEffect, useState } from "react"
import { Activity, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"

import { fetchDashboardStats, DashboardStats } from "@/lib/api/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AnalyticsCards() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchDashboardStats()
                setStats(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
        )
    }

    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                    <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.activeOrders}</div>
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <TrendingUp className="mr-1 h-3 w-3 text-green-500" /> +2 from yesterday
                    </p>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.completedToday}</div>
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <span className="text-green-500 font-medium">On track</span>
                    </p>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
                    <AlertTriangle className={`h-4 w-4 ${stats.stockAlerts > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${stats.stockAlerts > 0 ? 'text-destructive' : ''}`}>{stats.stockAlerts}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Items below threshold
                    </p>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.efficiency}%</div>
                    <p className="text-xs text-muted-foreground flex items-center mt-1">
                        {stats.efficiency >= 100 ? (
                            <span className="text-green-500 flex items-center"><TrendingUp className="mr-1 h-3 w-3" /> +5%</span>
                        ) : (
                            <span className="text-amber-500 flex items-center"><TrendingDown className="mr-1 h-3 w-3" /> -2%</span>
                        )}
                        &nbsp;vs target
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
