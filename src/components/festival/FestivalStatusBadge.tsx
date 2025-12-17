'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle, Snowflake } from 'lucide-react';
import { FestivalStatus } from '@prisma/client';

interface FestivalStatusBadgeProps {
  status: FestivalStatus;
  expiresAt?: Date | string | null;
  size?: 'sm' | 'default';
}

export function FestivalStatusBadge({ status, expiresAt, size = 'default' }: FestivalStatusBadgeProps) {
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  
  // If expired, show expired badge regardless of festival status
  if (isExpired) {
    return (
      <Badge 
        variant="destructive" 
        className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : ''} bg-red-100 text-red-700 border-red-200 hover:bg-red-100`}
      >
        <AlertTriangle className={`${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
        Expired
      </Badge>
    );
  }

  switch (status) {
    case 'UPCOMING':
      return (
        <Badge 
          variant="secondary" 
          className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : ''} bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100`}
        >
          <Clock className={`${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
          Upcoming
        </Badge>
      );
    case 'ONGOING':
      return (
        <Badge 
          variant="secondary" 
          className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : ''} bg-green-100 text-green-700 border-green-200 hover:bg-green-100`}
        >
          <CheckCircle className={`${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
          Active
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge 
          variant="secondary" 
          className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : ''} bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100`}
        >
          <Snowflake className={`${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
          Completed
        </Badge>
      );
    default:
      return null;
  }
}
