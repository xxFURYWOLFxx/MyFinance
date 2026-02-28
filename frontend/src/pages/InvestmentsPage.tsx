import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Bitcoin,
  BarChart3,
  PieChart,
  Briefcase,
  Building2,
  LineChart,
  Edit2,
  Trash2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Copy,
  Maximize2,
  Minimize2,
  CandlestickChart,
  TrendingUp,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Star,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { investmentsService, type SearchResult, type ChartData } from '@/services/investments.service'
import { toast } from '@/stores/toastStore'
import type { InvestmentHolding, InvestmentSummary } from '@/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'

const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Stock', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
  { value: 'etf', label: 'ETF', icon: PieChart, color: 'from-purple-500 to-indigo-500' },
  { value: 'crypto', label: 'Crypto', icon: Bitcoin, color: 'from-orange-500 to-amber-500' },
  { value: 'bond', label: 'Bond', icon: Building2, color: 'from-green-500 to-emerald-500' },
  { value: 'reit', label: 'REIT', icon: Briefcase, color: 'from-pink-500 to-rose-500' },
  { value: 'other', label: 'Other', icon: LineChart, color: 'from-gray-500 to-slate-500' },
]

const CHART_PERIODS = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
]

const CHART_INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' },
]

const AUTO_REFRESH_OPTIONS = [
  { value: 16, label: '60fps' },   // ~16ms, as fast as possible
  { value: 100, label: '100ms' },
  { value: 250, label: '250ms' },
  { value: 500, label: '500ms' },
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 0, label: 'Off' },
]

const CANDLE_COUNT_OPTIONS = [
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 200, label: '200' },
  { value: 500, label: '500' },
  { value: 0, label: 'All' },
]

// Popular asset type for display
interface PopularAssetDisplay {
  symbol: string
  name: string
  asset_type: string
  icon?: string
  is_favorite: boolean
}

// Candlestick colors
const CANDLE_GREEN = '#22c55e'
const CANDLE_RED = '#ef4444'

// Custom Interactive Candlestick Chart Component
interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  price: number
  volume?: number
}

