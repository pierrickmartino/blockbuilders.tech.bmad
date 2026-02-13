"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import NotificationBell from "@/components/NotificationBell"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/strategies": "Strategies",
  "/profile": "Profile",
  "/how-backtests-work": "How It Works",
  "/metrics-glossary": "Metrics Glossary",
  "/market": "Market",
  "/alerts": "Alerts",
  "/progress": "Progress",
}

export function SiteHeader() {
  const pathname = usePathname()

  const getPageTitle = () => {
    if (pageTitles[pathname]) {
      return pageTitles[pathname]
    }
    if (pathname.startsWith("/strategies/") && pathname.includes("/canvas")) {
      return "Strategy Canvas"
    }
    if (pathname.startsWith("/strategies/") && pathname.includes("/backtest")) {
      return "Backtest Results"
    }
    if (pathname.startsWith("/strategies/")) {
      return "Strategy Details"
    }
    return "Blockbuilders"
  }

  const pageTitle = getPageTitle()

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link href="/dashboard" className="text-muted-foreground/70 transition-colors hover:text-foreground">
                Blockbuilders
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
      </div>
      {/* Subtle bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </header>
  )
}
