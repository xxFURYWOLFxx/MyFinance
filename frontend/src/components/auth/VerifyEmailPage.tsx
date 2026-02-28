import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found. Please check your email for the correct link.')
      return
    }

    authService
      .verifyEmail(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.message)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(
          err instanceof Error ? err.message : 'Verification failed. The link may be invalid or expired.'
        )
      })
  }, [token])

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
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Verifying your email...</h2>
              <p className="text-muted-foreground text-sm">Just a moment while we confirm your address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-green-500/10">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Email verified!</h2>
              <p className="text-muted-foreground text-sm mb-6">{message}</p>
              <Link to="/login">
                <Button className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-200 glow">
                  Sign in to your account
                </Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Verification failed</h2>
              <p className="text-muted-foreground text-sm mb-6">{message}</p>
              <div className="flex flex-col gap-3">
                <Link to="/login">
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl"
                  >
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
