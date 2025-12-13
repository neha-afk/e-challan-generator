"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

import { fetchProducts } from "@/lib/api/products"
import { fetchActiveBOM, BomWithItems } from "@/lib/api/bom"
import { checkMaterialAvailability } from "@/lib/api/inventory"
import { createManufacturingOrder } from "@/lib/api/manufacturing-orders"
import { createWorkOrdersFromBOM } from "@/lib/api/work-orders"
import { Product } from "@/types/database"

const formSchema = z.object({
    productId: z.string({
        required_error: "Please select a product.",
    }),
    quantity: z.coerce.number().int().positive({
        message: "Quantity must be a positive integer.",
    }),
    startDate: z.date({
        required_error: "A start date is required.",
    }).refine((date) => date > new Date(), {
        message: "Start date must be in the future.",
    }),
    assignee: z.string().optional(), // Mock assignee
})

interface CreateOrderFormProps {
    onSuccess: () => void
}

export function CreateOrderForm({ onSuccess }: CreateOrderFormProps) {
    const { toast } = useToast()
    const [products, setProducts] = useState<Product[]>([])
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [bom, setBom] = useState<BomWithItems | null>(null)
    const [stockStatus, setStockStatus] = useState<{ available: boolean; missingItems: any[] } | null>(null)
    const [calculatingStock, setCalculatingStock] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            quantity: 1,
        },
    })

    // Fetch products on mount
    useEffect(() => {
        async function loadProducts() {
            try {
                const data = await fetchProducts()
                setProducts(data)
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load products.",
                })
            } finally {
                setLoadingProducts(false)
            }
        }
        loadProducts()
    }, [toast])

    // Monitor product selection to load BOM
    const selectedProductId = form.watch("productId")
    const quantity = form.watch("quantity")

    useEffect(() => {
        async function loadBOMAndStock() {
            if (!selectedProductId) return

            setBom(null)
            setStockStatus(null)
            setCalculatingStock(true)

            try {
                const bomData = await fetchActiveBOM(selectedProductId)
                setBom(bomData)

                if (bomData && quantity > 0) {
                    const availability = await checkMaterialAvailability(bomData.items, quantity)
                    setStockStatus(availability)
                }
            } catch (error) {
                console.error("Error loading BOM/Stock", error)
            } finally {
                setCalculatingStock(false)
            }
        }

        loadBOMAndStock()
    }, [selectedProductId, quantity])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            // 1. Create Manufacturing Order
            const orderId = await createManufacturingOrder({
                product_id: values.productId,
                quantity: values.quantity,
                start_date: values.startDate.toISOString(),
                status: 'confirmed', // Planned
            })

            // 2. Create Work Orders (if BOM exists)
            if (bom) {
                await createWorkOrdersFromBOM(orderId, bom.id)
            }

            toast({
                title: "Order Created",
                description: "Manufacturing order has been scheduled successfully.",
            })

            onSuccess()
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "There was a problem creating the order.",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="productId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Product</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingProducts ? "Loading..." : "Select product"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {products.map((product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name} ({product.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                    <Input type="number" min={1} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Schedule Start Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                            date < new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="assignee"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assignee (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="user1">Alice Smith</SelectItem>
                                    <SelectItem value="user2">Bob Jones</SelectItem>
                                    <SelectItem value="user3">Charlie Day</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Summary Section */}
                {selectedProductId && (
                    <div className="rounded-md border bg-muted/50 p-4">
                        <h4 className="mb-2 text-sm font-medium">Material Summary</h4>
                        {calculatingStock ? (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking inventory...
                            </div>
                        ) : bom ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">BOM used:</span>
                                    <span>{bom.name} (v{bom.version})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Components required:</span>
                                    <span>{bom.items.length} items</span>
                                </div>

                                {stockStatus && !stockStatus.available && (
                                    <div className="mt-2 rounded bg-yellow-100 p-2 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                                        <div className="flex items-center font-semibold">
                                            <AlertTriangle className="mr-2 h-4 w-4" /> Insufficient Stock
                                        </div>
                                        <ul className="mt-1 list-disc pl-5">
                                            {stockStatus.missingItems.map((item: any, idx) => (
                                                <li key={idx}>
                                                    {item.name}: Need {item.required}, Have {item.available}
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="mt-1 text-xs">You can still create the order, but work may be blocked.</p>
                                    </div>
                                )}
                                {stockStatus && stockStatus.available && (
                                    <div className="mt-2 text-green-600 dark:text-green-400">
                                        ✓ All materials available
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">No active BOM found for this product. Work orders will not be generated automatically.</div>
                        )}
                    </div>
                )}

                <div className="flex justify-end space-x-2">
                    <Button disabled={isSubmitting} type="submit">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Order
                    </Button>
                </div>
            </form>
        </Form>
    )
}
