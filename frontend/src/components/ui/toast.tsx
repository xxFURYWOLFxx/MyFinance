import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, type Toast as ToastType } from '@/stores/toastStore'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400',
  error: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400',
  warning: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400',
  info: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
}

const iconStyles = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
}

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useToastStore((state) => state.removeToast)
  const Icon = icons[toast.type]

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm
        shadow-lg animate-in slide-in-from-right-full duration-300
        ${styles[toast.type]}
      `}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${iconStyles[toast.type]}`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

export { useToastStore, type ToastType }
