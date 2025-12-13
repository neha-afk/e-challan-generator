import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface ErrorDisplayProps {
    title?: string
    message: string
    onRetry?: () => void
}

export function ErrorDisplay({
    title = "Something went wrong",
    message,
    onRetry,
}: ErrorDisplayProps) {
    return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
            <Card className="w-full max-w-md border-destructive/50">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle className="text-destructive">{title}</CardTitle>
                    <CardDescription className="text-destructive/80">
                        {message}
                    </CardDescription>
                </CardHeader>
                {onRetry && (
                    <CardFooter className="justify-center">
                        <Button onClick={onRetry} variant="outline" className="gap-2">
                            <RotateCcw className="h-4 w-4" />
                            Try Again
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    )
}
