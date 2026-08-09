import { useEffect, useMemo, useRef } from "react"
import { useTheme } from "next-themes"
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d"
import type { Goal } from "@/lib/api"

interface GraphNode {
  id: string
  title: string
  status: string
}

interface GraphLink {
  source: string
  target: string
}

const MAX_LABEL = 32

function themePalette(dark: boolean) {
  return dark
    ? {
        goal: "#f4f4f5",
        label: "#e4e4e7",
        link: "rgba(255,255,255,0.14)",
        labelBg: "rgba(24,24,27,0.85)",
      }
    : {
        goal: "#27272a",
        label: "#27272a",
        link: "rgba(24,24,27,0.22)",
        labelBg: "rgba(255,255,255,0.92)",
      }
}

export default function GoalGraph({ goals }: { goals: Goal[] }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  const palette = themePalette(dark)
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>()
  const fittedRef = useRef(false)

  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = goals.map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
    }))
    const graphLinks: GraphLink[] = []
    for (const g of goals) {
      if (g.parent_goal_id) graphLinks.push({ source: g.parent_goal_id, target: g.id })
    }
    return { nodes, links: graphLinks }
  }, [goals, dark])

  useEffect(() => {
    fittedRef.current = false
  }, [goals, dark])

  useEffect(() => {
    fgRef.current?.d3Force("link")?.distance(85)
    fgRef.current?.d3Force("charge")?.strength(-160)
  }, [])

  return (
    <div className="relative h-[60vh] min-h-[440px] w-full overflow-hidden rounded-lg border bg-background">
      {nodes.length > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes, links }}
          nodeLabel={(n) => n.title}
          nodeRelSize={8}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode & { x: number; y: number }
            const r = 10
            const fontSize = 12.5 / globalScale
            const label =
              n.title.length > MAX_LABEL ? `${n.title.slice(0, MAX_LABEL)}…` : n.title

            ctx.font = `${fontSize}px Inter, ui-sans-serif, system-ui`
            const textW = ctx.measureText(label).width
            const padX = 5 / globalScale
            const padY = 3 / globalScale

            ctx.beginPath()
            ctx.roundRect(
              n.x + r + 2,
              n.y - (fontSize + padY * 2) / 2,
              textW + padX * 2,
              fontSize + padY * 2,
              3 / globalScale,
            )
            ctx.fillStyle = palette.labelBg
            ctx.fill()

            ctx.beginPath()
            ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
            ctx.fillStyle = palette.goal
            ctx.fill()

            ctx.fillStyle = palette.label
            ctx.textAlign = "left"
            ctx.textBaseline = "middle"
            ctx.fillText(label, n.x + r + 2 + padX, n.y)
          }}
          linkColor={() => palette.link}
          linkWidth={1.2}
          linkDirectionalArrowLength={4.5}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={0}
          cooldownTicks={150}
          d3VelocityDecay={0.3}
          onEngineStop={() => {
            if (!fittedRef.current) {
              fittedRef.current = true
              requestAnimationFrame(() => {
                fgRef.current?.zoomToFit(500, 90)
              })
            }
          }}
        />
      )}
    </div>
  )
}
