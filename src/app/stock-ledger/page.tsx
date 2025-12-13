"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Download, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft } from "lucide-react"

import { fetchStockLedger, fetchAllStockLevels, StockLedgerWithProduct } from "@/lib/api/inventory"
import { fetchProducts } from "@/lib/api/products"
import { Product } from "@/types/database"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

export default function StockLedgerPage() {
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<StockLedgerWithProduct[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [stockLevels, setStockLevels] = useState<Record<string, number>>({})
    const [filterProduct, setFilterProduct] = useState<string>("all")

    useEffect(() => {
        loadData()
    }, [filterProduct])

    useEffect(() => {
        fetchProducts().then(setProducts)
        fetchAllStockLevels().then(setStockLevels)
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchStockLedger(filterProduct)

            // Calculate Running Balance (reverse order calculation for display)
            // Note: This is an approximation. Ideally, we calculate from the beginning.
            // For this view, since we sort DESC (newest first), we might just display the change.
            // True running balance in a filtered paginated view is complex without backend support.
            // We will compute it simply based on the fetched set for now, assuming full fetch.

            // Let's rely on the 'current stock' and subtract backwards to get historical balance
            // OR simply show the change. The prompt asks for "Running Balance".
            // Strategy: Sort ASC first, compute balance, then Sort DESC for display.

            const sortedAsc = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            // If filtering by ALL, running balance is meaningless per row unless grouped.
            // If filtering by Product, it makes perfect sense.
            // We'll only show Running Balance if a single product is selected, or else it's confusing.

            if (filterProduct !== 'all') {
                let balance = 0;
                sortedAsc.forEach(e => {
                    balance += e.quantity_change;
                    e.running_balance = balance;
                });
            }

            setEntries(sortedAsc.reverse()); // Show newest first
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleExport = () => {
        const headers = ['Date', 'Product', 'Type', 'Change', 'Reason', 'Reference'];
        const csvContent = [
            headers.join(','),
            ...entries.map(e => [
                format(new Date(e.created_at), 'yyyy-MM-dd HH:mm'),
                `"${e.product.name}"`,
                e.quantity_change > 0 ? 'IN' : 'OUT',
                e.quantity_change,
                `"${e.reason}"`,
                // Reference is implicitly the reason for now
                ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'stock_ledger.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const lowStockCount = Object.values(stockLevels).filter(qty => qty < 10).length;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Stock Ledger</h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{products.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">Items with &lt; 10 units</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Filter Product:</span>
                    <Select value={filterProduct} onValueChange={setFilterProduct}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="All Products" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead>Reason / Reference</TableHead>
                                {filterProduct !== 'all' && <TableHead className="text-right">Running Balance</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">No transactions found.</TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                                        <TableCell className="font-medium">{entry.product.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={entry.quantity_change > 0 ? "default" : "secondary"}>
                                                {entry.quantity_change > 0 ? (
                                                    <span className="flex items-center"><ArrowDownLeft className="mr-1 h-3 w-3" /> IN</span>
                                                ) : (
                                                    <span className="flex items-center"><ArrowUpRight className="mr-1 h-3 w-3" /> OUT</span>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right ${entry.quantity_change < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                            {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                                        </TableCell>
                                        <TableCell>{entry.reason}</TableCell>
                                        {filterProduct !== 'all' && (
                                            <TableCell className="text-right font-medium">{entry.running_balance}</TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
