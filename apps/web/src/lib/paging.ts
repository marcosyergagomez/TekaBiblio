import type { AxiosRequestConfig } from 'axios';
import { api } from './api';
import type { Page } from './types';

export async function getPage<T>(
  url: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Page<T>> {
  const config: AxiosRequestConfig = { params, signal };
  const response = await api.get<Partial<Page<T>>>(url, config);

  return {
    items: response.data.items ?? [],
    total: Number(response.data.total ?? 0),
    page: Number(response.data.page ?? params.page ?? 1),
    pageSize: Number(response.data.pageSize ?? params.pageSize ?? 20),
  };
}

export async function fetchAllItems<T>(
  loadPage: (page: number, pageSize: number) => Promise<Page<T>>,
  pageSize = 100,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  for (;;) {
    const result = await loadPage(page, pageSize);
    items.push(...result.items);

    if (result.items.length === 0 || items.length >= result.total || page >= 50) {
      return items;
    }

    page += 1;
  }
}