function InteractiveCandlestickChart({
  data,
  period,
  visibleCandleCount = 0,
  isLive = false,
}: {
  data: CandleData[]
  period: string
  visibleCandleCount?: number  // 0 means show all
  isLive?: boolean  // Enable live update animations
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })
  const [viewRange, setViewRange] = useState({ start: 0, end: data.length })
  const [isDragging, setIsDragging] = useState(false)
  const [isMinimapDragging, setIsMinimapDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startRange: { start: 0, end: 0 } })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [lastCandlePrice, setLastCandlePrice] = useState<number | null>(null)
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null)

  // Chart dimensions (leaving room for minimap at bottom)
  const minimapHeight = 50
  const padding = { top: 20, right: 75, bottom: 25 + minimapHeight, left: 10 }

  // Detect price changes for live animation
  useEffect(() => {
    if (isLive && data.length > 0) {
      const currentPrice = data[data.length - 1].close
      if (lastCandlePrice !== null && currentPrice !== lastCandlePrice) {
        setPriceFlash(currentPrice > lastCandlePrice ? 'up' : 'down')
        setTimeout(() => setPriceFlash(null), 500)
      }
      setLastCandlePrice(currentPrice)
    }
  }, [data, isLive, lastCandlePrice])

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    return () => resizeObserver.disconnect()
  }, [])

  // Reset view when data or candle count changes
  useEffect(() => {
    const count = visibleCandleCount > 0 ? visibleCandleCount : data.length
    const visibleCandles = Math.min(count, data.length)
    setViewRange({
      start: Math.max(0, data.length - visibleCandles),
      end: data.length,
    })
  }, [data.length, visibleCandleCount])

  // Derived values
  const chartWidth = dimensions.width - padding.left - padding.right
  const chartHeight = dimensions.height - padding.top - padding.bottom

  // How many candles the view extends before/after the actual data
  const dataStartOffset = Math.max(0, -Math.floor(viewRange.start))
  const dataEndOffset = Math.max(0, Math.ceil(viewRange.end) - data.length)

  const visibleData = useMemo(() => {
    const start = Math.max(0, Math.floor(viewRange.start))
    const end = Math.min(data.length, Math.ceil(viewRange.end))
    return data.slice(start, end)
  }, [data, viewRange])

  // Price range for visible data (falls back to recent data or all data if scrolled past)
  const { minPrice, maxPrice, priceRange: pRange } = useMemo(() => {
    let dataForRange = visibleData
    // If we scrolled entirely past the data, use the last/first 20 candles for price reference
    if (dataForRange.length === 0 && data.length > 0) {
      if (viewRange.start >= data.length) {
        dataForRange = data.slice(-20)
      } else {
        dataForRange = data.slice(0, 20)
      }
    }
    if (dataForRange.length === 0) return { minPrice: 0, maxPrice: 0, priceRange: 1 }
    let min = Infinity, max = -Infinity
    for (const d of dataForRange) {
      if (d.low < min) min = d.low
      if (d.high > max) max = d.high
    }
    const range = max - min || 1
    return {
      minPrice: min - range * 0.05,
      maxPrice: max + range * 0.05,
      priceRange: range * 1.1 || 1,
    }
  }, [visibleData, data, viewRange.start])

  // Price range for ALL data (for minimap)
  const { allMinPrice, allMaxPrice } = useMemo(() => {
    if (data.length === 0) return { allMinPrice: 0, allMaxPrice: 0 }
    let min = Infinity, max = -Infinity
    for (const d of data) {
      if (d.low < min) min = d.low
      if (d.high > max) max = d.high
    }
    return { allMinPrice: min, allMaxPrice: max }
  }, [data])

  const priceToY = useCallback((price: number) => {
    return padding.top + ((maxPrice - price) / pRange) * chartHeight
  }, [maxPrice, pRange, chartHeight, padding.top])

  const yToPrice = useCallback((y: number) => {
    return maxPrice - ((y - padding.top) / chartHeight) * pRange
  }, [maxPrice, pRange, chartHeight, padding.top])

  // Calculate candle dimensions
  const visibleCount = Math.max(1, viewRange.end - viewRange.start)
  const candleSpacing = chartWidth / visibleCount
  const candleWidth = Math.max(1, Math.min(25, candleSpacing * 0.75))
  const candleOffset = (candleSpacing - candleWidth) / 2

  const getCandleX = useCallback((index: number) => {
    // Offset candles when view extends before data start (viewRange.start < 0)
    return padding.left + (index + dataStartOffset) * candleSpacing + candleOffset
  }, [candleSpacing, candleOffset, padding.left, dataStartOffset])

  // How far past the data edges you can scroll (as a multiplier of visible range)
  const FREE_SCROLL_EXTRA = 2.0

  // Zoom function with free scrolling
  const zoom = useCallback((factor: number, centerRatio: number = 0.5) => {
    const { start, end } = viewRange
    const currentRange = end - start
    let newRange = currentRange * factor

    // Clamp range between 20 candles and all data * 3 (to allow zooming out past data)
    newRange = Math.max(20, Math.min(data.length * 3, newRange))

    const rangeDiff = newRange - currentRange
    let newStart = start - rangeDiff * centerRatio
    let newEnd = end + rangeDiff * (1 - centerRatio)

    // Allow scrolling past data boundaries with generous limits
    const maxExtra = newRange * FREE_SCROLL_EXTRA
    newStart = Math.max(-maxExtra, newStart)
    newEnd = Math.min(data.length + maxExtra, newEnd)

    // Maintain the range size after clamping
    if (newEnd - newStart < newRange) {
      if (newStart <= -maxExtra + 0.1) {
        newEnd = newStart + newRange
      } else {
        newStart = newEnd - newRange
      }
    }

    setViewRange({ start: newStart, end: newEnd })
  }, [viewRange, data.length])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const zoomSpeed = 0.12
    const zoomFactor = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed

    const mouseX = e.nativeEvent.offsetX - padding.left
    const mouseRatio = Math.max(0, Math.min(1, mouseX / chartWidth))

    zoom(zoomFactor, mouseRatio)
  }, [zoom, chartWidth, padding.left])

  // Mouse drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startRange: { ...viewRange },
    }
  }, [viewRange])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ x, y })

    if (isDragging) {
      const dx = e.clientX - dragRef.current.startX
      const { startRange } = dragRef.current
      const currentRange = startRange.end - startRange.start

      const candlesPerPixel = currentRange / chartWidth
      const shift = -dx * candlesPerPixel

      let newStart = startRange.start + shift
      let newEnd = startRange.end + shift

      // Allow free scrolling past data boundaries
      const maxExtra = currentRange * FREE_SCROLL_EXTRA
      if (newStart < -maxExtra) {
        newStart = -maxExtra
        newEnd = newStart + currentRange
      }
      if (newEnd > data.length + maxExtra) {
        newEnd = data.length + maxExtra
        newStart = newEnd - currentRange
      }

      setViewRange({ start: newStart, end: newEnd })
    } else {
      // Find hovered candle (only in chart area, not minimap)
      if (y < dimensions.height - minimapHeight - 10) {
        const rawIndex = Math.floor((x - padding.left) / candleSpacing)
        const candleIndex = rawIndex - dataStartOffset
        if (candleIndex >= 0 && candleIndex < visibleData.length) {
          setHoveredIndex(candleIndex)
        } else {
          setHoveredIndex(null)
        }
      } else {
        setHoveredIndex(null)
      }
    }
  }, [isDragging, chartWidth, data.length, candleSpacing, visibleData.length, dimensions.height, padding.left, dataStartOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsMinimapDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
    setIsMinimapDragging(false)
    setHoveredIndex(null)
  }, [])

  // Minimap click/drag handling
  const handleMinimapMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMinimapDragging(true)

    const rect = minimapRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const ratio = x / rect.width
    const currentRange = viewRange.end - viewRange.start

    // Map minimap to extended range (show some space beyond data)
    const extendedTotal = data.length * 1.5
    const offset = -data.length * 0.1
    let newStart = offset + ratio * extendedTotal - currentRange / 2
    let newEnd = newStart + currentRange

    setViewRange({ start: newStart, end: newEnd })
  }, [data.length, viewRange])

  const handleMinimapMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMinimapDragging) return

    const rect = minimapRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const currentRange = viewRange.end - viewRange.start

    // Map minimap to extended range
    const extendedTotal = data.length * 1.5
    const offset = -data.length * 0.1
    let newStart = offset + ratio * extendedTotal - currentRange / 2
    let newEnd = newStart + currentRange

    setViewRange({ start: newStart, end: newEnd })
  }, [isMinimapDragging, data.length, viewRange])

  // Reset view
  const resetView = useCallback(() => {
    const count = visibleCandleCount > 0 ? visibleCandleCount : 100
    const visibleCandles = Math.min(count, data.length)
    setViewRange({
      start: Math.max(0, data.length - visibleCandles),
      end: data.length,
    })
  }, [data.length, visibleCandleCount])

  // View all
  const viewAll = useCallback(() => {
    setViewRange({ start: 0, end: data.length })
  }, [data.length])

  const formatXAxisLabel = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    if (period === '1d') return format(date, 'HH:mm')
    if (period === '5d') return format(date, 'EEE HH:mm')
    if (period === '1m' || period === '3m') return format(date, 'MMM dd')
    return format(date, 'MMM dd')
  }, [period])

  // Generate Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 6
    const ticks = []
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(minPrice + (pRange * i) / tickCount)
    }
    return ticks
  }, [minPrice, pRange])

  // Generate X-axis ticks
  const xTicks = useMemo(() => {
    if (visibleData.length === 0) return []
    const tickCount = Math.min(8, Math.max(1, Math.floor(visibleData.length / 10)))
    const step = Math.ceil(visibleData.length / tickCount)
    const ticks = []
    for (let i = 0; i < visibleData.length; i += step) {
      ticks.push({ index: i, timestamp: visibleData[i].timestamp })
    }
    return ticks
  }, [visibleData])

  const hoveredCandle = hoveredIndex !== null ? visibleData[hoveredIndex] : null

  // Current view info
  const viewInfo = useMemo(() => {
    const totalCandles = data.length
    const visibleCandles = Math.round(viewRange.end - viewRange.start)
    const zoomPercent = Math.round((visibleCandles / totalCandles) * 100)
    return { totalCandles, visibleCandles, zoomPercent }
  }, [data.length, viewRange])

  // Minimap data points (simplified line chart)
  const minimapPath = useMemo(() => {
    if (data.length === 0) return ''
    const minimapWidth = chartWidth
    const mHeight = minimapHeight - 20
    const priceRange = allMaxPrice - allMinPrice || 1

    const points = data.map((d, i) => {
      const x = padding.left + (i / data.length) * minimapWidth
      const y = dimensions.height - minimapHeight + 10 + (1 - (d.close - allMinPrice) / priceRange) * mHeight
      return `${x},${y}`
    })

    return `M${points.join(' L')}`
  }, [data, chartWidth, allMinPrice, allMaxPrice, dimensions.height, padding.left])

  // Viewport indicator on minimap (clamped to minimap bounds for display)
  const viewportIndicator = useMemo(() => {
    const minimapWidth = chartWidth
    const rawStartX = padding.left + (viewRange.start / data.length) * minimapWidth
    const rawEndX = padding.left + (viewRange.end / data.length) * minimapWidth
    // Clamp display to minimap area but allow partial visibility
    const startX = Math.max(padding.left - 4, rawStartX)
    const endX = Math.min(padding.left + minimapWidth + 4, rawEndX)
    return { startX, endX, width: Math.max(4, endX - startX) }
  }, [viewRange, data.length, chartWidth, padding.left])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none flex flex-col"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main chart area */}
      <div
        className="flex-1 relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={resetView}
        style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
      >
        <svg width={dimensions.width} height={dimensions.height - minimapHeight}>
          {/* SVG Filters for glow effects */}
          <defs>
            <filter id="liveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <line
              key={`grid-y-${i}`}
              x1={padding.left}
              y1={priceToY(tick)}
              x2={dimensions.width - padding.right}
              y2={priceToY(tick)}
              stroke="rgba(255,255,255,0.04)"
            />
          ))}

          {/* Candlesticks */}
          {visibleData.map((candle, i) => {
            const x = getCandleX(i)
            const centerX = x + candleWidth / 2
            const isGreen = candle.close >= candle.open
            const color = isGreen ? CANDLE_GREEN : CANDLE_RED
            const isLastCandle = i === visibleData.length - 1

            const highY = priceToY(candle.high)
            const lowY = priceToY(candle.low)
            const openY = priceToY(candle.open)
            const closeY = priceToY(candle.close)

            const bodyTop = Math.min(openY, closeY)
            const bodyHeight = Math.max(1, Math.abs(closeY - openY))

            // Flash effect for last candle during live updates
            const flashColor = isLastCandle && priceFlash
              ? (priceFlash === 'up' ? '#4ade80' : '#f87171')
              : null

            // Glow filter for live candle
            const glowFilter = isLastCandle && isLive ? 'url(#liveGlow)' : undefined

            return (
              <g key={i}>
                {/* Glow effect behind live candle */}
                {isLastCandle && isLive && (
                  <rect
                    x={x - 2}
                    y={Math.min(highY, bodyTop) - 2}
                    width={candleWidth + 4}
                    height={Math.abs(lowY - highY) + 4}
                    fill={isGreen ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                    rx={3}
                  />
                )}
                <line
                  x1={centerX}
                  y1={highY}
                  x2={centerX}
                  y2={lowY}
                  stroke={flashColor || color}
                  strokeWidth={isLastCandle && isLive ? 2 : 1}
                  filter={glowFilter}
                />
                <rect
                  x={x}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={flashColor || color}
                  rx={candleWidth > 6 ? 1 : 0}
                  filter={glowFilter}
                  style={isLastCandle && isLive ? { transition: 'all 0.3s ease-out' } : undefined}
                />
                {/* Live price label on last candle */}
                {isLastCandle && isLive && (
                  <>
                    {/* Pulsing dot indicator */}
                    <circle
                      cx={centerX}
                      cy={bodyTop - 10}
                      r={4}
                      fill={isGreen ? '#22c55e' : '#ef4444'}
                      className="animate-pulse"
                    />
                    {/* Live price badge */}
                    <g>
                      <rect
                        x={dimensions.width - padding.right}
                        y={closeY - 10}
                        width={70}
                        height={20}
                        fill={isGreen ? '#166534' : '#991b1b'}
                        rx={3}
                        className={priceFlash ? 'animate-pulse' : ''}
                      />
                      <text
                        x={dimensions.width - padding.right + 5}
                        y={closeY + 4}
                        fill="white"
                        fontSize={11}
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        ${candle.close.toFixed(2)}
                      </text>
                    </g>
                  </>
                )}
              </g>
            )
          })}

          {/* Y-axis labels */}
          {yTicks.map((tick, i) => (
            <text
              key={`y-${i}`}
              x={dimensions.width - padding.right + 5}
              y={priceToY(tick) + 4}
              fill="rgba(255,255,255,0.5)"
              fontSize={10}
              fontFamily="monospace"
            >
              ${tick.toFixed(2)}
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={`x-${i}`}
              x={getCandleX(tick.index) + candleWidth / 2}
              y={dimensions.height - minimapHeight - 15}
              fill="rgba(255,255,255,0.5)"
              fontSize={10}
              textAnchor="middle"
            >
              {formatXAxisLabel(tick.timestamp)}
            </text>
          ))}

          {/* Crosshair */}
          {hoveredCandle && !isDragging && (
            <>
              <line
                x1={padding.left}
                y1={mousePos.y}
                x2={dimensions.width - padding.right}
                y2={mousePos.y}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4,4"
              />
              <line
                x1={mousePos.x}
                y1={padding.top}
                x2={mousePos.x}
                y2={dimensions.height - minimapHeight - 25}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4,4"
              />
              <rect
                x={dimensions.width - padding.right}
                y={mousePos.y - 10}
                width={70}
                height={20}
                fill="#1e40af"
                rx={3}
              />
              <text
                x={dimensions.width - padding.right + 5}
                y={mousePos.y + 4}
                fill="white"
                fontSize={10}
                fontFamily="monospace"
              >
                ${yToPrice(mousePos.y).toFixed(2)}
              </text>
            </>
          )}
        </svg>

        {/* OHLC Tooltip */}
        {hoveredCandle && !isDragging && (
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur border border-white/10 rounded px-3 py-2 text-xs font-mono">
            <span className="text-muted-foreground mr-2">
              {format(new Date(hoveredCandle.timestamp), 'MMM dd, yyyy HH:mm')}
            </span>
            <span className="text-muted-foreground">O:</span>
            <span className="text-white ml-1 mr-2">{hoveredCandle.open.toFixed(2)}</span>
            <span className="text-muted-foreground">H:</span>
            <span className="text-green-400 ml-1 mr-2">{hoveredCandle.high.toFixed(2)}</span>
            <span className="text-muted-foreground">L:</span>
            <span className="text-red-400 ml-1 mr-2">{hoveredCandle.low.toFixed(2)}</span>
            <span className="text-muted-foreground">C:</span>
            <span className={`ml-1 font-bold ${hoveredCandle.close >= hoveredCandle.open ? 'text-green-400' : 'text-red-400'}`}>
              {hoveredCandle.close.toFixed(2)}
            </span>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-2 right-20 flex items-center gap-1">
          <button
            onClick={() => zoom(0.7, 0.5)}
            className="p-1.5 bg-background/80 hover:bg-background border border-white/10 rounded text-xs"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => zoom(1.4, 0.5)}
            className="p-1.5 bg-background/80 hover:bg-background border border-white/10 rounded text-xs"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={viewAll}
            className="px-2 py-1.5 bg-background/80 hover:bg-background border border-white/10 rounded text-[10px]"
            title="View All"
          >
            All
          </button>
          <button
            onClick={resetView}
            className="p-1.5 bg-background/80 hover:bg-background border border-white/10 rounded text-xs"
            title="Reset View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Minimap / Navigator */}
      <div
        ref={minimapRef}
        className="h-[50px] border-t border-white/10 bg-secondary/20 relative cursor-pointer"
        onMouseDown={handleMinimapMouseDown}
        onMouseMove={handleMinimapMouseMove}
      >
        <svg width={dimensions.width} height={minimapHeight} className="absolute top-0 left-0">
          {/* Price line */}
          <path
            d={minimapPath}
            fill="none"
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth={1}
          />
          {/* Viewport indicator background (dimmed areas) */}
          <rect
            x={padding.left}
            y={5}
            width={viewportIndicator.startX - padding.left}
            height={minimapHeight - 10}
            fill="rgba(0,0,0,0.4)"
          />
          <rect
            x={viewportIndicator.endX}
            y={5}
            width={dimensions.width - padding.right - viewportIndicator.endX}
            height={minimapHeight - 10}
            fill="rgba(0,0,0,0.4)"
          />
          {/* Viewport indicator */}
          <rect
            x={viewportIndicator.startX}
            y={5}
            width={Math.max(10, viewportIndicator.width)}
            height={minimapHeight - 10}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth={1}
            rx={2}
          />
        </svg>

        {/* Info text */}
        <div className="absolute bottom-1 left-2 text-[10px] text-muted-foreground/60 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Move className="h-3 w-3" /> Drag chart to pan
          </span>
          <span>Scroll to zoom</span>
          <span>Click minimap to navigate</span>
          <span className="text-blue-400/60">
            {viewInfo.visibleCandles} / {viewInfo.totalCandles} candles ({viewInfo.zoomPercent}%)
          </span>
        </div>
      </div>
    </div>
  )
}

