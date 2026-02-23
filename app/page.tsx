'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  FiHome, FiPlusCircle, FiClock, FiSearch, FiUpload, FiChevronLeft,
  FiChevronRight, FiX, FiSend, FiAlertTriangle, FiCheckCircle,
  FiXCircle, FiTrendingUp, FiTrendingDown, FiMessageCircle, FiImage,
  FiZoomIn, FiZoomOut, FiFilter, FiChevronDown, FiChevronUp, FiMenu,
  FiActivity, FiEye, FiInfo, FiArrowLeft, FiLoader, FiAlertCircle,
  FiRefreshCw, FiTrash2, FiList, FiGrid, FiMaximize2,
  FiCrosshair, FiCpu, FiFileText, FiTarget, FiLayers, FiBox, FiAperture, FiDisc
} from 'react-icons/fi'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Cell, PieChart, Pie
} from 'recharts'

// --- Constants ---
const DEFECT_DETECTION_AGENT_ID = '699c70cd3aff77bf1a4ebe04'
const INSPECTION_ADVISOR_AGENT_ID = '699c70cdf75ee4297f34ba9e'

// --- Pipeline Steps ---
const PIPELINE_STEPS = [
  { label: 'Upload', icon: FiUpload, description: 'Uploading image' },
  { label: 'Scan', icon: FiCrosshair, description: 'Scanning object' },
  { label: 'Identify', icon: FiSearch, description: 'Identifying material' },
  { label: 'Detect', icon: FiAlertTriangle, description: 'Detecting defects' },
  { label: 'Report', icon: FiFileText, description: 'Generating report' },
]

// --- Interfaces ---
interface Defect {
  id: number
  type: string
  severity: string
  location: string
  description: string
  affected_area_percentage: number
}

interface Recommendation {
  defect_id: number
  action: string
  priority: string
  details: string
}

interface Inspection {
  id: string
  batchId: string
  fabricType: string
  date: string
  imageUrl: string
  annotatedImageUrl?: string
  qualityScore: number
  verdict: string
  totalDefects: number
  criticalCount: number
  majorCount: number
  minorCount: number
  fabricCondition: string
  defects: Defect[]
  recommendations: Recommendation[]
  status: 'completed' | 'pending' | 'failed'
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  keyPoints?: string[]
  correctiveActions?: { action: string; priority: string; expected_impact: string }[]
  preventiveMeasures?: string[]
  industryReferences?: string[]
  timestamp: string
  isLoading?: boolean
  isError?: boolean
}

// --- Sample Data ---
const SAMPLE_INSPECTIONS: Inspection[] = [
  {
    id: 'insp-001',
    batchId: 'BT-2024-0847',
    fabricType: 'Denim',
    date: '2025-02-21',
    imageUrl: '',
    qualityScore: 92,
    verdict: 'Pass',
    totalDefects: 2,
    criticalCount: 0,
    majorCount: 0,
    minorCount: 2,
    fabricCondition: 'Good',
    defects: [
      { id: 1, type: 'Loose thread', severity: 'minor', location: 'Top-right corner', description: 'Small loose thread visible at edge', affected_area_percentage: 0.5 },
      { id: 2, type: 'Slight color variation', severity: 'minor', location: 'Center', description: 'Minor color inconsistency in center area', affected_area_percentage: 1.2 },
    ],
    recommendations: [
      { defect_id: 1, action: 'Trim loose thread', priority: 'Low', details: 'Simple trim required, no structural impact' },
      { defect_id: 2, action: 'Monitor dye batch consistency', priority: 'Low', details: 'Check dye batch for consistency across rolls' },
    ],
    status: 'completed',
  },
  {
    id: 'insp-002',
    batchId: 'BT-2024-0903',
    fabricType: 'Silk',
    date: '2025-02-20',
    imageUrl: '',
    qualityScore: 64,
    verdict: 'Conditional Pass',
    totalDefects: 5,
    criticalCount: 0,
    majorCount: 2,
    minorCount: 3,
    fabricCondition: 'Acceptable with reservations',
    defects: [
      { id: 1, type: 'Snag', severity: 'major', location: 'Lower-left quadrant', description: 'Visible snag pulling threads', affected_area_percentage: 2.1 },
      { id: 2, type: 'Water stain', severity: 'major', location: 'Upper-center', description: 'Faint water mark affecting sheen', affected_area_percentage: 3.5 },
      { id: 3, type: 'Loose thread', severity: 'minor', location: 'Edge', description: 'Minor loose thread at selvedge', affected_area_percentage: 0.3 },
      { id: 4, type: 'Pilling', severity: 'minor', location: 'Center-right', description: 'Light pilling observed', affected_area_percentage: 1.0 },
      { id: 5, type: 'Slight wrinkle', severity: 'minor', location: 'Bottom edge', description: 'Creasing near fabric edge', affected_area_percentage: 0.8 },
    ],
    recommendations: [
      { defect_id: 1, action: 'Repair snag carefully', priority: 'High', details: 'Use silk-specific repair technique to avoid further damage' },
      { defect_id: 2, action: 'Steam treatment', priority: 'Medium', details: 'Gentle steam may reduce water mark visibility' },
    ],
    status: 'completed',
  },
  {
    id: 'insp-003',
    batchId: 'BT-2024-0921',
    fabricType: 'Woven',
    date: '2025-02-19',
    imageUrl: '',
    qualityScore: 35,
    verdict: 'Fail',
    totalDefects: 8,
    criticalCount: 2,
    majorCount: 3,
    minorCount: 3,
    fabricCondition: 'Poor',
    defects: [
      { id: 1, type: 'Hole', severity: 'critical', location: 'Center', description: 'Puncture hole through fabric layers', affected_area_percentage: 4.2 },
      { id: 2, type: 'Tear', severity: 'critical', location: 'Right edge', description: 'Structural tear along warp direction', affected_area_percentage: 5.8 },
      { id: 3, type: 'Discoloration', severity: 'major', location: 'Upper-left', description: 'Chemical staining causing discoloration', affected_area_percentage: 8.0 },
      { id: 4, type: 'Weave irregularity', severity: 'major', location: 'Lower-center', description: 'Uneven weave pattern detected', affected_area_percentage: 6.0 },
      { id: 5, type: 'Selvage defect', severity: 'major', location: 'Left edge', description: 'Damaged selvage edge', affected_area_percentage: 3.0 },
      { id: 6, type: 'Pilling', severity: 'minor', location: 'Various', description: 'Surface pilling across multiple areas', affected_area_percentage: 2.0 },
      { id: 7, type: 'Loose thread', severity: 'minor', location: 'Top edge', description: 'Multiple loose threads at top', affected_area_percentage: 0.5 },
      { id: 8, type: 'Crease mark', severity: 'minor', location: 'Bottom-right', description: 'Permanent crease mark', affected_area_percentage: 1.0 },
    ],
    recommendations: [
      { defect_id: 1, action: 'Reject section', priority: 'Critical', details: 'Hole cannot be repaired - cut and discard affected section' },
      { defect_id: 2, action: 'Reject section', priority: 'Critical', details: 'Structural tear compromises fabric integrity' },
      { defect_id: 3, action: 'Chemical treatment', priority: 'High', details: 'Attempt stain removal if economically viable' },
    ],
    status: 'completed',
  },
  {
    id: 'insp-004',
    batchId: 'BT-2024-0955',
    fabricType: 'Knitted',
    date: '2025-02-18',
    imageUrl: '',
    qualityScore: 88,
    verdict: 'Pass',
    totalDefects: 1,
    criticalCount: 0,
    majorCount: 0,
    minorCount: 1,
    fabricCondition: 'Very Good',
    defects: [
      { id: 1, type: 'Minor stitch irregularity', severity: 'minor', location: 'Bottom-left', description: 'Slight stitch tension variation', affected_area_percentage: 0.3 },
    ],
    recommendations: [
      { defect_id: 1, action: 'Accept as-is', priority: 'Low', details: 'Within acceptable tolerance for knitted fabric' },
    ],
    status: 'completed',
  },
]

