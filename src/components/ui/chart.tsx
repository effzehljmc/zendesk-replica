"use client"

import { ReactNode } from "react"
import { Tooltip, TooltipProps } from "recharts"
import { cn } from "@/lib/utils"

interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContainerProps {
  children: ReactNode
  config: ChartConfig
  className?: string
}

export function ChartContainer({ children, config, className }: ChartContainerProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4 flex items-center gap-4">
        {Object.entries(config).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: value.color }} />
            <span className="text-sm text-muted-foreground">{value.label}</span>
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}

export function ChartTooltip(props: TooltipProps<any, any>) {
  return (
    <Tooltip
      {...props}
      content={({ active, payload }) => {
        if (active && payload?.length) {
          return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                {payload.map((entry: any) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        return null
      }}
    />
  )
} 