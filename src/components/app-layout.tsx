import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Outlet } from "react-router-dom"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/toaster"

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
        <Toaster />
      </main>
    </SidebarProvider>
  )
}
