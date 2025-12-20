import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboard, Bot, Server, Boxes, ListTodo, ScrollText, Activity } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"

export function AppSidebar() {
  const { t } = useTranslation()
  const location = useLocation()

  const items = [
    {
      title: t('common.dashboard'),
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: t('common.workers'),
      url: "/workers",
      icon: Bot,
    },
    {
      title: t('common.runners'),
      url: "/runners",
      icon: Server,
    },
    {
      title: t('common.function_sets'),
      url: "/function-sets",
      icon: Boxes,
    },
    {
      title: t('common.jobs'),
      url: "/jobs",
      icon: ListTodo,
    },
    {
      title: t('common.results'),
      url: "/results",
      icon: ScrollText,
    },
    {
      title: t('common.system'),
      url: "/system",
      icon: Activity,
    },
  ]

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>JobWorkerp Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
