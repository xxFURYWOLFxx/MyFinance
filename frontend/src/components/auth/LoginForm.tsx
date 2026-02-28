import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/auth.service'
import { ApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Sparkles, Mail, RefreshCw } from 'lucide-react'

export function LoginForm() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setEmailNotVerified(false)
    setResendSuccess(false)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      // Detect "email not verified" 403
      if (err instanceof ApiError && err.status === 403 && err.originalMessage.toLowerCase().includes('email not verified')) {
        setEmailNotVerified(true)
      }
    }
  }

  const handleResendVerification = async () => {
    if (!email) return
    setResendLoading(true)
    try {
      await authService.resendVerification(email)
      setResendSuccess(true)
    } catch {
      // Silently fail — the endpoint always returns success anyway
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animated-bg">
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
          <p className="text-muted-foreground mt-1">Your financial command center</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to continue to your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && !emailNotVerified && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {emailNotVerified && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-200 font-medium mb-1">Email not verified</p>
                    <p className="text-xs text-amber-200/70 mb-3">
                      Please check your inbox and click the verification link before signing in.
                    </p>
                    {resendSuccess ? (
                      <p className="text-xs text-green-400">
                        Verification email sent! Check your inbox.
                      </p>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="h-8 text-xs border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
                      >
                        {resendLoading ? (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 h-3 w-3" />
                        )}
                        Resend verification email
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50 input-glow transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Demo account hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            Demo: admin@test.com / password123
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
