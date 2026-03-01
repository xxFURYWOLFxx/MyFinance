import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Target,
  Sparkles,
  TrendingUp,
  Plane,
  Home,
  Car,
  GraduationCap,
  Heart,
  Shield,
  Gift,
  Edit2,
  Trash2,
  X,
  Clock,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { goalsService } from '@/services/goals.service'
import type { Goal } from '@/types'

const GOAL_CATEGORIES = [
  { value: 'emergency', label: 'Emergency Fund', icon: Shield, color: 'from-green-500 to-emerald-500' },
  { value: 'travel', label: 'Travel', icon: Plane, color: 'from-blue-500 to-cyan-500' },
  { value: 'home', label: 'Home', icon: Home, color: 'from-purple-500 to-indigo-500' },
  { value: 'car', label: 'Vehicle', icon: Car, color: 'from-orange-500 to-amber-500' },
  { value: 'education', label: 'Education', icon: GraduationCap, color: 'from-pink-500 to-rose-500' },
  { value: 'health', label: 'Health', icon: Heart, color: 'from-red-500 to-pink-500' },
  { value: 'other', label: 'Other', icon: Gift, color: 'from-gray-500 to-slate-500' },
]

export function GoalsPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState<number | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Goal form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'emergency',
    target_amount: '',
    description: '',
    target_date: ''
  })

  // Contribution form state
  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionNote, setContributionNote] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await goalsService.getAll()
      setGoals(data)
    } catch (error) {
      console.error('Failed to load goals:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.target_amount) return

    try {
      setSaving(true)
      const data = {
        name: formData.name,
        category: formData.category,
        target_amount: parseFloat(formData.target_amount),
        description: formData.description || undefined,
        target_date: formData.target_date || undefined
      }

      if (editingId) {
        await goalsService.update(editingId, data)
      } else {
        await goalsService.create(data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save goal:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault()
    if (!showContributeModal || !contributionAmount) return

    try {
      setSaving(true)
      await goalsService.addContribution(showContributeModal, {
        goal_id: showContributeModal,
        amount: parseFloat(contributionAmount),
        date: new Date().toISOString().split('T')[0],
        notes: contributionNote || undefined
      })
      await loadData()
      setShowContributeModal(null)
      setContributionAmount('')
      setContributionNote('')
    } catch (error) {
      console.error('Failed to add contribution:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      await goalsService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  function handleEdit(goal: Goal) {
    setFormData({
      name: goal.name,
      category: goal.category || 'other',
      target_amount: goal.target_amount.toString(),
      description: goal.description || '',
      target_date: goal.target_date || ''
    })
    setEditingId(goal.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      category: 'emergency',
      target_amount: '',
      description: '',
      target_date: ''
    })
    setEditingId(null)
    setShowAddModal(false)
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)

  const getCategoryInfo = (categoryValue: string | null) => {
    return GOAL_CATEGORIES.find(c => c.value === categoryValue) || GOAL_CATEGORIES[6]
  }

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return 'No deadline'
    const now = new Date()
    const target = new Date(deadline)
    const months = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months <= 0) return 'Past due'
    if (months === 1) return '1 month left'
    if (months < 12) return `${months} months left`
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''} left`
    return `${years}y ${remainingMonths}m left`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Financial Goals</h1>
          <p className="text-muted-foreground">Track progress towards your dreams</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Saved</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <Target className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(totalSaved)}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} className="h-2 flex-1 bg-white/10" />
                  <span className="text-xs text-muted-foreground">
                    {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Target Total</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(totalTarget)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(totalTarget - totalSaved)} remaining
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{goals.filter(g => g.status === 'in_progress').length}</div>
                <p className="text-xs text-muted-foreground mt-1">of {goals.length} total goals</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="glass-card h-64 animate-pulse">
              <div className="h-full bg-white/5" />
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No financial goals yet</p>
            <p className="text-sm mt-1">Click "New Goal" to start tracking your financial dreams</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map((goal) => {
            const category = getCategoryInfo(goal.category)
            const Icon = category.icon
            const percentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
            const timeRemaining = getTimeRemaining(goal.target_date)

            return (
              <Card key={goal.id} className="glass-card group overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${category.color}`} />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{goal.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{category.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeRemaining}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                      onClick={() => handleEdit(goal)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{formatCurrency(goal.current_amount)}</p>
                      <p className="text-sm text-muted-foreground">of {formatCurrency(goal.target_amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-cyan-400">{percentage.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">complete</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={Math.min(percentage, 100)} className="h-3 bg-white/10" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(goal.target_amount - goal.current_amount)} to go</span>
                      <Badge
                        variant={goal.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {goal.status}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowContributeModal(goal.id)}
                    className="w-full bg-secondary/50 hover:bg-secondary border border-white/10 hover:border-cyan-500/50 transition-all"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contribution
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">
                {editingId ? 'Edit Goal' : 'New Goal'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Dream Vacation"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-cyan-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GOAL_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon
                      const isSelected = formData.category === cat.value
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/50'
                              : 'bg-secondary/50 border-white/5 hover:bg-secondary'
                          } border`}
                        >
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.color}`}>
                            <CatIcon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[9px]">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Target Amount</Label>
                  <Input
                    id="target"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    placeholder="0.00"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-cyan-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Target Date (Optional)</Label>
                  <DatePicker
                    id="deadline"
                    value={formData.target_date}
                    onChange={(val) => setFormData({ ...formData, target_date: val })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What are you saving for?"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-cyan-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Goal'
                  ) : (
                    'Create Goal'
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-sm mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">Add Contribution</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowContributeModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleContribute}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contribution">Amount</Label>
                  <Input
                    id="contribution"
                    type="number"
                    step="0.01"
                    min="0"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-cyan-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (Optional)</Label>
                  <Input
                    id="note"
                    value={contributionNote}
                    onChange={(e) => setContributionNote(e.target.value)}
                    placeholder="e.g., Monthly savings"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-cyan-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Contribution'
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default GoalsPage
