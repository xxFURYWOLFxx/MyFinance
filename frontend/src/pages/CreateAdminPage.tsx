import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth.service'
import {
  AlertCircle,
  Loader2,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Globe,
} from 'lucide-react'

export function CreateAdminPage() {
  const [isLocalhost, setIsLocalhost] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [createdEmail, setCreatedEmail] = useState('')

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    try {
      const result = await authService.checkLocalhost()
      setIsLocalhost(result.is_localhost)
    } catch {
      setIsLocalhost(false)
    } finally {
      setChecking(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      setSubmitting(true)
      await authService.createAdmin({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName || undefined,
        last_name: formData.lastName || undefined,
      })
      setCreatedEmail(formData.email)
      setSuccess(true)
      setFormData({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' })
    } catch (err: any) {
      setError(err.message || 'Failed to create admin account')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-bg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
        </div>
        <div className="glass-card rounded-2xl p-8 text-center relative">
          <Loader2 className="h-8 w-8 animate-spin text-red-400 mx-auto mb-3" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Blocked - not localhost
  if (!isLocalhost) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 animated-bg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md relative">
          <div className="glass-card rounded-2xl p-8 text-center border-red-500/30">
            <div className="p-4 rounded-2xl bg-red-500/10 inline-block mb-4">
              <ShieldAlert className="h-12 w-12 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              Admin account creation is only available when accessing from <strong className="text-foreground">localhost</strong>.
            </p>
            <div className="flex items-center gap-2 justify-center p-3 rounded-xl bg-secondary/30 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>This page can only be accessed from the server machine</span>
            </div>
            <Link
              to="/login"
              className="inline-block mt-6 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 animated-bg">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 glow">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Admin Setup</h1>
          <p className="text-muted-foreground mt-1">Create an administrator account</p>
        </div>

        {/* Localhost badge */}
        <div className="flex items-center gap-2 justify-center mb-4 p-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <Lock className="h-4 w-4 text-green-400" />
          <span className="text-xs text-green-400 font-medium">Localhost access verified</span>
        </div>

        {/* Success message */}
        {success && (
          <div className="glass-card rounded-2xl p-8 text-center mb-6 border-green-500/30">
            <div className="p-4 rounded-2xl bg-green-500/10 inline-block mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-green-400 mb-2">Admin Created!</h2>
            <p className="text-muted-foreground mb-1">
              Admin account for <strong className="text-foreground">{createdEmail}</strong> has been created.
            </p>
            <p className="text-sm text-muted-foreground mb-4">They can now log in with admin privileges.</p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setSuccess(false)}
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                Create Another
              </Button>
              <Link to="/login">
                <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">New Admin Account</h2>
              <p className="text-muted-foreground text-sm mt-1">
                This account will have full system access
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50 input-glow transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    autoComplete="family-name"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50 input-glow transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50 input-glow transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50 input-glow transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50 input-glow transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all duration-200 glow"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating admin...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Create Admin Account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="text-red-400 hover:text-red-300 font-medium transition-colors"
                >
                  Back to login
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateAdminPage
