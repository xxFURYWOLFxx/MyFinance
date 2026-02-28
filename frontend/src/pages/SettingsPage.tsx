import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { toast } from '@/stores/toastStore'
import { settingsService } from '@/services/settings.service'
import {
  User,
  Lock,
  Globe,
  Bell,
  Palette,
  Shield,
  Trash2,
  Check,
  Moon,
  Sun,
  Monitor,
  Loader2,
  AlertCircle,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'

const currencies = [
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'Fr' },
  { value: 'CNY', label: 'CNY - Chinese Yuan', symbol: '¥' },
  { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
]

const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

// Notification preferences storage key
const NOTIFICATION_PREFS_KEY = 'notification-preferences'

function loadNotificationPrefs() {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load notification prefs:', e)
  }
  return {
    budgetAlerts: true,
    goalMilestones: true,
    billReminders: true,
    weeklySummary: false,
  }
}

function saveNotificationPrefs(prefs: Record<string, boolean>) {
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Failed to save notification prefs:', e)
  }
}

export function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  // Profile form state
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Preferences state
  const [currency, setCurrency] = useState(user?.base_currency || 'USD')
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC')
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Export state
  const [exporting, setExporting] = useState(false)

  // Notification preferences state - load from localStorage
  const [notificationPrefs, setNotificationPrefs] = useState(loadNotificationPrefs)
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Save notification prefs when they change
  function handleNotificationToggle(key: string) {
    const newPrefs = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key as keyof typeof notificationPrefs]
    }
    setNotificationPrefs(newPrefs)
    saveNotificationPrefs(newPrefs)
    setNotificationMessage({ type: 'success', text: 'Notification settings saved' })
    setTimeout(() => setNotificationMessage(null), 2000)
  }

  async function handleSaveProfile() {
    try {
      setSavingProfile(true)
      setProfileMessage(null)
      const updated = await settingsService.updateProfile({
        first_name: firstName,
        last_name: lastName,
      })
      setUser(updated)
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error: any) {
      setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    try {
      setSavingPassword(true)
      setPasswordMessage(null)
      await settingsService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' })
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message || 'Failed to update password' })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSavePreferences() {
    try {
      setSavingPreferences(true)
      setPreferencesMessage(null)
      const updated = await settingsService.updateProfile({
        base_currency: currency,
        timezone: timezone,
      })
      setUser(updated)
      setPreferencesMessage({ type: 'success', text: 'Preferences saved successfully' })
    } catch (error: any) {
      setPreferencesMessage({ type: 'error', text: error.message || 'Failed to save preferences' })
    } finally {
      setSavingPreferences(false)
    }
  }

  async function handleExportData(format: 'json' | 'csv') {
    try {
      setExporting(true)
      const data = await settingsService.exportData(format)

      // Create and download file
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-data-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Data exported successfully as ${format.toUpperCase()}!`)
    } catch (error: any) {
      console.error('Failed to export data:', error)
      const errorMessage = error?.message || 'Unknown error'
      const status = error?.status || 0

      // Check if it's an auth error (401)
      if (status === 401) {
        toast.error('Session expired. Please log in again.')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else if (status === 404) {
        // Backend endpoint not found - may need restart
        toast.warning('Export service unavailable. Please restart the backend server.')
      } else {
        toast.error(`Export failed: ${errorMessage}`)
      }
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    try {
      setDeleting(true)
      await settingsService.deleteAccount()
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    } catch (error: any) {
      console.error('Failed to delete account:', error)
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Profile Settings */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white">
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-1" variant="secondary">
                {user?.role === 'admin' ? 'Administrator' : 'User'}
              </Badge>
            </div>
          </div>

          {profileMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              profileMessage.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {profileMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {profileMessage.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 bg-secondary/50 border-white/10 focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 bg-secondary/50 border-white/10 focus:border-blue-500/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="h-12 bg-secondary/30 border-white/10 text-muted-foreground"
            />
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          >
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              passwordMessage.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {passwordMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {passwordMessage.text}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-12 bg-secondary/50 border-white/10 focus:border-red-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-12 bg-secondary/50 border-white/10 focus:border-red-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 bg-secondary/50 border-white/10 focus:border-red-500/50"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
          >
            {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'dark', label: 'Dark', icon: Moon, desc: 'Dark background' },
                { value: 'light', label: 'Light', icon: Sun, desc: 'Light background' },
                { value: 'system', label: 'System', icon: Monitor, desc: 'Match device' },
              ].map((option) => {
                const Icon = option.icon
                const isSelected = theme === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as 'dark' | 'light' | 'system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-secondary/30 border-white/10 hover:border-purple-500/50 hover:bg-secondary/50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${isSelected ? 'bg-purple-500/30' : 'bg-white/5'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.desc}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-purple-400" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferencesMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              preferencesMessage.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {preferencesMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {preferencesMessage.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <div className="relative">
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-12 px-4 pr-10 rounded-xl bg-secondary/50 border border-white/10 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 appearance-none cursor-pointer text-foreground"
                >
                  {currencies.map((curr) => (
                    <option key={curr.value} value={curr.value} className="bg-background text-foreground">
                      {curr.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="relative">
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-12 px-4 pr-10 rounded-xl bg-secondary/50 border border-white/10 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 appearance-none cursor-pointer text-foreground"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-background text-foreground">
                      {tz.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          <Button
            onClick={handleSavePreferences}
            disabled={savingPreferences}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            {savingPreferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              notificationMessage.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {notificationMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {notificationMessage.text}
            </div>
          )}

          {[
            { key: 'budgetAlerts', label: 'Budget alerts', description: 'Get notified when approaching budget limits' },
            { key: 'goalMilestones', label: 'Goal milestones', description: 'Celebrate when you hit savings milestones' },
            { key: 'billReminders', label: 'Bill reminders', description: 'Remind me before bills are due' },
            { key: 'weeklySummary', label: 'Weekly summary', description: 'Receive weekly spending summaries' },
          ].map((setting) => {
            const isEnabled = notificationPrefs[setting.key as keyof typeof notificationPrefs]
            return (
              <div key={setting.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-white/5">
                <div>
                  <p className="font-medium">{setting.label}</p>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle(setting.key)}
                  className={`w-14 h-7 rounded-full relative transition-all duration-200 ${
                    isEnabled ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                    isEnabled ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Manage your data and export options</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleExportData('json')}
              disabled={exporting}
              className="h-14 border-white/10 hover:bg-white/5 flex flex-col items-center justify-center gap-1"
            >
              {exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileJson className="h-5 w-5 text-blue-400" />
              )}
              <span className="text-sm">Export as JSON</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('csv')}
              disabled={exporting}
              className="h-14 border-white/10 hover:bg-white/5 flex flex-col items-center justify-center gap-1"
            >
              {exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-5 w-5 text-green-400" />
              )}
              <span className="text-sm">Export as CSV</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Download all your financial data including income, expenses, budgets, goals, and more.
          </p>
        </CardContent>
      </Card>

      </div>

      {/* Danger Zone */}
      <Card className="glass-card border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions - proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 mb-3">
              Deleting your account will permanently remove all your data, including transactions, budgets, and goals. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-400">Are you absolutely sure?</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yes, Delete My Account
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsPage
