import { WorkOrder } from "@/types/database"
import { CheckCircle2, Circle, Clock } from "lucide-react"

interface TimelineViewProps {
    steps: WorkOrder[]
}

export function TimelineView({ steps }: TimelineViewProps) {
    // Sort steps by implicit order (assuming they are created in order or have integer order field, here we use array order)
    // Logic: Completed -> In Progress -> Pending

    return (
        <div className="flex w-full overflow-x-auto pb-4 pt-2">
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1
                return (
                    <div key={step.id} className="flex min-w-[150px] flex-col items-center">
                        {/* Connector Line */}
                        <div className={`relative flex w-full items-center justify-center`}>
                            <div className="absolute left-[50%] right-[-50%] top-3 h-[2px] bg-muted" style={{ display: isLast ? 'none' : 'block' }}>
                                <div
                                    className={`h-full bg-primary transition-all duration-500`}
                                    style={{ width: step.status === 'completed' ? '100%' : '0%' }}
                                />
                            </div>

                            {/* Icon */}
                            <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-4 ring-background">
                                {step.status === 'completed' ? (
                                    <CheckCircle2 className="h-6 w-6 text-primary" />
                                ) : step.status === 'in_progress' ? (
                                    <Clock className="h-6 w-6 text-amber-500 animate-pulse" />
                                ) : (
                                    <Circle className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                        </div>

                        {/* Label */}
                        <div className="mt-2 text-center">
                            <div className="text-xs font-medium">{step.name}</div>
                            <div className="text-[10px] text-muted-foreground">{step.work_center}</div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
