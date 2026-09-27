import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  baseUrl: string;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: '/api',
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  factory: () => DEFAULT_API_CONFIG,
});

export function provideApiConfig(config: Partial<ApiConfig> = {}): { provide: typeof API_CONFIG; useValue: ApiConfig } {
  return { provide: API_CONFIG, useValue: { ...DEFAULT_API_CONFIG, ...config } };
}
