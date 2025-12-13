"use client"

import { useEffect } from "react"
import { ErrorDisplay } from "@/components/ui/error-display"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <ErrorDisplay
            title="Dashboard Error"
            message={error.message || "Something went wrong while loading the dashboard."}
            onRetry={reset}
        />
    )
}
