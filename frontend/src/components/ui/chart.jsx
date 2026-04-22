import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

const ChartContainer = React.forwardRef(({ id, className, children, config = {} }, ref) => {
  const chartId = React.useId().replace(/:/g, "")
  const containerId = `chart-${id || chartId}`

  const style = Object.entries(config).reduce((acc, [key, value]) => {
    if (value?.color) {
      acc[`--color-${key}`] = value.color
    }
    return acc
  }, {})

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={containerId}
        ref={ref}
        className={cn("h-[260px] w-full", className)}
        style={style}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef(({ active, payload, className, formatter }, ref) => {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg",
        className
      )}
    >
      <div className="space-y-1">
        {payload.map((item) => {
          const key = item.dataKey
          const label = config?.[key]?.label || key
          const color = item.color || config?.[key]?.color || "#64748b"
          const val = formatter ? formatter(item.value, key, item) : item.value

          return (
            <div key={`${key}-${item.value}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </div>
              <span className="font-semibold text-slate-900">{val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = ({ payload }) => {
  const { config } = useChart()

  if (!payload?.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
      {payload.map((item) => {
        const key = item.dataKey
        const label = config?.[key]?.label || key
        const color = item.color || config?.[key]?.color || "#64748b"

        return (
          <div key={key} className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
}
