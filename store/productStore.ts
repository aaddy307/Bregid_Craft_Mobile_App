import { create } from 'zustand';

export interface FootbedSpec {
  euSize: number;
  footbedType: string;
  qtyPerPair: number;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  gender: 'Men' | 'Women';
  sizes: number[];
  leatherSqfPerPair: number;
  leatherType: string;
  bucklePerPair: number;
  buckleType: string;
  footbedPerPair?: number;
  footbedType?: string;
  footbedspecs: FootbedSpec[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getProductById: (id: string) => Product | undefined;
  getProductsByGender: (gender: 'Men' | 'Women') => Product[];
  getActiveProducts: () => Product[];
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  setProducts: (products) => set({ products }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  getProductById: (id) => get().products.find((p) => p._id === id),

  getProductsByGender: (gender) =>
    get().products.filter((p) => p.gender === gender && p.isActive),

  getActiveProducts: () => get().products.filter((p) => p.isActive),
}));