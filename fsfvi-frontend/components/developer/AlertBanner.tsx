import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { ReactNode } from 'react';

interface AlertBannerProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string | ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200',
    border: 'border-l-blue-400',
    icon: Info,
    iconColor: 'text-blue-600',
    title: 'text-blue-900',
    message: 'text-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  success: {
    container: 'bg-green-50 border-green-200',
    border: 'border-l-green-400',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
    title: 'text-green-900',
    message: 'text-green-800',
    button: 'bg-green-600 hover:bg-green-700 text-white',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    border: 'border-l-yellow-400',
    icon: AlertCircle,
    iconColor: 'text-yellow-600',
    title: 'text-yellow-900',
    message: 'text-yellow-800',
    button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  error: {
    container: 'bg-red-50 border-red-200',
    border: 'border-l-red-400',
    icon: XCircle,
    iconColor: 'text-red-600',
    title: 'text-red-900',
    message: 'text-red-800',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
};

export function AlertBanner({
  variant,
  title,
  message,
  action,
  dismissible = false,
  onDismiss,
}: AlertBannerProps) {
  const styles = variantStyles[variant];
  const IconComponent = styles.icon;

  return (
    <div className={`border ${styles.container} ${styles.border} rounded-lg p-4 shadow-sm border-l-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${styles.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-semibold ${styles.title}`}>{title}</h3>
          <div className={`mt-1 text-sm ${styles.message}`}>
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg ${styles.button} transition-colors shadow-sm`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`ml-3 flex-shrink-0 ${styles.iconColor} hover:opacity-75 transition-opacity`}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
