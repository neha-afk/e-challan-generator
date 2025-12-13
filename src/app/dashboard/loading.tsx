import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function DashboardLoading() {
    return (
        <div className="h-full w-full flex items-center justify-center min-h-[50vh]">
            <LoadingSpinner size={48} />
        </div>
    )
}
