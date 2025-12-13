import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: ReactNode
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center p-8 border rounded-lg border-dashed min-h-[400px]",
                className
            )}
        >
            <div className="bg-muted p-4 rounded-full mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
            {action}
        </div>
    )
}
