import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  badge?: {
    text: string;
    variant: 'default' | 'success' | 'warning' | 'danger';
  };
}

const badgeVariants = {
  default: 'bg-blue-100 text-blue-800 border-blue-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
};

export function PageHeader({ title, description, icon: Icon, actions, badge }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {Icon && (
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/30">
                <Icon className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{title}</h1>
                {badge && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeVariants[badge.variant]}`}>
                    {badge.text}
                  </span>
                )}
              </div>
              {description && (
                <p className="mt-2 text-base text-gray-600 max-w-3xl">{description}</p>
              )}
            </div>
          </div>
        </div>
        {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
      </div>
    </div>
  );
}
