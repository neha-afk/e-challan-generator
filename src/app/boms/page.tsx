"use client"

import { useEffect, useState } from "react"
import { Plus, Settings, Layers, DollarSign, Clock } from "lucide-react"

import { fetchAllBOMs, fetchActiveBOM, createBOM, BomWithProduct, BomWithItems } from "@/lib/api/bom"
import { fetchProducts } from "@/lib/api/products"
import { Product } from "@/types/database"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export default function BOMPage() {
    const [boms, setBoms] = useState<BomWithProduct[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    // Create Form State
    const [newBomProduct, setNewBomProduct] = useState("")
    const [newBomName, setNewBomName] = useState("Standard BOM")
    const [dialogOpen, setDialogOpen] = useState(false)

    // Detail View State
    const [selectedBom, setSelectedBom] = useState<BomWithItems | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [bomsData, productsData] = await Promise.all([
                fetchAllBOMs(),
                fetchProducts()
            ])
            setBoms(bomsData)
            setProducts(productsData)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        try {
            // MVP: Creating a BOM with a single dummy item just to show it works
            // In real app, this would be a dynamic form builder
            const placeholderItem = products.find(p => p.id !== newBomProduct); // Just pick another product

            if (!placeholderItem) return;

            await createBOM(newBomProduct, newBomName, [
                { componentId: placeholderItem.id, quantity: 10, unit: 'pcs' }
            ]);

            toast({ title: "BOM Created", description: "Successfully created new Bill of Materials." })
            setDialogOpen(false)
            loadData()
        } catch (e) {
            toast({ title: "Error", description: "Failed to create BOM", variant: "destructive" })
        }
    }

    const openDetails = async (productId: string) => {
        const fullBom = await fetchActiveBOM(productId);
        setSelectedBom(fullBom);
    }

    // Mock Cost Calculation
    const calculateCost = (bom: BomWithItems) => {
        // Mock component costs ($10 per item)
        const materialCost = bom.items.reduce((acc, item) => acc + (item.quantity * 10), 0);

        // Mock labor (fixed 2 hours @ $50/hr)
        const laborCost = 100;

        return { materialCost, laborCost, total: materialCost + laborCost };
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Bill of Materials</h2>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Create BOM</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New BOM</DialogTitle>
                            <DialogDescription>Create a basic BOM structure. Components can be edited later.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="product" className="text-right">Product</Label>
                                <Select onValueChange={setNewBomProduct} value={newBomProduct}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select product..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">BOM Name</Label>
                                <Input id="name" value={newBomName} onChange={e => setNewBomName(e.target.value)} className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create BOM</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {boms.map(bom => (
                    <Card key={bom.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>{bom.product.name}</CardTitle>
                                <Badge variant={bom.is_active ? 'default' : 'secondary'}>{bom.version}</Badge>
                            </div>
                            <CardDescription>SKU: {bom.product.sku}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <Layers className="mr-1 h-4 w-4" /> {bom.items_count} Components
                                </div>
                                <div className="flex items-center">
                                    <Settings className="mr-1 h-4 w-4" /> 4 Operations
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="w-full" onClick={() => openDetails(bom.product_id)}>View Details</Button>
                                </SheetTrigger>
                                <SheetContent className="sm:max-w-xl overflow-y-auto">
                                    <SheetHeader>
                                        <SheetTitle>{bom.product.name} - BOM Details</SheetTitle>
                                        <SheetDescription>Version {bom.version}</SheetDescription>
                                    </SheetHeader>

                                    {selectedBom?.id === bom.id ? (
                                        <div className="mt-6 space-y-6">
                                            {/* Cost Summary */}
                                            <div className="rounded-lg bg-muted p-4">
                                                <h4 className="mb-2 font-semibold flex items-center"><DollarSign className="mr-2 h-4 w-4" /> Estimated Cost</h4>
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-muted-foreground">Materials</div>
                                                        <div className="font-medium">${calculateCost(selectedBom).materialCost.toFixed(2)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground">Labor</div>
                                                        <div className="font-medium">${calculateCost(selectedBom).laborCost.toFixed(2)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground">Total</div>
                                                        <div className="font-bold text-primary">${calculateCost(selectedBom).total.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Components List */}
                                            <div>
                                                <h4 className="mb-3 font-semibold flex items-center"><Layers className="mr-2 h-4 w-4" /> Components</h4>
                                                <div className="space-y-2">
                                                    {selectedBom.items.map(item => (
                                                        <div key={item.id} className="flex justify-between items-center rounded-md border p-2 text-sm">
                                                            <div>
                                                                <div className="font-medium">{item.component.name}</div>
                                                                <div className="text-xs text-muted-foreground">SKU: {item.component.sku}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold">{item.quantity} {item.unit}</div>
                                                                <div className="text-xs text-muted-foreground">Approx. ${(item.quantity * 10).toFixed(2)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Operations List */}
                                            <div>
                                                <h4 className="mb-3 font-semibold flex items-center"><Settings className="mr-2 h-4 w-4" /> Operations</h4>
                                                <div className="space-y-2">
                                                    {/* Mocked Operations since we don't have table yet */}
                                                    {['Cutting', 'Assembly', 'Finish', 'QC'].map((op, i) => (
                                                        <div key={op} className="flex justify-between items-center rounded-md border p-2 text-sm">
                                                            <div className="font-medium">{op}</div>
                                                            <div className="flex items-center text-muted-foreground">
                                                                <Clock className="mr-1 h-3 w-3" /> {(i + 1) * 15} min
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-8 text-center text-muted-foreground">Loading details...</div>
                                    )}
                                </SheetContent>
                            </Sheet>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
