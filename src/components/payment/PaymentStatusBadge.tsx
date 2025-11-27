import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface PaymentStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PaymentStatusBadge({ status, size = 'md' }: PaymentStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const statusMap: {
      [key: string]: {
        label: string;
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        icon: ReactNode;
        color: string;
      };
    } = {
      'pending': {
        label: 'En attente',
        variant: 'outline',
        icon: <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        color: 'text-yellow-600',
      },
      'pending_delivery': {
        label: 'En attente de livraison',
        variant: 'outline',
        icon: <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        color: 'text-blue-600',
      },
      'processing': {
        label: 'En traitement',
        variant: 'secondary',
        icon: <Loader2 className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} />,
        color: 'text-blue-600',
      },
      'completed': {
        label: 'Complété',
        variant: 'default',
        icon: <CheckCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        color: 'text-green-600',
      },
      'failed': {
        label: 'Échoué',
        variant: 'destructive',
        icon: <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        color: 'text-red-600',
      },
      'cancelled': {
        label: 'Annulé',
        variant: 'destructive',
        icon: <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        color: 'text-red-600',
      },
    };

    return statusMap[status] || statusMap['pending'];
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-1',
    md: 'text-sm gap-1.5 px-3 py-1.5',
    lg: 'text-base gap-2 px-4 py-2',
  };

  return (
    <Badge variant={config.variant} className={`flex items-center ${sizeClasses[size]}`}>
      <span className={config.color}>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  );
}
