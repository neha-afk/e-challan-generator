"use client"

import { useState } from "react"
import { Play, Pause, CheckSquare, Clock, MapPin, User } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { WorkOrderWithMO, startWorkOrder, pauseWorkOrder, completeWorkOrder } from "@/lib/api/work-orders"

interface WorkOrderCardProps {
    workOrder: WorkOrderWithMO
    onUpdate: () => void
}

export function WorkOrderCard({ workOrder, onUpdate }: WorkOrderCardProps) {
    const [loading, setLoading] = useState(false)

    const handleStart = async () => {
        setLoading(true)
        try {
            await startWorkOrder(workOrder.id)
            onUpdate()
        } finally {
            setLoading(false)
        }
    }

    const handlePause = async () => {
        setLoading(true)
        try {
            await pauseWorkOrder(workOrder.id, workOrder.actual_duration || 0)
            onUpdate()
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = async () => {
        setLoading(true)
        try {
            await completeWorkOrder(workOrder.id, workOrder.actual_duration || 0)
            onUpdate()
        } finally {
            setLoading(false)
        }
    }

    const isCompleted = workOrder.status === 'completed'
    const isInProgress = workOrder.status === 'in_progress'

    return (
        <Card className={`relative overflow-hidden transition-all ${isCompleted ? 'bg-muted/30' : ''}`}>
            {isInProgress && (
                <div className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
            )}
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{workOrder.name}</CardTitle>
                    <Badge variant={
                        isCompleted ? 'default' :
                            isInProgress ? 'secondary' :
                                'outline'
                    }>
                        {workOrder.status.replace('_', ' ')}
                    </Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="mr-1 h-3 w-3" /> {workOrder.work_center}
                </div>
            </CardHeader>
            <CardContent className="pb-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-xs text-muted-foreground">Est. Time</p>
                        <p>{workOrder.estimated_duration}m</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Actual Time</p>
                        <p className={workOrder.actual_duration > workOrder.estimated_duration ? 'text-destructive font-semibold' : ''}>
                            {workOrder.actual_duration}m
                        </p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Assignee</p>
                        <div className="flex items-center">
                            <User className="mr-1 h-3 w-3" />
                            {workOrder.assignee_id ? 'Alice Smith' : 'Unassigned'}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 pt-2">
                {!isCompleted && !isInProgress && (
                    <Button size="sm" onClick={handleStart} disabled={loading}>
                        <Play className="mr-2 h-4 w-4" /> Start
                    </Button>
                )}
                {isInProgress && (
                    <>
                        <Button size="sm" variant="outline" onClick={handlePause} disabled={loading}>
                            <Pause className="mr-2 h-4 w-4" /> Pause
                        </Button>
                        <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={loading}>
                            <CheckSquare className="mr-2 h-4 w-4" /> Complete
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    )
}