// TradingView-style Chart Component
function TradingChart({
  holding,
  isFullscreen,
  onToggleFullscreen,
}: {
  holding: InvestmentHolding | null
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('1d')
  const [interval, setInterval_] = useState('5m')
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'area' | 'candle'>('area')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(60000) // Default 1 minute to avoid rate limiting
  const [candleCount, setCandleCount] = useState(100) // Default 100 candles
  const [isLiveMode, setIsLiveMode] = useState(false) // Live update mode
  const [nextUpdateIn, setNextUpdateIn] = useState(0) // Countdown to next update
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Enable live mode when auto-refresh is on
  useEffect(() => {
    setIsLiveMode(autoRefreshInterval > 0 && autoRefreshInterval <= 10000)
  }, [autoRefreshInterval])

  // Countdown timer for next update
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }

    if (autoRefreshInterval > 0) {
      // For sub-second intervals, don't show countdown (it's too fast)
      if (autoRefreshInterval < 1000) {
        setNextUpdateIn(0) // Will show "LIVE" without countdown
      } else {
        setNextUpdateIn(autoRefreshInterval / 1000)
        countdownRef.current = setInterval(() => {
          setNextUpdateIn((prev) => {
            if (prev <= 1) {
              return autoRefreshInterval / 1000
            }
            return prev - 1
          })
        }, 1000)
      }
    } else {
      setNextUpdateIn(0)
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [autoRefreshInterval, lastUpdate])

  // Load chart data with better error handling
  const loadChartData = useCallback(async (showLoader = true, retryCount = 0) => {
    if (!holding) return
    if (showLoader) setLoading(true)
    // Don't clear error immediately if we have existing data (keep showing old data)
    if (!chartData) setError(null)

    try {
      // When candleCount is 0 ("All"), request maximum candles (3000)
      const maxCandles = candleCount === 0 ? 3000 : undefined
      // Bypass cache when in live mode for real-time updates
      const bypassCache = isLiveMode && !showLoader  // Bypass on auto-refresh, not initial load
      const data = await investmentsService.getChartData(
        holding.symbol,
        period,
        holding.asset_type || undefined,
        interval,
        maxCandles,
        bypassCache
      )

      // Check if API returned an error in the response (e.g., rate limited but returned empty)
      if (data.error) {
        console.warn('Chart API returned error:', data.error)
        // Only show error if we don't have existing data
        if (!chartData || chartData.data.length === 0) {
          setError(data.error)
        }
        // Still update if we got some data
        if (data.data && data.data.length > 0) {
          setChartData(data)
          setLastUpdate(new Date())
          setError(null)
        }
        return
      }

      // Valid data received
      if (data.data && data.data.length > 0) {
        setChartData(data)
        setLastUpdate(new Date())
        setError(null)
      } else if (!chartData) {
        // No data and no existing data
        setError('No chart data available for this symbol/period')
      }
    } catch (err: any) {
      console.error('Failed to load chart:', err)

      // Check for rate limiting (429) or network errors
      const status = err?.response?.status
      const isRateLimit = status === 429
      const isNetworkError = !status && err?.code === 'ERR_NETWORK'

      if ((isRateLimit || isNetworkError) && retryCount < 2) {
        // Wait and retry
        const waitTime = isRateLimit ? 5000 : 2000
        // Only show retry message if we don't have data
        if (!chartData) {
          setError(`Rate limited. Retrying in ${waitTime / 1000}s...`)
        }
        setTimeout(() => {
          loadChartData(false, retryCount + 1)  // Silent retry
        }, waitTime)
        return
      }

      // Only set error if we don't have existing data to show
      if (!chartData || chartData.data.length === 0) {
        if (isRateLimit) {
          setError('Rate limited by API. Please wait a moment and try again.')
        } else if (isNetworkError) {
          setError('Network error. Check your connection.')
        } else if (status === 404) {
          setError('Symbol not found')
        } else {
          setError('Failed to load chart data. Try a different interval.')
        }
      }
    } finally {
      setLoading(false)
    }
  }, [holding?.symbol, period, interval, holding?.asset_type, chartData, candleCount, isLiveMode])

  // Initial load and period/interval/candleCount change
  useEffect(() => {
    if (holding) {
      loadChartData(true)
    }
  }, [holding?.symbol, period, interval, candleCount])

  // Auto-refresh based on user selection
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current)
      autoRefreshRef.current = null
    }

    if (holding && autoRefreshInterval > 0) {
      // For very fast intervals (< 100ms), use a tighter loop
      // But note: API calls still take time, so actual refresh depends on network
      autoRefreshRef.current = setInterval(() => {
        loadChartData(false) // Silent refresh
      }, Math.max(autoRefreshInterval, 16)) // Minimum 16ms (60fps)
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
      }
    }
  }, [holding?.symbol, period, interval, autoRefreshInterval, loadChartData])

  if (!holding) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <TrendingUp className="h-20 w-20 mb-4 opacity-20" />
        <p className="text-xl font-medium">Select a holding to view chart</p>
        <p className="text-sm mt-2 opacity-70">Click on any asset from your portfolio</p>
      </div>
    )
  }

  const prices = chartData?.data?.map(d => d.price) || []
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
  const currentPrice = chartData?.currentPrice || holding.current_price || 0
  const startPrice = prices[0] || currentPrice
  const priceChange = Number(currentPrice) - Number(startPrice)
  const priceChangePercent = startPrice > 0 ? (priceChange / Number(startPrice)) * 100 : 0
  const isPositive = priceChange >= 0

  // Format data for recharts - use real OHLC if available, otherwise calculate
  const allFormattedData = chartData?.data?.map((d: any, i: number, arr: any[]) => {
    // If backend provides OHLC data, use it
    if (d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined) {
      return {
        timestamp: d.timestamp,
        price: d.close,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume || 0,
      }
    }

    // Fallback: simulate OHLC from price data
    const prevPrice = i > 0 ? arr[i - 1].price : d.price
    const open = prevPrice
    const close = d.price
    const priceMovement = Math.abs(close - open)
    const volatility = Math.max(priceMovement * 0.5, d.price * 0.001)

    return {
      timestamp: d.timestamp,
      price: d.price,
      open,
      close,
      high: Math.max(open, close) + volatility,
      low: Math.min(open, close) - volatility,
      volume: 0,
    }
  }) || []

  // Use all formatted data for candlestick (it handles its own zoom/pan)
  const formattedData = allFormattedData

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp)
    if (period === '1d') return format(date, 'HH:mm')
    if (period === '5d') return format(date, 'EEE HH:mm')
    if (period === '1m' || period === '3m') return format(date, 'MMM dd')
    return format(date, 'MMM yyyy')
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background/95 backdrop-blur-xl border border-white/10 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs text-muted-foreground mb-1">
            {format(new Date(data.timestamp), 'MMM dd, yyyy HH:mm')}
          </p>
          <p className="text-xl font-bold">{formatCurrency(data.price)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6' : ''}`}>
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">{holding.symbol}</h2>
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {holding.asset_type === 'crypto' ? 'CRYPTO' : holding.asset_type?.toUpperCase() || 'STOCK'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{holding.name}</p>
          </div>
          <div className="border-l border-white/10 pl-6">
            <p className="text-4xl font-bold tracking-tight">{formatCurrency(Number(currentPrice))}</p>
            <div className={`flex items-center gap-2 mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              <span className="text-lg font-semibold">
                {isPositive ? '+' : ''}{formatCurrency(Math.abs(priceChange))}
              </span>
              <span className="text-lg">
                ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                {CHART_PERIODS.find(p => p.value === period)?.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated {format(lastUpdate, 'HH:mm:ss')}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between mb-3 gap-4">
        {/* Left: Period & Interval */}
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-1">
            {CHART_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-blue-500 text-white'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {/* Interval selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Interval:</span>
            {CHART_INTERVALS.map((i) => (
              <button
                key={i.value}
                onClick={() => setInterval_(i.value)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  interval === i.value
                    ? 'bg-purple-500 text-white'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Chart Type, Auto-refresh, Refresh */}
        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-secondary/30 rounded-lg p-0.5">
            <button
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                chartType === 'area'
                  ? 'bg-blue-500 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              Area
            </button>
            <button
              onClick={() => setChartType('candle')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                chartType === 'candle'
                  ? 'bg-blue-500 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CandlestickChart className="h-3 w-3" />
              Candle
            </button>
          </div>

          {/* Candle count selector (only for candle chart) */}
          {chartType === 'candle' && (
            <div className="flex items-center bg-secondary/30 rounded-lg p-0.5">
              <span className="text-xs text-muted-foreground px-2">Candles:</span>
              {CANDLE_COUNT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCandleCount(opt.value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    candleCount === opt.value
                      ? 'bg-orange-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Auto-refresh selector */}
          <div className="flex items-center bg-secondary/30 rounded-lg p-0.5">
            <span className="text-xs text-muted-foreground px-2">Auto:</span>
            {AUTO_REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAutoRefreshInterval(opt.value)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  autoRefreshInterval === opt.value
                    ? (opt.value > 0 && opt.value <= 10000 ? 'bg-red-500' : 'bg-green-500') + ' text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {isLiveMode && autoRefreshInterval < 1000 && (
              <span className="px-2 text-[10px] text-purple-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDuration: '0.3s' }} />
                STREAMING
                <span className="text-purple-300 ml-1">({autoRefreshInterval}ms)</span>
              </span>
            )}
            {isLiveMode && autoRefreshInterval >= 1000 && (
              <span className="px-2 text-[10px] text-red-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE
                {nextUpdateIn > 0 && <span className="text-red-300 ml-1">({nextUpdateIn}s)</span>}
              </span>
            )}
            {!isLiveMode && autoRefreshInterval > 0 && (
              <span className="px-2 text-[10px] text-green-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {nextUpdateIn}s
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadChartData(true)}
            disabled={loading}
            className="border-white/10 hover:bg-white/5 h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 bg-secondary/10 rounded-xl relative overflow-hidden">
        {loading && !chartData ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="h-10 w-10 mb-3 text-red-400" />
            <p className="text-lg">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => loadChartData(true)}>
              Retry
            </Button>
          </div>
        ) : formattedData.length > 0 ? (
          chartType === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 20, right: 80, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={60}
                />
                <YAxis
                  domain={[minPrice * 0.998, maxPrice * 1.002]}
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="rgba(255,255,255,0.2)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={75}
                  orientation="right"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={Number(startPrice)} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <InteractiveCandlestickChart
                            data={formattedData}
                            period={period}
                            visibleCandleCount={candleCount}
                            isLive={isLiveMode}
                          />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No chart data available
          </div>
        )}

        {/* Loading overlay for refresh */}
        {loading && chartData && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="text-sm">Updating...</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3 mt-3">
        <div className="bg-secondary/20 rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Quantity</p>
          <p className="text-lg font-bold">{Number(holding.quantity).toLocaleString()}</p>
        </div>
        <div className="bg-secondary/20 rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Avg Cost</p>
          <p className="text-lg font-bold">{formatCurrency(Number(holding.average_cost) || 0)}</p>
        </div>
        <div className="bg-secondary/20 rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Market Value</p>
          <p className="text-lg font-bold">
            {formatCurrency(Number(holding.current_value) || holding.quantity * (holding.current_price || 0))}
          </p>
        </div>
        <div className="bg-secondary/20 rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Day High / Low</p>
          <p className="text-lg font-bold">
            <span className="text-green-400">{formatCurrency(maxPrice)}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-red-400">{formatCurrency(minPrice)}</span>
          </p>
        </div>
        <div className={`rounded-lg px-4 py-3 ${Number(holding.gain_loss) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
          <p className={`text-lg font-bold ${Number(holding.gain_loss) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {Number(holding.gain_loss) >= 0 ? '+' : ''}{formatCurrency(Number(holding.gain_loss) || 0)}
            <span className="text-sm ml-1">
              ({Number(holding.gain_loss_percent) >= 0 ? '+' : ''}{Number(holding.gain_loss_percent || 0).toFixed(2)}%)
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function InvestmentsPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([])
  const [summary, setSummary] = useState<InvestmentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // Selected holding for chart
  const [selectedHolding, setSelectedHolding] = useState<InvestmentHolding | null>(null)
  const [isChartFullscreen, setIsChartFullscreen] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Popular assets and favorites state
  const [popularAssets, setPopularAssets] = useState<PopularAssetDisplay[]>([])
  const [favoriteAssets, setFavoriteAssets] = useState<PopularAssetDisplay[]>([])
  const [loadingPopular, setLoadingPopular] = useState(false)

  // Page-level favorites for quick access bar (all types)
  const [quickAccessFavorites, setQuickAccessFavorites] = useState<PopularAssetDisplay[]>([])
  const [loadingQuickAccess, setLoadingQuickAccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    holding_type: 'stock' as 'stock' | 'etf' | 'crypto' | 'bond' | 'reit' | 'other',
    quantity: '',
    average_cost: '',
    current_price: ''
  })

  // Load all favorites for quick access bar
  const loadQuickAccessFavorites = useCallback(async () => {
    setLoadingQuickAccess(true)
    try {
      const favorites = await investmentsService.getFavorites()
      setQuickAccessFavorites(favorites.map(f => ({
        symbol: f.symbol,
        name: f.name || f.symbol,
        asset_type: f.asset_type,
        is_favorite: true,
      })))
    } catch (error) {
      console.error('Failed to load quick access favorites:', error)
      setQuickAccessFavorites([])
    } finally {
      setLoadingQuickAccess(false)
    }
  }, [])

  // Load popular assets for selected type
  const loadPopularAssets = useCallback(async (assetType: string) => {
    setLoadingPopular(true)
    try {
      const data = await investmentsService.getPopularAssets(assetType)
      setFavoriteAssets(data.favorites.map(f => ({
        symbol: f.symbol,
        name: f.name || f.symbol,
        asset_type: f.asset_type,
        is_favorite: true,
      })))
      setPopularAssets(data.popular.map(p => ({
        symbol: p.symbol,
        name: p.name,
        asset_type: p.asset_type,
        icon: p.icon,
        is_favorite: p.is_favorite,
      })))
    } catch (error) {
      console.error('Failed to load popular assets:', error)
      // Fallback to empty
      setFavoriteAssets([])
      setPopularAssets([])
    } finally {
      setLoadingPopular(false)
    }
  }, [])

  // Load popular assets when asset type changes or modal opens
  useEffect(() => {
    if (showAddModal && formData.holding_type) {
      loadPopularAssets(formData.holding_type)
    }
  }, [showAddModal, formData.holding_type, loadPopularAssets])

  // Debounced search function
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    setSearching(true)
    try {
      const response = await investmentsService.searchSymbols(query, true)
      setSearchResults(response.results || [])
      setShowDropdown(true)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value.toUpperCase())
    setLookupError(null)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }

  // Toggle favorite status
  const toggleFavorite = useCallback(async (symbol: string, name: string, assetType: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await investmentsService.removeFavorite(symbol)
        toast.success(`Removed ${symbol} from favorites`)
      } else {
        await investmentsService.addFavorite({ symbol, name, asset_type: assetType })
        toast.success(`Added ${symbol} to favorites`)
      }
      // Reload popular assets to refresh the list
      loadPopularAssets(formData.holding_type)
      // Also reload quick access favorites
      loadQuickAccessFavorites()
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error)
      toast.error(error?.response?.data?.detail || 'Failed to update favorites')
    }
  }, [loadPopularAssets, loadQuickAccessFavorites, formData.holding_type])

  const handleSelectResult = async (result: SearchResult) => {
    setShowDropdown(false)
    setSearchQuery(result.symbol)

    if (result.price !== undefined) {
      setFormData({
        ...formData,
        symbol: result.baseSymbol || result.symbol.split('/')[0],
        name: result.name,
        current_price: result.price.toString(),
        holding_type: result.type === 'crypto' ? 'crypto' :
                      result.type === 'etf' ? 'etf' :
                      formData.holding_type,
      })
      toast.success(`Selected ${result.name} at ${formatCurrency(result.price)}`)
      return
    }

    setLookingUp(true)
    setLookupError(null)

    try {
      const priceData = await investmentsService.lookupPrice(
        result.baseSymbol || result.symbol,
        result.type === 'crypto' ? 'crypto' : undefined
      )

      setFormData({
        ...formData,
        symbol: result.baseSymbol || result.symbol.split('/')[0],
        name: priceData.name || result.name,
        current_price: priceData.price.toString(),
        holding_type: result.type === 'crypto' ? 'crypto' :
                      result.type === 'etf' ? 'etf' :
                      formData.holding_type,
      })

      toast.success(`Found ${priceData.name} at ${formatCurrency(priceData.price)}`)
    } catch (error: any) {
      console.error('Failed to lookup price:', error)
      setFormData({
        ...formData,
        symbol: result.baseSymbol || result.symbol.split('/')[0],
        name: result.name,
        holding_type: result.type === 'crypto' ? 'crypto' :
                      result.type === 'etf' ? 'etf' :
                      formData.holding_type,
      })
      const message = error?.response?.data?.detail || 'Could not fetch current price'
      setLookupError(message)
      toast.warning(`Selected ${result.name} - please enter the current price manually`)
    } finally {
      setLookingUp(false)
    }
  }

  const handleUseCurrentPrice = () => {
    if (formData.current_price) {
      setFormData({ ...formData, average_cost: formData.current_price })
      toast.info('Average cost set to current price')
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadData()
    loadQuickAccessFavorites()
  }, [])

  useEffect(() => {
    if (holdings.length > 0 && !selectedHolding) {
      setSelectedHolding(holdings[0])
    }
  }, [holdings])

  async function loadData() {
    try {
      setLoading(true)
      const [holdingsData, summaryData] = await Promise.all([
        investmentsService.getAll(),
        investmentsService.getSummary()
      ])
      setHoldings(holdingsData)
      setSummary(summaryData)

      if (selectedHolding) {
        const updated = holdingsData.find(h => h.id === selectedHolding.id)
        if (updated) setSelectedHolding(updated)
      }
    } catch (error) {
      console.error('Failed to load investments data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.symbol || !formData.quantity || !formData.current_price) return

    try {
      setSaving(true)
      const data = {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        holding_type: formData.holding_type,
        quantity: parseFloat(formData.quantity),
        average_cost: parseFloat(formData.average_cost) || parseFloat(formData.current_price),
        current_price: parseFloat(formData.current_price)
      }

      if (editingId) {
        await investmentsService.update(editingId, data)
        toast.success('Holding updated successfully')
      } else {
        await investmentsService.create(data)
        toast.success(`Added ${data.symbol} to portfolio`)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save holding:', error)
      toast.error('Failed to save holding. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this holding?')) return

    try {
      await investmentsService.delete(id)
      if (selectedHolding?.id === id) {
        setSelectedHolding(holdings.find(h => h.id !== id) || null)
      }
      await loadData()
      toast.success('Holding deleted successfully')
    } catch (error) {
      console.error('Failed to delete holding:', error)
      toast.error('Failed to delete holding')
    }
  }

  async function handleRefreshPrices() {
    try {
      setRefreshing(true)
      investmentsService.clearCache()
      const result = await investmentsService.refreshPrices()
      await loadData()

      if (result.updated > 0 && result.failed === 0) {
        toast.success(`Updated prices for ${result.updated} holdings`)
      } else if (result.updated > 0 && result.failed > 0) {
        toast.warning(`Updated ${result.updated} holdings, ${result.failed} failed`)
      } else if (result.failed > 0) {
        toast.error(`Failed to update ${result.failed} holdings`)
      }
    } catch (error) {
      console.error('Failed to refresh prices:', error)
      toast.error('Failed to refresh prices')
    } finally {
      setRefreshing(false)
    }
  }

  function handleEdit(holding: InvestmentHolding) {
    setFormData({
      symbol: holding.symbol,
      name: holding.name || '',
      holding_type: (holding.asset_type as any) || 'stock',
      quantity: holding.quantity.toString(),
      average_cost: (holding.average_cost || 0).toString(),
      current_price: (holding.current_price || 0).toString()
    })
    setSearchQuery(holding.symbol)
    setEditingId(holding.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      symbol: '',
      name: '',
      holding_type: 'stock',
      quantity: '',
      average_cost: '',
      current_price: ''
    })
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setEditingId(null)
    setShowAddModal(false)
    setLookupError(null)
  }

  const totalValue = summary?.total_value || 0
  const totalCost = summary?.total_cost || 0
  const totalGain = summary?.total_gain_loss || 0
  const totalGainPercent = summary?.gain_loss_percentage || 0

  const getTypeInfo = (typeValue: string | null) => {
    return INVESTMENT_TYPES.find(t => t.value === typeValue) || INVESTMENT_TYPES[5]
  }

  // Handle clicking on a quick access favorite - show its chart
  const handleQuickAccessClick = async (favorite: PopularAssetDisplay) => {
    // Check if we already have this as a holding
    const existingHolding = holdings.find(h => h.symbol.toLowerCase() === favorite.symbol.toLowerCase())

    if (existingHolding) {
      // Just select the existing holding
      setSelectedHolding(existingHolding)
      return
    }

    // Create a temporary "preview" holding to show the chart
    try {
      const priceData = await investmentsService.lookupPrice(favorite.symbol, favorite.asset_type)
      const previewHolding: InvestmentHolding = {
        id: -1, // Negative ID to indicate it's a preview
        user_id: 0,
        symbol: favorite.symbol,
        name: priceData.name || favorite.name,
        asset_type: favorite.asset_type,
        quantity: 0,
        average_cost: 0,
        current_price: priceData.price,
        current_value: 0,
        gain_loss: 0,
        gain_loss_percent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSelectedHolding(previewHolding)
      toast.info(`Viewing ${favorite.symbol} chart - not in your portfolio`)
    } catch (error) {
      // Fallback - create preview without price lookup
      const previewHolding: InvestmentHolding = {
        id: -1,
        user_id: 0,
        symbol: favorite.symbol,
        name: favorite.name,
        asset_type: favorite.asset_type,
        quantity: 0,
        average_cost: 0,
        current_price: 0,
        current_value: 0,
        gain_loss: 0,
        gain_loss_percent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSelectedHolding(previewHolding)
    }
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Investments</h1>
          <p className="text-sm text-muted-foreground">Track your investment portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefreshPrices}
            disabled={refreshing || holdings.length === 0}
            variant="outline"
            size="sm"
            className="border-white/10"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Holding
          </Button>
        </div>
      </div>

      {/* Quick Access Favorites Bar */}
      {quickAccessFavorites.length > 0 && (
        <div className="flex items-center gap-2 py-2 px-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
          <div className="flex items-center gap-1.5 text-yellow-400 flex-shrink-0 pr-2 border-r border-white/10">
            <Star className="h-4 w-4 fill-yellow-400" />
            <span className="text-xs font-medium">Quick Access</span>
          </div>
          {quickAccessFavorites.map((fav) => {
            const typeInfo = getTypeInfo(fav.asset_type)
            const TypeIcon = typeInfo.icon
            const isSelected = selectedHolding?.symbol.toLowerCase() === fav.symbol.toLowerCase()
            const isInPortfolio = holdings.some(h => h.symbol.toLowerCase() === fav.symbol.toLowerCase())

            return (
              <button
                key={fav.symbol}
                onClick={() => handleQuickAccessClick(fav)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border-blue-400/50 shadow-lg shadow-blue-500/10'
                    : 'bg-secondary/40 hover:bg-secondary/60 border-white/5 hover:border-white/10'
                } border`}
                title={`${fav.name}${!isInPortfolio ? ' (not in portfolio)' : ''}`}
              >
                <div className={`p-1 rounded bg-gradient-to-br ${typeInfo.color}`}>
                  <TypeIcon className="h-3 w-3 text-white" />
                </div>
                <span className={`font-mono font-bold text-xs ${isSelected ? 'text-white' : ''}`}>
                  {fav.symbol}
                </span>
                {!isInPortfolio && (
                  <span className="text-[10px] text-muted-foreground/60">•</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] gap-4">
        {/* Left Sidebar - Portfolio Summary + Holdings */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Portfolio Summary Card */}
          <Card className="glass-card flex-shrink-0">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-bold">{formatCurrency(Number(totalValue))}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Cost Basis</p>
                  <p className="text-sm font-semibold">{formatCurrency(Number(totalCost))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total P&L</p>
                  <p className={`text-sm font-semibold ${Number(totalGain) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(totalGain) >= 0 ? '+' : ''}{formatCurrency(Number(totalGain))}
                    <span className="text-xs ml-1">({Number(totalGainPercent).toFixed(2)}%)</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Holdings List */}
          <Card className="glass-card flex-1 overflow-hidden flex flex-col">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  Holdings
                </span>
                <Badge variant="secondary" className="text-xs">{holdings.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-white/5 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : holdings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LineChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No holdings yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {holdings.map((holding) => {
                    const typeInfo = getTypeInfo(holding.asset_type)
                    const TypeIcon = typeInfo.icon
                    const gain = Number(holding.gain_loss) || 0
                    const gainPercent = Number(holding.gain_loss_percent) || 0
                    const isSelected = selectedHolding?.id === holding.id

                    return (
                      <div
                        key={holding.id}
                        onClick={() => setSelectedHolding(holding)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-500/20 border border-blue-500/40'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${typeInfo.color} flex-shrink-0`}>
                            <TypeIcon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-sm">{holding.symbol}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{holding.name}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm">
                            {formatCurrency(Number(holding.current_value) || holding.quantity * (holding.current_price || 0))}
                          </p>
                          <p className={`text-[10px] ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Chart */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="h-full p-4">
            <TradingChart
              holding={selectedHolding}
              isFullscreen={isChartFullscreen}
              onToggleFullscreen={() => setIsChartFullscreen(!isChartFullscreen)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Buttons - only show for real holdings (not previews) */}
      {selectedHolding && selectedHolding.id > 0 && (
        <div className="fixed bottom-6 right-6 flex gap-2 z-40">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full border-blue-500/30 bg-background/90 backdrop-blur-xl hover:bg-blue-500/20 shadow-lg"
            onClick={() => handleEdit(selectedHolding)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full border-red-500/30 bg-background/90 backdrop-blur-xl hover:bg-red-500/20 shadow-lg"
            onClick={() => handleDelete(selectedHolding.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add/Edit Modal - Redesigned larger modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/10">
              <div>
                <CardTitle className="gradient-text text-xl">
                  {editingId ? 'Edit Investment Holding' : 'Add New Investment'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Search for any stock, crypto, ETF, bond, or REIT to add to your portfolio
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={resetForm} className="h-10 w-10 rounded-full hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <CardContent className="space-y-6 p-6">
                {/* Asset Type - Bigger and better styled */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Asset Type</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {INVESTMENT_TYPES.map((type) => {
                      const Icon = type.icon
                      const isSelected = formData.holding_type === type.value
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, holding_type: type.value as any })}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                            isSelected
                              ? 'bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border-blue-400/60 shadow-lg shadow-blue-500/20 scale-105'
                              : 'bg-secondary/40 border-white/5 hover:bg-secondary/60 hover:border-white/10 hover:scale-102'
                          } border`}
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color} shadow-lg`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                            {type.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Search - Enhanced design */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Search Symbol</Label>
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        placeholder={`Search for ${formData.holding_type === 'crypto' ? 'cryptocurrencies' : formData.holding_type === 'etf' ? 'ETFs' : formData.holding_type === 'stock' ? 'stocks' : 'assets'}...`}
                        className="h-12 pl-12 pr-12 text-base bg-secondary/50 border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50"
                        autoComplete="off"
                      />
                      {(searching || lookingUp) && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-400" />
                      )}
                    </div>

                    {showDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-background/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-[320px] overflow-y-auto">
                        {/* Loading state for popular assets */}
                        {loadingPopular && searchQuery.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        )}

                        {/* Favorites Section - show when no search query and has favorites */}
                        {searchQuery.length === 0 && !loadingPopular && favoriteAssets.length > 0 && (
                          <>
                            <div className="px-4 py-2.5 text-xs font-semibold text-yellow-400 uppercase tracking-wider bg-gradient-to-r from-yellow-500/15 to-transparent border-b border-white/5 flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 fill-yellow-400" /> Your Favorites
                            </div>
                            {favoriteAssets.map((asset) => (
                              <div
                                key={`fav-${asset.symbol}`}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectResult({
                                    symbol: asset.symbol,
                                    baseSymbol: asset.symbol,
                                    name: asset.name,
                                    type: asset.asset_type,
                                  })}
                                  className="flex-1 flex items-center gap-3 text-left"
                                >
                                  <div className={`p-2 rounded-lg flex-shrink-0 shadow-lg ${
                                    asset.asset_type === 'crypto' ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                                      : asset.asset_type === 'etf' ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                                      : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                  }`}>
                                    {asset.asset_type === 'crypto' ? <Bitcoin className="h-4 w-4 text-white" />
                                      : asset.asset_type === 'etf' ? <PieChart className="h-4 w-4 text-white" />
                                      : <BarChart3 className="h-4 w-4 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {asset.icon && <span className="text-base">{asset.icon}</span>}
                                      <p className="font-mono font-bold text-sm">{asset.symbol}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(asset.symbol, asset.name, asset.asset_type, true)
                                  }}
                                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                  title="Remove from favorites"
                                >
                                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                </button>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Popular Assets Section - show when no search query */}
                        {searchQuery.length === 0 && !loadingPopular && popularAssets.length > 0 && (
                          <>
                            <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/30 border-b border-white/5 flex items-center gap-2">
                              <TrendingUp className="h-3.5 w-3.5" /> Popular {formData.holding_type === 'crypto' ? 'Crypto' : formData.holding_type === 'etf' ? 'ETFs' : formData.holding_type === 'stock' ? 'Stocks' : formData.holding_type.toUpperCase()}
                            </div>
                            {popularAssets.map((asset) => (
                              <div
                                key={`pop-${asset.symbol}`}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectResult({
                                    symbol: asset.symbol,
                                    baseSymbol: asset.symbol,
                                    name: asset.name,
                                    type: asset.asset_type,
                                  })}
                                  className="flex-1 flex items-center gap-3 text-left"
                                >
                                  <div className={`p-2 rounded-lg flex-shrink-0 shadow-lg ${
                                    asset.asset_type === 'crypto' ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                                      : asset.asset_type === 'etf' ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                                      : asset.asset_type === 'bond' ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                                      : asset.asset_type === 'reit' ? 'bg-gradient-to-br from-pink-500 to-rose-500'
                                      : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                  }`}>
                                    {asset.asset_type === 'crypto' ? <Bitcoin className="h-4 w-4 text-white" />
                                      : asset.asset_type === 'etf' ? <PieChart className="h-4 w-4 text-white" />
                                      : <BarChart3 className="h-4 w-4 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {asset.icon && <span className="text-base">{asset.icon}</span>}
                                      <p className="font-mono font-bold text-sm">{asset.symbol}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(asset.symbol, asset.name, asset.asset_type, asset.is_favorite)
                                  }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    asset.is_favorite
                                      ? 'hover:bg-red-500/20'
                                      : 'hover:bg-yellow-500/20'
                                  }`}
                                  title={asset.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                  <Star className={`h-5 w-5 ${
                                    asset.is_favorite
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground hover:text-yellow-400'
                                  }`} />
                                </button>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Search Results */}
                        {searchQuery.length > 0 && searchResults.length > 0 && (
                          <>
                            <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/30 border-b border-white/5">
                              Search Results
                            </div>
                            {searchResults.map((result, index) => (
                              <div
                                key={`${result.symbol}-${index}`}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectResult(result)}
                                  className="flex-1 flex items-center gap-3 text-left"
                                >
                                  <div className={`p-2 rounded-lg flex-shrink-0 shadow-lg ${
                                    result.type === 'crypto' ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                                      : result.type === 'etf' ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                                      : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                  }`}>
                                    {result.type === 'crypto' ? <Bitcoin className="h-4 w-4 text-white" />
                                      : result.type === 'etf' ? <PieChart className="h-4 w-4 text-white" />
                                      : <BarChart3 className="h-4 w-4 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono font-bold text-sm">{result.symbol}</p>
                                    <p className="text-xs text-muted-foreground truncate">{result.name}</p>
                                  </div>
                                  {result.price !== undefined && (
                                    <div className="text-right">
                                      <p className="font-semibold text-sm">{formatCurrency(result.price)}</p>
                                      {result.changePercent !== undefined && (
                                        <p className={`text-xs ${result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {result.changePercent >= 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const isFav = favoriteAssets.some(f => f.symbol === result.symbol)
                                    toggleFavorite(
                                      result.baseSymbol || result.symbol,
                                      result.name,
                                      result.type || formData.holding_type,
                                      isFav
                                    )
                                  }}
                                  className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                                  title="Add to favorites"
                                >
                                  <Star className={`h-5 w-5 ${
                                    favoriteAssets.some(f => f.symbol === result.symbol)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground hover:text-yellow-400'
                                  }`} />
                                </button>
                              </div>
                            ))}
                          </>
                        )}

                        {/* No results message */}
                        {searchQuery.length > 0 && searchResults.length === 0 && !searching && (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No results found for "{searchQuery}"
                          </div>
                        )}

                        {/* Loading state for search */}
                        {searching && (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Searching...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Symbol Display - Enhanced */}
                  {formData.symbol && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 shadow-lg shadow-green-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/20">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-lg text-green-400">{formData.symbol}</span>
                            <p className="text-sm text-muted-foreground">{formData.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {formData.current_price && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Current Price</p>
                              <p className="font-semibold text-lg">{formatCurrency(parseFloat(formData.current_price))}</p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, symbol: '', name: '', current_price: '' })
                              setSearchQuery('')
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {lookupError && (
                    <p className="text-sm text-yellow-400 flex items-center gap-2 bg-yellow-500/10 rounded-lg px-3 py-2">
                      <AlertCircle className="h-4 w-4" />
                      {lookupError}
                    </p>
                  )}
                </div>

                {formData.symbol && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Display Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Apple Inc."
                      className="h-11 bg-secondary/50 border-white/10 rounded-xl"
                    />
                  </div>
                )}

                {/* Quantity and Price Fields - Two columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      className="h-12 text-lg bg-secondary/50 border-white/10 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Average Cost</Label>
                      {formData.current_price && (
                        <button
                          type="button"
                          onClick={handleUseCurrentPrice}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          Use Current
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.average_cost}
                      onChange={(e) => setFormData({ ...formData, average_cost: e.target.value })}
                      placeholder="0.00"
                      className="h-12 text-lg bg-secondary/50 border-white/10 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Current Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.current_price}
                    onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                    placeholder="0.00"
                    className="h-12 text-lg bg-secondary/50 border-white/10 rounded-xl"
                    required
                  />
                </div>

                {/* Submit Button - Enhanced */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={saving || !formData.symbol}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? 'Update Holding' : 'Add to Portfolio'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default InvestmentsPage
