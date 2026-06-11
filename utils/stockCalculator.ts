import { Product } from '../store/productStore';
import { Stock, FootbedEntry } from '../store/stockStore';
import { ProductionLog } from '../services/production';

export interface DeductionResult {
  leatherDeducted: number;
  leatherType: string;
  buckleDeducted: number;
  buckleType: string;
  footbedDeducted: number;
  footbedType: string;
  footbedGender: 'Men' | 'Women';
  footbedEuSize: number;
}

export interface ValidationResult {
  valid: boolean;
  material?: 'leather' | 'buckle' | 'footbed';
  message?: string;
}

export function calculateDeduction(
  product: Product,
  euSize: number,
  quantityPairs: number
): DeductionResult {
  const footbedQty = product.footbedPerPair ?? 2;
  const footbedType = product.footbedType ?? 'Standard Footbed';

  return {
    leatherDeducted: product.leatherSqfPerPair * quantityPairs,
    leatherType: product.leatherType || 'Nubuck',
    buckleDeducted: product.bucklePerPair * quantityPairs,
    buckleType: product.buckleType || 'Brass Buckle',
    footbedDeducted: footbedQty * quantityPairs,
    footbedType: footbedType,
    footbedGender: product.gender,
    footbedEuSize: euSize,
  };
}

export function validateStock(
  currentStock: Stock,
  deduction: DeductionResult,
  existingLog?: ProductionLog
): ValidationResult {
  // Validate leather
  const leatherToCheck = existingLog
    ? deduction.leatherDeducted - existingLog.leatherDeductedSqf
    : deduction.leatherDeducted;

  if (leatherToCheck > 0) {
    const leathers = currentStock.leathers || [];
    const leatherEntry = leathers.find(l => l.type === deduction.leatherType);
    const currentQty = leatherEntry ? leatherEntry.qty : 0;
    if (currentQty < leatherToCheck) {
      return {
        valid: false,
        material: 'leather',
        message: `Insufficient leather stock for type "${deduction.leatherType}". Need ${leatherToCheck.toFixed(2)} sqf, have ${currentQty.toFixed(2)} sqf.`,
      };
    }
  }

  // Validate buckle
  const buckleToCheck = existingLog
    ? deduction.buckleDeducted - existingLog.buckleDeducted
    : deduction.buckleDeducted;

  if (buckleToCheck > 0) {
    const buckles = currentStock.buckles || [];
    const buckleEntry = buckles.find(b => b.type === deduction.buckleType);
    const currentQty = buckleEntry ? buckleEntry.qty : 0;
    if (currentQty < buckleToCheck) {
      return {
        valid: false,
        material: 'buckle',
        message: `Insufficient buckle stock for type "${deduction.buckleType}". Need ${buckleToCheck}, have ${currentQty}.`,
      };
    }
  }

  // Validate footbed — find the specific gender+size entry
  const footbeds = currentStock.footbeds || [];
  const footbedEntry = footbeds.find(
    (f: FootbedEntry) => f.gender === deduction.footbedGender && f.euSize === deduction.footbedEuSize && f.type === deduction.footbedType
  );

  if (!footbedEntry) {
    return {
      valid: false,
      material: 'footbed',
      message: `No footbed stock found for ${deduction.footbedType} (${deduction.footbedGender} EU ${deduction.footbedEuSize}). Please inform the manager.`,
    };
  }

  const footbedToCheck = existingLog
    ? deduction.footbedDeducted - existingLog.footbedDeducted
    : deduction.footbedDeducted;

  if (footbedToCheck > 0 && footbedEntry.qty < footbedToCheck) {
    return {
      valid: false,
      material: 'footbed',
      message: `Not enough footbed stock for ${deduction.footbedGender} EU ${deduction.footbedEuSize}. Only ${footbedEntry.qty} pieces remaining.`,
    };
  }

  return { valid: true };
}

export function formatLeatherQty(sqf: number): string {
  return `${sqf.toFixed(2)} sqf`;
}

export function formatBuckleQty(qty: number): string {
  return `${qty} pcs`;
}

export function formatFootbedQty(qty: number): string {
  return `${qty} pcs`;
}

export function getStockPercentage(current: number, threshold: number): number {
  if (threshold === 0) return 100;
  return Math.round((current / threshold) * 100);
}

export function isBelowThreshold(current: number, threshold: number): boolean {
  return current < threshold;
}

export function getAvailableSizesForGender(gender: 'Men' | 'Women'): number[] {
  return gender === 'Men' ? [40, 41, 42, 43, 44] : [36, 37, 38, 39, 40, 41];
}

export function getFootbedTypeLabel(type: string, gender: 'Men' | 'Women', euSize: number): string {
  return `${type} EU${euSize} ${gender}`;
}