const SAMPLE_CHART_DATA = [
  { day: 'Mon', defects: 4, inspections: 8 },
  { day: 'Tue', defects: 7, inspections: 12 },
  { day: 'Wed', defects: 3, inspections: 6 },
  { day: 'Thu', defects: 9, inspections: 15 },
  { day: 'Fri', defects: 5, inspections: 10 },
  { day: 'Sat', defects: 2, inspections: 4 },
  { day: 'Sun', defects: 1, inspections: 3 },
]

// --- Helpers ---
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getSeverityColor(severity: string): string {
  const s = (severity ?? '').toLowerCase()
  if (s === 'critical') return 'bg-red-100 text-red-800 border-red-200'
  if (s === 'major') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (s === 'minor') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

function getSeverityBorderColor(severity: string): string {
  const s = (severity ?? '').toLowerCase()
  if (s === 'critical') return '#ef4444'
  if (s === 'major') return '#f97316'
  if (s === 'minor') return '#eab308'
  return '#9ca3af'
}

function getVerdictColor(verdict: string): string {
  const v = (verdict ?? '').toLowerCase()
  if (v === 'pass') return 'bg-green-100 text-green-800 border-green-300'
  if (v === 'conditional pass') return 'bg-amber-100 text-amber-800 border-amber-300'
  if (v === 'fail') return 'bg-red-100 text-red-800 border-red-300'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function getPriorityColor(priority: string): string {
  const p = (priority ?? '').toLowerCase()
  if (p === 'critical') return 'bg-red-100 text-red-700'
  if (p === 'high') return 'bg-orange-100 text-orange-700'
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700'
  if (p === 'low') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-700'
}

function generateId(): string {
  return 'insp-' + Math.random().toString(36).substring(2, 9)
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// --- Process Pipeline Component ---
function ProcessPipeline({ currentStep, isComplete }: { currentStep: number; isComplete: boolean }) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon
          const isActive = idx === currentStep && !isComplete
          const isDone = idx < currentStep || isComplete
          const isPending = idx > currentStep && !isComplete

          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center z-10 relative" style={{ flex: '0 0 auto' }}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-green-500 text-white shadow-md shadow-green-500/25' : isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 animate-pulse' : 'bg-muted text-muted-foreground'}`}
                >
                  {isDone ? <FiCheckCircle size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-xs mt-1.5 font-medium transition-colors duration-300 ${isDone ? 'text-green-600' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
                {isActive && (
                  <span className="text-[10px] text-primary mt-0.5 animate-pulse">{step.description}</span>
                )}
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="flex-1 mx-1 relative" style={{ height: '2px', marginBottom: '24px' }}>
                  <div className="absolute inset-0 bg-muted rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-700"
                    style={{ width: isDone ? '100%' : isActive ? '50%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// --- Scan Overlay Component ---
function ScanOverlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-lg">
      <div className="absolute inset-0 bg-primary/5" />
      <div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"
        style={{
          animation: 'scanline 2.5s linear infinite',
        }}
      />
      <div className="absolute inset-0 border-2 rounded-lg" style={{ animation: 'pulse-border 2s ease-in-out infinite' }} />
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-md opacity-70" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-md opacity-70" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-md opacity-70" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-md opacity-70" />
    </div>
  )
}

// --- How It Works Flow ---
function HowItWorksFlow() {
  const steps = [
    { icon: FiUpload, label: 'Upload', desc: 'Upload fabric image' },
    { icon: FiCrosshair, label: 'Scan', desc: 'AI scans the material' },
    { icon: FiSearch, label: 'Identify', desc: 'Material recognized' },
    { icon: FiTarget, label: 'Detect', desc: 'Defects identified' },
  ]

  return (
    <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FiCpu size={16} className="text-primary" />
          How AI Inspection Works
        </CardTitle>
        <CardDescription className="text-xs">Our ML pipeline analyzes textiles in 4 steps</CardDescription>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center text-center flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-1.5">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px] leading-tight">{step.desc}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 mx-2 flex items-center" style={{ marginBottom: '28px' }}>
                    <div className="w-full h-px bg-border relative">
                      <FiChevronRight size={12} className="absolute -right-1 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Defect Heatmap Bar ---
function DefectHeatmapBar({ critical, major, minor }: { critical: number; major: number; minor: number }) {
  const total = critical + major + minor
  if (total === 0) return null
  const critPct = (critical / total) * 100
  const majPct = (major / total) * 100
  const minPct = (minor / total) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Defect Distribution</span>
        <span>{total} total</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
        {critPct > 0 && (
          <div className="bg-red-500 transition-all duration-500" style={{ width: `${critPct}%` }} title={`Critical: ${critical}`} />
        )}
        {majPct > 0 && (
          <div className="bg-orange-500 transition-all duration-500" style={{ width: `${majPct}%` }} title={`Major: ${major}`} />
        )}
        {minPct > 0 && (
          <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${minPct}%` }} title={`Minor: ${minor}`} />
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {critPct > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Critical {Math.round(critPct)}%</span>
        )}
        {majPct > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />Major {Math.round(majPct)}%</span>
        )}
        {minPct > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Minor {Math.round(minPct)}%</span>
        )}
      </div>
    </div>
  )
}

// --- Quality Score Ring ---
function QualityScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

// --- Sidebar ---
function Sidebar({
  currentScreen,
  setCurrentScreen,
  collapsed,
  setCollapsed,
}: {
  currentScreen: string
  setCurrentScreen: (s: string) => void
  collapsed: boolean
  setCollapsed: (c: boolean) => void
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'new-inspection', label: 'New Inspection', icon: FiPlusCircle },
    { id: 'history', label: 'History', icon: FiClock },
  ]

  return (
    <div className={`flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FiEye className="text-primary-foreground" size={16} />
            </div>
            <span className="font-semibold text-sm text-foreground">TextileVision</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        >
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-border">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2">
            <FiActivity size={14} className="text-green-500" />
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Header ---
function Header({
  sidebarCollapsed,
  setSidebarCollapsed,
  searchQuery,
  setSearchQuery,
  onNewInspection,
}: {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (c: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  onNewInspection: () => void
}) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground md:hidden"
        >
          <FiMenu size={18} />
        </button>
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">TextileVision AI</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            type="text"
            placeholder="Search batch ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
        </div>
        <Button size="sm" onClick={onNewInspection} className="gap-1.5">
          <FiPlusCircle size={14} />
          <span className="hidden sm:inline">New Inspection</span>
        </Button>
      </div>
    </header>
  )
}

// --- Stat Card ---
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  trend: string
  trendDirection: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon size={20} className="text-primary" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trendDirection === 'up' && <FiTrendingUp size={12} className="text-green-600" />}
          {trendDirection === 'down' && <FiTrendingDown size={12} className="text-red-600" />}
          {trendDirection === 'neutral' && <FiActivity size={12} className="text-muted-foreground" />}
          <span className={`${trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Dashboard Screen ---
function DashboardScreen({
  inspections,
  useSampleData,
  setUseSampleData,
  onSelectInspection,
  onNewInspection,
}: {
  inspections: Inspection[]
  useSampleData: boolean
  setUseSampleData: (v: boolean) => void
  onSelectInspection: (insp: Inspection) => void
  onNewInspection: () => void
}) {
  const dataSource = useSampleData ? SAMPLE_INSPECTIONS : inspections
  const completedInspections = dataSource.filter((i) => i.status === 'completed')
  const passCount = completedInspections.filter((i) => (i.verdict ?? '').toLowerCase() === 'pass').length
  const passRate = completedInspections.length > 0 ? Math.round((passCount / completedInspections.length) * 100) : 0
  const weekDefects = completedInspections.reduce((acc, i) => acc + (i.totalDefects ?? 0), 0)
  const pendingCount = dataSource.filter((i) => i.status === 'pending').length

  const chartData = useSampleData
    ? SAMPLE_CHART_DATA
    : inspections.length > 0
      ? inspections.slice(-7).map((i, idx) => ({
          day: formatDate(i.date).split(',')[0] || `Day ${idx + 1}`,
          defects: i.totalDefects ?? 0,
          inspections: 1,
        }))
      : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Textile quality inspection overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground">Sample Data</Label>
          <Switch id="sample-toggle" checked={useSampleData} onCheckedChange={setUseSampleData} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiEye} label="Total Inspections" value={dataSource.length} trend={useSampleData ? '+12% this week' : 'All time'} trendDirection={useSampleData ? 'up' : 'neutral'} />
        <StatCard icon={FiCheckCircle} label="Pass Rate" value={`${passRate}%`} trend={useSampleData ? '+3% vs last week' : 'Overall'} trendDirection={useSampleData ? 'up' : 'neutral'} />
        <StatCard icon={FiAlertTriangle} label="Defects This Week" value={weekDefects} trend={useSampleData ? '-8% improvement' : 'Current'} trendDirection={useSampleData ? 'down' : 'neutral'} />
        <StatCard icon={FiClock} label="Pending Reviews" value={pendingCount} trend={useSampleData ? '2 awaiting' : 'Queue'} trendDirection="neutral" />
      </div>

      {/* How It Works Section - Enhancement 4 */}
      <HowItWorksFlow />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Inspections</CardTitle>
            <CardDescription className="text-xs">Latest quality checks</CardDescription>
          </CardHeader>
          <CardContent>
            {dataSource.length === 0 ? (
              <div className="text-center py-10">
                <FiImage size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No inspections yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={onNewInspection}>
                  <FiPlusCircle size={14} className="mr-1.5" /> Start First Inspection
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {dataSource.slice(0, 6).map((insp) => (
                  <button
                    key={insp.id}
                    onClick={() => onSelectInspection(insp)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <FiImage size={16} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{insp.batchId}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(insp.date)} &middot; {insp.fabricType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: getScoreColor(insp.qualityScore) }}>
                        {insp.qualityScore}
                      </span>
                      <Badge variant="outline" className={`text-xs ${getVerdictColor(insp.verdict)}`}>
                        {insp.verdict}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Defect Trends</CardTitle>
            <CardDescription className="text-xs">Weekly defect analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="defects" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- New Inspection Screen ---
function NewInspectionScreen({
  onInspectionComplete,
}: {
  onInspectionComplete: (inspection: Inspection) => void
}) {
  const [batchId, setBatchId] = useState('')
  const [fabricType, setFabricType] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pipelineStep, setPipelineStep] = useState(-1)
  const [pipelineComplete, setPipelineComplete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const pipelineTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearPipelineTimers = useCallback(() => {
    pipelineTimersRef.current.forEach((t) => clearTimeout(t))
    pipelineTimersRef.current = []
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG or PNG)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB')
      return
    }
    setError('')
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleAnalyze = async () => {
    if (!selectedFile || !batchId.trim() || !fabricType) return

    setIsAnalyzing(true)
    setError('')
    setUploadProgress(10)
    setPipelineStep(0)
    setPipelineComplete(false)
    clearPipelineTimers()

    // Schedule pipeline step advances
    const t1 = setTimeout(() => setPipelineStep(1), 2000)
    const t2 = setTimeout(() => setPipelineStep(2), 4000)
    const t3 = setTimeout(() => setPipelineStep(3), 7000)
    const t4 = setTimeout(() => setPipelineStep(4), 10000)
    pipelineTimersRef.current = [t1, t2, t3, t4]

    try {
      setUploadProgress(20)
      const uploadResult = await uploadFiles(selectedFile)
      setUploadProgress(40)

      if (!uploadResult.success || !uploadResult.asset_ids?.length) {
        setError('Upload failed. Please try again.')
        setIsAnalyzing(false)
        setUploadProgress(0)
        setPipelineStep(-1)
        clearPipelineTimers()
        return
      }

      const assetId = uploadResult.asset_ids[0]
      setUploadProgress(50)

      const message = `Analyze this textile fabric image for defects. Batch ID: ${batchId.trim()}, Fabric Type: ${fabricType}. Identify all defects, classify severity (critical, major, minor), calculate quality score (0-100), provide pass/fail/conditional pass verdict, and give detailed recommendations.`

      const result = await callAIAgent(message, DEFECT_DETECTION_AGENT_ID, { assets: [assetId] })
      setUploadProgress(90)

      if (!result.success) {
        setError(result.error || 'Analysis could not complete. Please try again.')
        setIsAnalyzing(false)
        setUploadProgress(0)
        setPipelineStep(-1)
        clearPipelineTimers()
        return
      }

      const parsed = parseLLMJson(result?.response?.result)
      const inspSummary = parsed?.inspection_summary || {}
      const defects = Array.isArray(parsed?.defects) ? parsed.defects : []
      const recommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : []

      const annotatedFiles = Array.isArray(result?.module_outputs?.artifact_files) ? result.module_outputs.artifact_files : []
      const annotatedImageUrl = annotatedFiles.length > 0 ? annotatedFiles[0]?.file_url ?? '' : ''

      const newInspection: Inspection = {
        id: generateId(),
        batchId: batchId.trim(),
        fabricType,
        date: new Date().toISOString().split('T')[0],
        imageUrl: previewUrl,
        annotatedImageUrl,
        qualityScore: Number(inspSummary?.quality_score) || 0,
        verdict: String(inspSummary?.verdict ?? 'Unknown'),
        totalDefects: Number(inspSummary?.total_defects) || defects.length,
        criticalCount: Number(inspSummary?.critical_count) || 0,
        majorCount: Number(inspSummary?.major_count) || 0,
        minorCount: Number(inspSummary?.minor_count) || 0,
        fabricCondition: String(inspSummary?.fabric_condition ?? ''),
        defects,
        recommendations,
        status: 'completed',
      }

      // Mark pipeline complete
      clearPipelineTimers()
      setPipelineStep(4)
      setPipelineComplete(true)
      setUploadProgress(100)

      // Brief delay to show completion before navigating
      setTimeout(() => {
        onInspectionComplete(newInspection)
      }, 800)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setUploadProgress(0)
      setPipelineStep(-1)
      setPipelineComplete(false)
      clearPipelineTimers()
    } finally {
      setIsAnalyzing(false)
    }
  }

  const canAnalyze = !!selectedFile && !!batchId.trim() && !!fabricType && !isAnalyzing

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">New Inspection</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Upload a textile sample image for AI-powered defect detection</p>
      </div>

      <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="batch-id" className="text-sm font-medium">Batch ID</Label>
              <Input
                id="batch-id"
                placeholder="e.g. BT-2024-1001"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Fabric Type</Label>
              <Select value={fabricType} onValueChange={setFabricType} disabled={isAnalyzing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fabric type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Woven">Woven</SelectItem>
                  <SelectItem value="Knitted">Knitted</SelectItem>
                  <SelectItem value="Non-Woven">Non-Woven</SelectItem>
                  <SelectItem value="Denim">Denim</SelectItem>
                  <SelectItem value="Silk">Silk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Fabric Image</Label>
            <div
              ref={dropzoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'} ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative w-full max-h-48 overflow-hidden rounded-lg">
                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain rounded-lg" />
                    {/* Enhancement 5: Scan overlay during analysis */}
                    {isAnalyzing && <ScanOverlay />}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                  {!isAnalyzing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                        setPreviewUrl('')
                      }}
                      className="gap-1"
                    >
                      <FiX size={14} /> Remove
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <FiUpload size={32} className="mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG or PNG, max 10MB</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Enhancement 1: Process Pipeline */}
          {pipelineStep >= 0 && (
            <div className="border border-border/50 rounded-xl p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <FiCpu size={14} className="text-primary" />
                <span className="text-xs font-medium text-foreground">AI/ML Analysis Pipeline</span>
              </div>
              <ProcessPipeline currentStep={pipelineStep} isComplete={pipelineComplete} />
            </div>
          )}

          {isAnalyzing && pipelineStep < 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FiLoader size={14} className="animate-spin" />
                <span>Analyzing fabric sample...</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          {isAnalyzing && pipelineStep >= 0 && (
            <Progress value={uploadProgress} className="h-1.5" />
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <FiAlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                <FiX size={14} />
              </button>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="w-full gap-2"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <FiLoader size={16} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FiEye size={16} />
                Analyze Fabric
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Report Detail Screen ---
function ReportDetailScreen({
  inspection,
  onBack,
}: {
  inspection: Inspection
  onBack: () => void
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const displayImage = inspection.annotatedImageUrl || inspection.imageUrl

  const handleSendChat = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: 'agent',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    }
    setChatMessages((prev) => [...prev, loadingMsg])

    try {
      const contextMessage = `Context: Inspection for Batch ${inspection.batchId}, Fabric Type: ${inspection.fabricType}, Quality Score: ${inspection.qualityScore}/100, Verdict: ${inspection.verdict}, Total Defects: ${inspection.totalDefects} (Critical: ${inspection.criticalCount}, Major: ${inspection.majorCount}, Minor: ${inspection.minorCount}), Fabric Condition: ${inspection.fabricCondition}. Defects found: ${JSON.stringify(inspection.defects)}. Recommendations: ${JSON.stringify(inspection.recommendations)}. \n\nUser question: ${trimmed}`

      const result = await callAIAgent(contextMessage, INSPECTION_ADVISOR_AGENT_ID)

      setChatMessages((prev) => prev.filter((m) => !m.isLoading))

      if (!result.success) {
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'agent',
          content: result.error || 'Unable to process your question. Please try again.',
          timestamp: new Date().toISOString(),
          isError: true,
        }
        setChatMessages((prev) => [...prev, errorMsg])
      } else {
        const parsed = parseLLMJson(result?.response?.result)
        const answer = typeof parsed?.answer === 'string' ? parsed.answer : ''
        const keyPoints = Array.isArray(parsed?.key_points) ? parsed.key_points : []
        const correctiveActions = Array.isArray(parsed?.corrective_actions) ? parsed.corrective_actions : []
        const preventiveMeasures = Array.isArray(parsed?.preventive_measures) ? parsed.preventive_measures : []
        const industryReferences = Array.isArray(parsed?.industry_references) ? parsed.industry_references : []

        const agentMsg: ChatMessage = {
          id: generateId(),
          role: 'agent',
          content: answer,
          keyPoints,
          correctiveActions,
          preventiveMeasures,
          industryReferences,
          timestamp: new Date().toISOString(),
        }
        setChatMessages((prev) => [...prev, agentMsg])
      }
    } catch {
      setChatMessages((prev) => prev.filter((m) => !m.isLoading))
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'agent',
        content: 'An error occurred. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      }
      setChatMessages((prev) => [...prev, errorMsg])
    } finally {
      setChatLoading(false)
    }
  }

  const defects = Array.isArray(inspection.defects) ? inspection.defects : []
  const recommendations = Array.isArray(inspection.recommendations) ? inspection.recommendations : []

  // Enhancement 3: Compute total affected area
  const totalAffectedArea = defects.reduce((acc, d) => acc + (d?.affected_area_percentage ?? 0), 0)

  // Enhancement 3: Defect distribution data for donut
  const defectDistribution = [
    { name: 'Critical', value: inspection.criticalCount ?? 0, color: '#ef4444' },
    { name: 'Major', value: inspection.majorCount ?? 0, color: '#f97316' },
    { name: 'Minor', value: inspection.minorCount ?? 0, color: '#eab308' },
  ].filter(d => d.value > 0)

  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <FiArrowLeft size={14} /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Inspection Report</h2>
          <p className="text-xs text-muted-foreground">Batch {inspection.batchId} &middot; {formatDate(inspection.date)} &middot; {inspection.fabricType}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setChatOpen(true)} className="gap-1.5">
          <FiMessageCircle size={14} /> Ask About Results
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Image Viewer */}
        <Card className="lg:col-span-3 backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Fabric Image</CardTitle>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                  <FiZoomOut size={14} />
                </button>
                <span className="text-xs text-muted-foreground min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                  <FiZoomIn size={14} />
                </button>
                <button onClick={() => setZoom(1)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                  <FiMaximize2 size={14} />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto bg-muted/30" style={{ maxHeight: '500px' }}>
              {displayImage ? (
                <div className="flex items-center justify-center min-h-[300px] p-4">
                  <img
                    src={displayImage}
                    alt="Fabric inspection"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                    className="max-w-full rounded-lg transition-transform duration-200"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
                  <FiImage size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">No image available</p>
                </div>
              )}
            </div>
            {inspection.annotatedImageUrl && (
              <div className="p-3 border-t border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FiInfo size={12} /> Showing AI-annotated image with detected defect areas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quality Score */}
          <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-5">
                <QualityScoreRing score={inspection.qualityScore} />
                <div className="space-y-2">
                  <Badge variant="outline" className={`text-sm px-3 py-1 ${getVerdictColor(inspection.verdict)}`}>
                    {(inspection.verdict ?? '').toLowerCase() === 'pass' && <FiCheckCircle size={13} className="mr-1.5 inline" />}
                    {(inspection.verdict ?? '').toLowerCase() === 'fail' && <FiXCircle size={13} className="mr-1.5 inline" />}
                    {(inspection.verdict ?? '').toLowerCase() === 'conditional pass' && <FiAlertTriangle size={13} className="mr-1.5 inline" />}
                    {inspection.verdict}
                  </Badge>
                  {inspection.fabricCondition && (
                    <p className="text-xs text-muted-foreground">Condition: {inspection.fabricCondition}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhancement 2: Object Identification Section */}
          <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FiLayers size={14} className="text-primary" />
                <CardTitle className="text-sm">Object Identification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FiBox size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Material Identified</p>
                  <p className="text-base font-bold text-foreground">{inspection.fabricType ?? 'Unknown'}</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">
                  <FiCheckCircle size={10} className="mr-1 inline" />
                  Confirmed
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fabric Type</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{inspection.fabricType ?? 'N/A'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Condition</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{inspection.fabricCondition || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Defect Summary with Enhancement 3: Heatmap Bar + Affected Area */}
          <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Defect Summary</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{inspection.totalDefects}</span>
                  <span className="text-sm text-muted-foreground">total defects</span>
                </div>
                {totalAffectedArea > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Affected</p>
                    <p className="text-lg font-bold text-foreground">{totalAffectedArea.toFixed(1)}%</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(inspection.criticalCount ?? 0) > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                    {inspection.criticalCount} Critical
                  </Badge>
                )}
                {(inspection.majorCount ?? 0) > 0 && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                    {inspection.majorCount} Major
                  </Badge>
                )}
                {(inspection.minorCount ?? 0) > 0 && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                    {inspection.minorCount} Minor
                  </Badge>
                )}
                {(inspection.totalDefects ?? 0) === 0 && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
                    No defects found
                  </Badge>
                )}
              </div>

              {/* Enhancement 3: Heatmap Bar */}
              <DefectHeatmapBar
                critical={inspection.criticalCount ?? 0}
                major={inspection.majorCount ?? 0}
                minor={inspection.minorCount ?? 0}
              />

              {/* Enhancement 3: Donut Chart */}
              {defectDistribution.length > 0 && (
                <div className="flex items-center justify-center pt-2">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={defectDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {defectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 ml-2">
                    {defectDistribution.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Defects List with Enhancement 3: Severity Indicator Bar */}
          <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detected Defects</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {defects.length === 0 ? (
                <div className="p-5 text-center text-sm text-muted-foreground">
                  <FiCheckCircle size={20} className="mx-auto mb-2 text-green-500" />
                  No defects detected
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="p-3 space-y-2">
                    {defects.map((defect, idx) => (
                      <div
                        key={defect?.id ?? idx}
                        className="rounded-lg bg-muted/40 border border-border/50 space-y-1.5 overflow-hidden flex"
                      >
                        {/* Enhancement 3: Severity indicator bar on left */}
                        <div
                          className="w-1 shrink-0 rounded-l-lg"
                          style={{ backgroundColor: getSeverityBorderColor(defect?.severity ?? '') }}
                        />
                        <div className="p-3 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{defect?.type ?? 'Unknown'}</span>
                            <Badge variant="outline" className={`text-xs ${getSeverityColor(defect?.severity ?? '')}`}>
                              {defect?.severity ?? 'N/A'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{defect?.description ?? ''}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Location: {defect?.location ?? 'N/A'}</span>
                            {(defect?.affected_area_percentage ?? 0) > 0 && (
                              <span>Area: {defect.affected_area_percentage}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="recommendations" className="border-0">
                <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md overflow-hidden">
                  <AccordionTrigger className="px-5 py-3 hover:no-underline">
                    <span className="text-sm font-semibold">Recommendations ({recommendations.length})</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-5 pb-4 space-y-2">
                      {recommendations.map((rec, idx) => (
                        <div key={rec?.defect_id ?? idx} className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{rec?.action ?? 'N/A'}</span>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(rec?.priority ?? '')}`}>
                              {rec?.priority ?? 'N/A'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{rec?.details ?? ''}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Inspection Advisor</h3>
              <p className="text-xs text-muted-foreground">Ask questions about this inspection</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground">
              <FiX size={16} />
            </button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <FiMessageCircle size={32} className="mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">Ask a question about the inspection results</p>
                <div className="mt-4 space-y-2">
                  {['What caused these defects?', 'How can we improve quality?', 'Is this batch salvageable?'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setChatInput(suggestion)
                      }}
                      className="block w-full text-left text-xs p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : msg.isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-muted text-foreground'}`}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FiLoader size={14} className="animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {msg.content && (
                          <div className="text-sm">{renderMarkdown(msg.content)}</div>
                        )}
                        {Array.isArray(msg.keyPoints) && msg.keyPoints.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-semibold mb-1">Key Points:</p>
                            <ul className="space-y-0.5">
                              {msg.keyPoints.map((kp, i) => (
                                <li key={i} className="text-xs flex items-start gap-1.5">
                                  <FiCheckCircle size={10} className="mt-0.5 shrink-0 text-green-600" />
                                  <span>{kp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(msg.correctiveActions) && msg.correctiveActions.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-semibold mb-1">Corrective Actions:</p>
                            <div className="space-y-1">
                              {msg.correctiveActions.map((ca, i) => (
                                <div key={i} className="text-xs bg-background/50 rounded p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{ca?.action ?? ''}</span>
                                    <Badge variant="outline" className={`text-[10px] ${getPriorityColor(ca?.priority ?? '')}`}>
                                      {ca?.priority ?? ''}
                                    </Badge>
                                  </div>
                                  {ca?.expected_impact && <p className="text-muted-foreground mt-0.5">Impact: {ca.expected_impact}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(msg.preventiveMeasures) && msg.preventiveMeasures.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-semibold mb-1">Preventive Measures:</p>
                            <ul className="space-y-0.5">
                              {msg.preventiveMeasures.map((pm, i) => (
                                <li key={i} className="text-xs flex items-start gap-1.5">
                                  <FiAlertTriangle size={10} className="mt-0.5 shrink-0 text-amber-600" />
                                  <span>{pm}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(msg.industryReferences) && msg.industryReferences.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-semibold mb-1">Industry References:</p>
                            <ul className="space-y-0.5">
                              {msg.industryReferences.map((ref, i) => (
                                <li key={i} className="text-xs flex items-start gap-1.5">
                                  <FiInfo size={10} className="mt-0.5 shrink-0" />
                                  <span>{ref}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask about the inspection..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendChat()
                  }
                }}
                disabled={chatLoading}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
              >
                <FiSend size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- History Screen ---
function HistoryScreen({
  inspections,
  useSampleData,
  setUseSampleData,
  onSelectInspection,
  searchQuery,
}: {
  inspections: Inspection[]
  useSampleData: boolean
  setUseSampleData: (v: boolean) => void
  onSelectInspection: (insp: Inspection) => void
  searchQuery: string
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [fabricFilter, setFabricFilter] = useState('all')
  const [sortField, setSortField] = useState<'date' | 'score' | 'defects'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const dataSource = useSampleData ? SAMPLE_INSPECTIONS : inspections

  const filtered = dataSource.filter((insp) => {
    if (searchQuery && !(insp.batchId ?? '').toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (statusFilter !== 'all') {
      const v = (insp.verdict ?? '').toLowerCase()
      if (statusFilter === 'pass' && v !== 'pass') return false
      if (statusFilter === 'conditional' && v !== 'conditional pass') return false
      if (statusFilter === 'fail' && v !== 'fail') return false
    }
    if (fabricFilter !== 'all' && (insp.fabricType ?? '').toLowerCase() !== fabricFilter.toLowerCase()) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'date') cmp = (a.date ?? '').localeCompare(b.date ?? '')
    if (sortField === 'score') cmp = (a.qualityScore ?? 0) - (b.qualityScore ?? 0)
    if (sortField === 'defects') cmp = (a.totalDefects ?? 0) - (b.totalDefects ?? 0)
    return sortDirection === 'desc' ? -cmp : cmp
  })

  const toggleSort = (field: 'date' | 'score' | 'defects') => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: 'date' | 'score' | 'defects' }) => {
    if (sortField !== field) return <FiChevronDown size={12} className="opacity-30" />
    return sortDirection === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Inspection History</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Browse and filter past inspections</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sample-toggle-hist" className="text-xs text-muted-foreground">Sample Data</Label>
          <Switch id="sample-toggle-hist" checked={useSampleData} onCheckedChange={setUseSampleData} />
        </div>
      </div>

      <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <FiFilter size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="conditional">Conditional</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fabricFilter} onValueChange={setFabricFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Fabric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fabrics</SelectItem>
                <SelectItem value="woven">Woven</SelectItem>
                <SelectItem value="knitted">Knitted</SelectItem>
                <SelectItem value="non-woven">Non-Woven</SelectItem>
                <SelectItem value="denim">Denim</SelectItem>
                <SelectItem value="silk">Silk</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || fabricFilter !== 'all') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setStatusFilter('all'); setFabricFilter('all') }}>
                <FiX size={12} /> Clear
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              {sorted.length} result{sorted.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md overflow-hidden">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <FiImage size={40} className="mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground">No inspections yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start your first inspection to see results here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Batch ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('date')}>
                    <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Fabric Type</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('defects')}>
                    <span className="flex items-center justify-center gap-1">Defects <SortIcon field="defects" /></span>
                  </th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs cursor-pointer select-none" onClick={() => toggleSort('score')}>
                    <span className="flex items-center justify-center gap-1">Score <SortIcon field="score" /></span>
                  </th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((insp) => (
                  <tr
                    key={insp.id}
                    onClick={() => onSelectInspection(insp)}
                    className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-medium text-foreground">{insp.batchId}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(insp.date)}</td>
                    <td className="p-3 text-muted-foreground">{insp.fabricType}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-medium text-foreground">{insp.totalDefects}</span>
                        <div className="flex gap-0.5">
                          {(insp.criticalCount ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title={`${insp.criticalCount} critical`} />}
                          {(insp.majorCount ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-orange-500" title={`${insp.majorCount} major`} />}
                          {(insp.minorCount ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500" title={`${insp.minorCount} minor`} />}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold" style={{ color: getScoreColor(insp.qualityScore) }}>
                        {insp.qualityScore}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={`text-xs ${getVerdictColor(insp.verdict)}`}>
                        {insp.verdict}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// --- Agent Status Panel ---
function AgentStatusPanel({ activeAgentId }: { activeAgentId: string | null }) {
  const agents = [
    { id: DEFECT_DETECTION_AGENT_ID, name: 'Defect Detection Agent', purpose: 'Analyzes fabric images for defects, scores quality, provides verdict' },
    { id: INSPECTION_ADVISOR_AGENT_ID, name: 'Inspection Advisor Agent', purpose: 'Answers questions about inspection results, provides corrective guidance' },
  ]

  return (
    <Card className="backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2.5">AI Agents</p>
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{agent.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Error Boundary ---
class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Inline Keyframe Styles ---
function InlineAnimationStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes scanline {
        0% { top: 0; }
        100% { top: 100%; }
      }
      @keyframes pulse-border {
        0%, 100% { border-color: hsl(222 47% 11% / 0.2); }
        50% { border-color: hsl(222 47% 11% / 0.7); }
      }
    `}} />
  )
}

// --- Main Page ---
export default function Page() {
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [useSampleData, setUseSampleData] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const handleSelectInspection = useCallback((insp: Inspection) => {
    setSelectedInspection(insp)
    setCurrentScreen('report')
  }, [])

  const handleNewInspection = useCallback(() => {
    setCurrentScreen('new-inspection')
  }, [])

  const handleInspectionComplete = useCallback((inspection: Inspection) => {
    setInspections((prev) => [inspection, ...prev])
    setSelectedInspection(inspection)
    setCurrentScreen('report')
  }, [])

  const handleBackFromReport = useCallback(() => {
    setSelectedInspection(null)
    setCurrentScreen('dashboard')
  }, [])

  return (
    <PageErrorBoundary>
      <InlineAnimationStyles />
      <div className="min-h-screen bg-gradient-to-br from-[hsl(210,20%,97%)] via-[hsl(220,25%,95%)] to-[hsl(200,20%,96%)] text-foreground flex">
        {/* Sidebar */}
        <div className="hidden md:flex">
          <Sidebar
            currentScreen={currentScreen}
            setCurrentScreen={(s) => {
              setCurrentScreen(s)
              if (s !== 'report') setSelectedInspection(null)
            }}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewInspection={handleNewInspection}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
              {currentScreen === 'dashboard' && (
                <DashboardScreen
                  inspections={inspections}
                  useSampleData={useSampleData}
                  setUseSampleData={setUseSampleData}
                  onSelectInspection={handleSelectInspection}
                  onNewInspection={handleNewInspection}
                />
              )}

              {currentScreen === 'new-inspection' && (
                <NewInspectionScreen onInspectionComplete={handleInspectionComplete} />
              )}

              {currentScreen === 'report' && selectedInspection && (
                <ReportDetailScreen
                  inspection={selectedInspection}
                  onBack={handleBackFromReport}
                />
              )}

              {currentScreen === 'history' && (
                <HistoryScreen
                  inspections={inspections}
                  useSampleData={useSampleData}
                  setUseSampleData={setUseSampleData}
                  onSelectInspection={handleSelectInspection}
                  searchQuery={searchQuery}
                />
              )}

              {/* Agent Status */}
              <AgentStatusPanel activeAgentId={activeAgentId} />

              {/* Mobile Navigation */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
                <div className="flex items-center justify-around py-2">
                  {[
                    { id: 'dashboard', icon: FiHome, label: 'Home' },
                    { id: 'new-inspection', icon: FiPlusCircle, label: 'New' },
                    { id: 'history', icon: FiClock, label: 'History' },
                  ].map((item) => {
                    const Icon = item.icon
                    const isActive = currentScreen === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentScreen(item.id)
                          if (item.id !== 'report') setSelectedInspection(null)
                        }}
                        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        <Icon size={18} />
                        <span className="text-[10px]">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </PageErrorBoundary>
  )
}
