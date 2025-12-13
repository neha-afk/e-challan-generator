"use client"

import * as React from "react"
import { TopNavbar } from "./top-navbar"
import { Sidebar } from "./sidebar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AppShellProps {
    children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <TopNavbar onMobileMenuClick={() => setIsMobileMenuOpen(true)} />

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden w-64 flex-col border-r md:flex">
                    <Sidebar />
                </aside>

                {/* Mobile Sidebar */}
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetContent side="left" className="p-0 w-64">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
                    </SheetContent>
                </Sheet>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0">
                    <ScrollArea className="flex-1 h-[calc(100vh-4rem)]">
                        <div className="p-4 md:p-6 lg:p-8">
                            {children}
                        </div>
                    </ScrollArea>
                </main>
            </div>
        </div>
    )
}
