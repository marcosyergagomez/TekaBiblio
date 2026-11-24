import axios from 'axios';

function messageFromBody(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('message' in data)) {
    return null;
  }

  const message = (data as { message: unknown }).message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const parts = message.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    return parts.length > 0 ? parts.join(', ') : null;
  }

  return null;
}

export function readApiError(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  return messageFromBody(error.response?.data);
}

export function isAbortError(error: unknown): boolean {
  if (axios.isCancel(error)) {
    return true;
  }

  if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
    return true;
  }

  return error instanceof DOMException && error.name === 'AbortError';
}
