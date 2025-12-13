"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Home,
    Package,
    ClipboardList,
    Building2,
    Archive,
    FileText,
} from "lucide-react"

interface SidebarProps {
    className?: string
    onItemClick?: () => void
}

export function Sidebar({ className, onItemClick }: SidebarProps) {
    const pathname = usePathname()

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: Home },
        { name: "Manufacturing Orders", href: "/dashboard", icon: Package },
        { name: "Work Orders", href: "/work-orders", icon: ClipboardList },
        { name: "Work Centers", href: "/work-centers", icon: Building2 },
        { name: "Stock Ledger", href: "/stock-ledger", icon: Archive },
        { name: "Bills of Material", href: "/boms", icon: FileText },
    ]

    return (
        <div className={cn("pb-12 h-full bg-background", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onItemClick}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                                    pathname === item.href
                                        ? "bg-accent text-accent-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
