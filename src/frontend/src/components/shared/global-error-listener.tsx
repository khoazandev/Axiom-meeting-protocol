'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function GlobalErrorListener() {
  const router = useRouter();

  useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent<ApiRequestError>;
      const error = customEvent.detail;

      if (!error) return;

      // Log to console for debugging
      console.error('[GlobalErrorListener] Caught API Error:', error);

      // Show toast notification
      toast.error(`Lỗi: ${error.message || 'Có lỗi xảy ra từ máy chủ'}`, {
        description: error.detail || `Mã lỗi: ${error.code} (Status: ${error.status})`,
        duration: 5000,
      });

      // Handle navigation based on error status/code
      if (error.status === 401) {
        // Handled in api.ts directly (redirects to /login)
      } else if (error.status === 403) {
        // Forbidden
        toast.warning('Bạn không có quyền thực hiện hành động này.');
      } else if (error.status === 404) {
        // Not Found
        // Optionally redirect to home or previous page if the requested resource does not exist
        // router.push('/');
      } else if (error.status >= 500) {
        // Server Error
        toast.error('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
      }
    };

    window.addEventListener('api-error', handleApiError);

    return () => {
      window.removeEventListener('api-error', handleApiError);
    };
  }, [router]);

  return null;
}
