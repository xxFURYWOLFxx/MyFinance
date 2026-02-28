import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Sparkles, CheckCircle, ArrowLeft, Mail } from 'lucide-react'

export function RegisterForm() {
  const { register, isLoading, error, clearError } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setValidationError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters')
      return
    }

    try {
      await register(
        formData.email,
        formData.password,
        formData.firstName || undefined,
        formData.lastName || undefined
      )
      setSuccess(true)
    } catch {
      // Error is handled by the store
    }
  }

  const displayError = validationError || error

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 animated-bg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 glow">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold gradient-text">MyFinance</h1>
          </div>

          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm mb-2">
              We've sent a verification link to
            </p>
            <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2.5 rounded-xl bg-secondary/50">
              <Mail className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{formData.email}</span>
            </div>
            <p className="text-muted-foreground text-xs mb-2">
              Click the link in the email to verify your account. The link expires in 30 minutes.
            </p>
            <p className="text-muted-foreground/60 text-xs mb-6">
              Didn't receive it? Check your spam or junk folder.
            </p>
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 glow">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">MyFinance</h1>
          <p className="text-muted-foreground mt-1">Start your financial journey</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Create your account</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Join thousands managing their finances smarter
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {displayError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{displayError}</p>
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
                  className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50 input-glow transition-all"
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
                  className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50 input-glow transition-all"
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
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50 input-glow transition-all"
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
                className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50 input-glow transition-all"
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
                className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50 input-glow transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-200 glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterForm
