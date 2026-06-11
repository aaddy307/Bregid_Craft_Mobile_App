import { create } from 'zustand';

export interface StockThresholds {
  leatherSqf: number;
  buckleQty: number;
  footbedQty: number;
}

export interface LeatherEntry {
  type: string;
  qty: number;
}

export interface BuckleEntry {
  type: string;
  qty: number;
}

export interface FootbedEntry {
  gender: 'Men' | 'Women';
  euSize: number;
  type: string;
  qty: number;
}

export interface Stock {
  _id: string;
  leatherSqf: number;
  leatherType: string;
  buckleQty: number;
  buckleType: string;
  footbeds: FootbedEntry[];
  leathers?: LeatherEntry[];
  buckles?: BuckleEntry[];
  thresholds: StockThresholds;
  lastUpdated: string;
}

interface StockState {
  stock: Stock | null;
  isLoading: boolean;
  error: string | null;
  setStock: (stock: Stock | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isLowStock: (material: 'leather' | 'buckle' | 'footbed', gender?: 'Men' | 'Women', euSize?: number, type?: string) => boolean;
  getFootbedStock: (gender: 'Men' | 'Women', euSize: number, type?: string) => FootbedEntry | undefined;
  getTotalFootbedQty: () => number;
}

export const useStockStore = create<StockState>((set, get) => ({
  stock: null,
  isLoading: false,
  error: null,

  setStock: (stock) => set({ stock }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  isLowStock: (material, gender?, euSize?, type?) => {
    const stock = get().stock;
    if (!stock) return false;

    const thresholds = stock.thresholds;
    switch (material) {
      case 'leather':
        if (type) {
          const entry = stock.leathers?.find(l => l.type === type);
          return entry ? entry.qty < thresholds.leatherSqf : true;
        }
        return stock.leatherSqf < thresholds.leatherSqf || (stock.leathers?.some(l => l.qty < thresholds.leatherSqf) ?? false);
      case 'buckle':
        if (type) {
          const entry = stock.buckles?.find(b => b.type === type);
          return entry ? entry.qty < thresholds.buckleQty : true;
        }
        return stock.buckleQty < thresholds.buckleQty || (stock.buckles?.some(b => b.qty < thresholds.buckleQty) ?? false);
      case 'footbed':
        if (gender && euSize) {
          const footbed = stock.footbeds?.find(f => f.gender === gender && f.euSize === euSize && (!type || f.type === type));
          return footbed ? footbed.qty < thresholds.footbedQty : true;
        }
        const totalFootbedQty = stock.footbeds?.reduce((sum, f) => sum + f.qty, 0) ?? 0;
        return totalFootbedQty < thresholds.footbedQty || (stock.footbeds?.some(f => f.qty < thresholds.footbedQty) ?? false);
      default:
        return false;
    }
  },

  getFootbedStock: (gender, euSize, type) => {
    const stock = get().stock;
    if (!stock) return undefined;
    return stock.footbeds.find(f => f.gender === gender && f.euSize === euSize && (!type || f.type === type));
  },

  getTotalFootbedQty: () => {
    const stock = get().stock;
    if (!stock) return 0;
    return stock.footbeds.reduce((sum, f) => sum + f.qty, 0);
  },
}));