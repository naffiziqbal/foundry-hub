'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { formatCurrency } from './utils';

const CURRENCY_KEY = 'foundry_currency';
const DEFAULT_CURRENCY = 'USD';

interface RatesResponse {
  base: 'USD';
  /** ISO code → units per 1 USD */
  rates: Record<string, number>;
  fetchedAt: string;
  stale: boolean;
  currencies: { code: string; name: string }[];
}

interface CurrencyContextValue {
  /** Currency the user picked in the navbar. */
  currency: string;
  setCurrency: (code: string) => void;
  /** Navbar options (from the server, filtered to convertible codes). */
  currencies: { code: string; name: string }[];
  /**
   * Convert an amount from its source currency (the one it was scraped /
   * stored in) to the selected currency. Returns the amount unchanged when
   * rates are missing so the UI degrades to showing the original.
   */
  convert: (amount: number, from?: string) => { amount: number; currency: string };
  /** Convert + format for display, e.g. formatPrice(129.99, 'USD') → "৳15,847". */
  formatPrice: (amount?: number | null, from?: string) => string;
  ratesReady: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);

  // Hydrate the persisted choice after mount (SSR-safe)
  useEffect(() => {
    const saved = window.localStorage.getItem(CURRENCY_KEY);
    if (saved) setCurrencyState(saved);
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    window.localStorage.setItem(CURRENCY_KEY, code);
  }, []);

  // Upstream providers refresh daily; half-day staleness is fine
  const { data } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: () => api.get<RatesResponse>('/currencies'),
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });

  const value = useMemo<CurrencyContextValue>(() => {
    const rates = data?.rates;

    const convert = (amount: number, from = 'USD') => {
      const src = from.toUpperCase();
      const dst = currency.toUpperCase();
      if (src === dst) return { amount, currency: dst };
      const fromRate = rates?.[src];
      const toRate = rates?.[dst];
      // No rate table (yet) or unknown code → show the original untouched
      if (!fromRate || !toRate) return { amount, currency: src };
      return { amount: (amount / fromRate) * toRate, currency: dst };
    };

    const formatPrice = (amount?: number | null, from = 'USD') => {
      if (amount == null) return '—';
      const converted = convert(Number(amount), from);
      return formatCurrency(converted.amount, converted.currency);
    };

    return {
      currency,
      setCurrency,
      currencies: data?.currencies ?? [{ code: DEFAULT_CURRENCY, name: 'US Dollar' }],
      convert,
      formatPrice,
      ratesReady: !!rates,
    };
  }, [currency, setCurrency, data]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
