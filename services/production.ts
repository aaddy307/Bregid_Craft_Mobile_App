import { mongoService } from './mongodb';
import { Product, FootbedSpec } from '../store/productStore';
import { Stock, FootbedEntry } from '../store/stockStore';
import { validateStock, calculateDeduction } from '../utils/stockCalculator';
import { checkInternet } from '../utils';

export interface ProductionLog {
  _id: string;
  workerId: string;
  workerName: string;
  productId: string;
  productName: string;
  sku: string;
  gender: 'Men' | 'Women';
  euSize: number;
  quantityPairs: number;
  leatherDeductedSqf: number;
  leatherType: string;
  buckleDeducted: number;
  buckleType: string;
  footbedDeducted: number;
  footbedType: string;
  footbedGender: 'Men' | 'Women';
  footbedEuSize: number;
  timestamp: string;
  logDate: string;
}

interface CreateProductionLogInput {
  workerId: string;
  workerName: string;
  product: Product;
  euSize: number;
  quantityPairs: number;
  updatedBy: string;
  updatedByName: string;
}

interface ProductionError extends Error {
  code?: 'NO_INTERNET' | 'INSUFFICIENT_STOCK' | 'SUBMISSION_FAILED';
}

export async function createProductionLog(
  input: CreateProductionLogInput
): Promise<ProductionLog | null> {
  if (!(await checkInternet())) {
    const error = new Error('No internet connection') as ProductionError;
    error.code = 'NO_INTERNET';
    throw error;
  }
  try {
    const logDate = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    // Step 1-4: Validate stock with new deduction logic
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) {
      const error = new Error('Stock document not found') as ProductionError;
      error.code = 'SUBMISSION_FAILED';
      throw error;
    }

    // Calculate deduction for this specific size
    const deduction = calculateDeduction(input.product, input.euSize, input.quantityPairs);
    const validation = validateStock(stock, deduction);
    if (!validation.valid) {
      const error = new Error(validation.message || `Not enough ${validation.material} in stock. Please inform the manager.`) as ProductionError;
      error.code = 'INSUFFICIENT_STOCK';
      throw error;
    }

    // Step 6: Insert production log
    const result = await mongoService.insertOne<ProductionLog>('production_logs', {
      workerId: input.workerId,
      workerName: input.workerName,
      productId: input.product._id,
      productName: input.product.name,
      sku: input.product.sku,
      gender: input.product.gender,
      euSize: input.euSize,
      quantityPairs: input.quantityPairs,
      leatherDeductedSqf: deduction.leatherDeducted,
      leatherType: deduction.leatherType,
      buckleDeducted: deduction.buckleDeducted,
      buckleType: deduction.buckleType,
      footbedDeducted: deduction.footbedDeducted,
      footbedType: deduction.footbedType,
      footbedGender: deduction.footbedGender,
      footbedEuSize: deduction.footbedEuSize,
      timestamp,
      logDate,
    });

    if (!result) {
      const error = new Error('Failed to create production log') as ProductionError;
      error.code = 'SUBMISSION_FAILED';
      throw error;
    }

    // Step 7: Atomically deduct leather and buckle from stock category-wise
    if (deduction.leatherDeducted > 0) {
      const existingLeathers = stock.leathers || [];
      const leatherIndex = existingLeathers.findIndex((l: any) => l.type === deduction.leatherType);
      if (leatherIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            leatherSqf: -deduction.leatherDeducted,
            [`leathers.${leatherIndex}.qty`]: -deduction.leatherDeducted
          },
          $currentDate: { lastUpdated: true }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { leatherSqf: -deduction.leatherDeducted },
          $currentDate: { lastUpdated: true }
        });
      }
    }

    if (deduction.buckleDeducted > 0) {
      const existingBuckles = stock.buckles || [];
      const buckleIndex = existingBuckles.findIndex((b: any) => b.type === deduction.buckleType);
      if (buckleIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            buckleQty: -deduction.buckleDeducted,
            [`buckles.${buckleIndex}.qty`]: -deduction.buckleDeducted
          },
          $currentDate: { lastUpdated: true }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { buckleQty: -deduction.buckleDeducted },
          $currentDate: { lastUpdated: true }
        });
      }
    }

    // Deduct footbed from specific gender+size entry
    const existingFootbeds = stock.footbeds || [];
    const footbedIndex = existingFootbeds.findIndex(
      (f: FootbedEntry) => f.gender === deduction.footbedGender && f.euSize === deduction.footbedEuSize && f.type === deduction.footbedType
    );

    if (footbedIndex >= 0) {
      await mongoService.updateOne('stock', { _id: stock._id }, {
        $inc: { [`footbeds.${footbedIndex}.qty`]: -deduction.footbedDeducted },
        $currentDate: { lastUpdated: true },
      });
    }

    // Step 8: Insert stock logs
    if (deduction.leatherDeducted > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'deduct',
        material: 'leather',
        materialType: deduction.leatherType,
        quantity: deduction.leatherDeducted,
        unit: 'sqf',
        reason: 'worker_entry',
        referenceId: result._id,
        updatedBy: input.updatedBy,
        updatedByName: input.updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    if (deduction.buckleDeducted > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'deduct',
        material: 'buckle',
        materialType: deduction.buckleType,
        quantity: deduction.buckleDeducted,
        unit: 'pieces',
        reason: 'worker_entry',
        referenceId: result._id,
        updatedBy: input.updatedBy,
        updatedByName: input.updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    if (deduction.footbedDeducted > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'deduct',
        material: 'footbed',
        materialType: deduction.footbedType,
        quantity: deduction.footbedDeducted,
        unit: 'pieces',
        reason: 'worker_entry',
        referenceId: result._id,
        footbedGender: deduction.footbedGender,
        footbedEuSize: deduction.footbedEuSize,
        updatedBy: input.updatedBy,
        updatedByName: input.updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 9: Check low stock thresholds
    await checkAndNotifyLowStock(input.updatedBy);

    // Step 10: Check daily target
    await checkDailyTarget(input.workerId, input.workerName);

    return result;
  } catch (error) {
    throw error;
  }
}

async function checkAndNotifyLowStock(actorId: string): Promise<void> {
  try {
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock || !stock.thresholds) return;

    const { thresholds } = stock;

    // Check leather
    if ((stock.leatherSqf ?? 0) <= (thresholds.leatherSqf ?? 0)) {
      await mongoService.insertOne('notifications', {
        type: 'low_stock',
        title: '⚠️ Low Stock Alert',
        message: `Leather is running low: ${(stock.leatherSqf ?? 0).toFixed(2)} sqf remaining${stock.leatherType ? ` (${stock.leatherType})` : ''}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        createdBy: actorId,
      });
    }

    // Check buckle
    if (stock.buckleQty <= thresholds.buckleQty) {
      await mongoService.insertOne('notifications', {
        type: 'low_stock',
        title: '⚠️ Low Stock Alert',
        message: `Buckles are running low: ${stock.buckleQty} pieces remaining${stock.buckleType ? ` (${stock.buckleType})` : ''}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        createdBy: actorId,
      });
    }

    // Check each footbed gender+size separately
    const footbeds = stock.footbeds || [];
    for (const footbed of footbeds) {
      if (footbed.qty <= thresholds.footbedQty) {
        await mongoService.insertOne('notifications', {
          type: 'low_stock',
          title: '⚠️ Low Stock Alert',
          message: `Footbed (${footbed.gender} EU ${footbed.euSize} — ${footbed.type}) is running low: ${footbed.qty} pieces remaining`,
          isRead: false,
          createdAt: new Date().toISOString(),
          createdBy: actorId,
        });
      }
    }
  } catch {
    // Silently handle notification errors
  }
}

async function checkDailyTarget(workerId: string, workerName: string): Promise<void> {
  try {
    const worker = await mongoService.findOne<{ dailyTarget?: number }>('users', { _id: workerId });
    if (!worker || !worker.dailyTarget) return;

    const today = new Date().toISOString().split('T')[0];
    const todayLogs = await mongoService.findMany('production_logs', { workerId, logDate: today });
    const totalPairs = todayLogs.reduce((sum: number, log: any) => sum + (log.quantityPairs || 0), 0);

    if (totalPairs >= (worker.dailyTarget || 0)) {
      // Send notification to all managers
      const managers = await mongoService.findMany('users', { role: 'manager' });
      for (const manager of managers) {
        if (manager.expoPushToken) {
          await mongoService.insertOne('notifications', {
            type: 'target_reached',
            title: '🎉 Target Reached!',
            message: `${workerName} has hit their daily target of ${worker.dailyTarget} pairs!`,
            isRead: false,
            createdAt: new Date().toISOString(),
            createdBy: 'system',
          });
        }
      }
    }
  } catch {
    // Silently handle notification errors
  }
}

export async function getProductionLogs(
  filter: Record<string, unknown> = {},
  limit = 100
): Promise<ProductionLog[]> {
  try {
    return await mongoService.findMany<ProductionLog>('production_logs', filter, {
      sort: { timestamp: -1 },
      limit,
    });
  } catch {
    return [];
  }
}

export async function getWorkerLogs(workerId: string, limit = 50): Promise<ProductionLog[]> {
  return getProductionLogs({ workerId }, limit);
}

export async function getTodayLogs(): Promise<ProductionLog[]> {
  const today = new Date().toISOString().split('T')[0];
  return getProductionLogs({ logDate: today });
}

export async function updateProductionLog(
  logId: string,
  newQuantity: number,
  updatedBy: string,
  updatedByName: string
): Promise<boolean> {
  try {
    const existingLog = await mongoService.findOne<ProductionLog>('production_logs', { _id: logId });
    if (!existingLog) return false;

    // Check if same day
    const today = new Date().toISOString().split('T')[0];
    if (existingLog.logDate !== today) {
      throw new Error('Can only edit same-day entries');
    }

    const quantityDiff = newQuantity - existingLog.quantityPairs;
    if (quantityDiff === 0) return true;

    // Get product for deduction calculations
    const product = await mongoService.findOne<Product>('products', { _id: existingLog.productId });
    if (!product) return false;

    // Calculate new deduction
    const newDeduction = calculateDeduction(product, existingLog.euSize, newQuantity);
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) return false;

    // If increasing, validate stock
    if (quantityDiff > 0) {
      const diffDeduction = calculateDeduction(product, existingLog.euSize, quantityDiff);
      const validation = validateStock(stock, diffDeduction, existingLog);
      if (!validation.valid) {
        throw new Error(validation.message || `Not enough ${validation.material} in stock`);
      }
    }

    // Calculate the difference
    const oldDeduction = calculateDeduction(product, existingLog.euSize, existingLog.quantityPairs);
    const leatherDiff = newDeduction.leatherDeducted - oldDeduction.leatherDeducted;
    const buckleDiff = newDeduction.buckleDeducted - oldDeduction.buckleDeducted;
    const footbedDiff = newDeduction.footbedDeducted - oldDeduction.footbedDeducted;

    // Update leather with diff category-wise
    if (leatherDiff !== 0) {
      const existingLeathers = stock.leathers || [];
      const leatherIndex = existingLeathers.findIndex((l: any) => l.type === newDeduction.leatherType);
      if (leatherIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            leatherSqf: -leatherDiff,
            [`leathers.${leatherIndex}.qty`]: -leatherDiff
          },
          $set: { lastUpdated: new Date().toISOString() }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { leatherSqf: -leatherDiff },
          $set: { lastUpdated: new Date().toISOString() }
        });
      }
    }

    // Update buckle with diff category-wise
    if (buckleDiff !== 0) {
      const existingBuckles = stock.buckles || [];
      const buckleIndex = existingBuckles.findIndex((b: any) => b.type === newDeduction.buckleType);
      if (buckleIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            buckleQty: -buckleDiff,
            [`buckles.${buckleIndex}.qty`]: -buckleDiff
          },
          $set: { lastUpdated: new Date().toISOString() }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { buckleQty: -buckleDiff },
          $set: { lastUpdated: new Date().toISOString() }
        });
      }
    }

    // Update footbed for specific gender+size
    if (footbedDiff !== 0) {
      const existingFootbeds = stock.footbeds || [];
      const footbedIndex = existingFootbeds.findIndex(
        (f: FootbedEntry) => f.gender === existingLog.footbedGender && f.euSize === existingLog.footbedEuSize && f.type === existingLog.footbedType
      );
      if (footbedIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { [`footbeds.${footbedIndex}.qty`]: -footbedDiff },
          $set: { lastUpdated: new Date().toISOString() },
        });
      }
    }

    // Log stock changes
    if (Math.abs(leatherDiff) > 0) {
      await mongoService.insertOne('stock_logs', {
        type: leatherDiff > 0 ? 'deduct' : 'add',
        material: 'leather',
        materialType: newDeduction.leatherType,
        quantity: Math.abs(leatherDiff),
        unit: 'sqf',
        reason: 'entry_edit',
        referenceId: logId,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    if (Math.abs(buckleDiff) > 0) {
      await mongoService.insertOne('stock_logs', {
        type: buckleDiff > 0 ? 'deduct' : 'add',
        material: 'buckle',
        materialType: newDeduction.buckleType,
        quantity: Math.abs(buckleDiff),
        unit: 'pieces',
        reason: 'entry_edit',
        referenceId: logId,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    if (Math.abs(footbedDiff) > 0) {
      await mongoService.insertOne('stock_logs', {
        type: footbedDiff > 0 ? 'deduct' : 'add',
        material: 'footbed',
        materialType: newDeduction.footbedType,
        quantity: Math.abs(footbedDiff),
        unit: 'pieces',
        reason: 'entry_edit',
        referenceId: logId,
        footbedGender: existingLog.footbedGender,
        footbedEuSize: existingLog.footbedEuSize,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    // Update production log
    await mongoService.updateOne('production_logs', { _id: logId }, {
      $set: {
        quantityPairs: newQuantity,
        leatherDeductedSqf: newDeduction.leatherDeducted,
        leatherType: newDeduction.leatherType,
        buckleDeducted: newDeduction.buckleDeducted,
        buckleType: newDeduction.buckleType,
        footbedDeducted: newDeduction.footbedDeducted,
        footbedType: newDeduction.footbedType,
        timestamp: new Date().toISOString(),
      },
    });

    return true;
  } catch (error) {
    throw error;
  }
}

export async function deleteProductionLog(
  logId: string,
  updatedBy: string,
  updatedByName: string
): Promise<boolean> {
  try {
    const log = await mongoService.findOne<ProductionLog>('production_logs', { _id: logId });
    if (!log) return false;

    // Check if same day
    const today = new Date().toISOString().split('T')[0];
    if (log.logDate !== today) {
      throw new Error('Can only delete same-day entries');
    }

    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) return false;

    // Return leather to stock category-wise
    if (log.leatherDeductedSqf > 0) {
      const existingLeathers = stock.leathers || [];
      const leatherIndex = existingLeathers.findIndex((l: any) => l.type === log.leatherType);
      if (leatherIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            leatherSqf: log.leatherDeductedSqf,
            [`leathers.${leatherIndex}.qty`]: log.leatherDeductedSqf
          },
          $set: { lastUpdated: new Date().toISOString() }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { leatherSqf: log.leatherDeductedSqf },
          $set: { lastUpdated: new Date().toISOString() }
        });
      }
    }

    // Return buckle to stock category-wise
    if (log.buckleDeducted > 0) {
      const existingBuckles = stock.buckles || [];
      const buckleIndex = existingBuckles.findIndex((b: any) => b.type === log.buckleType);
      if (buckleIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            buckleQty: log.buckleDeducted,
            [`buckles.${buckleIndex}.qty`]: log.buckleDeducted
          },
          $set: { lastUpdated: new Date().toISOString() }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { buckleQty: log.buckleDeducted },
          $set: { lastUpdated: new Date().toISOString() }
        });
      }
    }

    // Return footbed to specific gender+size entry
    const existingFootbeds = stock.footbeds || [];
    const footbedIndex = existingFootbeds.findIndex(
      (f: FootbedEntry) => f.gender === log.footbedGender && f.euSize === log.footbedEuSize && f.type === log.footbedType
    );

    if (footbedIndex >= 0) {
      await mongoService.updateOne('stock', { _id: stock._id }, {
        $inc: { [`footbeds.${footbedIndex}.qty`]: log.footbedDeducted },
        $set: { lastUpdated: new Date().toISOString() },
      });
    } else {
      // Create new entry if it doesn't exist
      await mongoService.updateOne('stock', { _id: stock._id }, {
        $push: {
          footbeds: {
            gender: log.footbedGender,
            euSize: log.footbedEuSize,
            type: log.footbedType,
            qty: log.footbedDeducted,
          },
        },
        $set: { lastUpdated: new Date().toISOString() },
      });
    }

    // Log stock changes
    if (log.leatherDeductedSqf > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'add',
        material: 'leather',
        materialType: log.leatherType,
        quantity: log.leatherDeductedSqf,
        unit: 'sqf',
        reason: 'entry_delete',
        referenceId: logId,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    if (log.buckleDeducted > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'add',
        material: 'buckle',
        materialType: log.buckleType,
        quantity: log.buckleDeducted,
        unit: 'pieces',
        reason: 'entry_delete',
        referenceId: logId,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    if (log.footbedDeducted > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'add',
        material: 'footbed',
        materialType: log.footbedType,
        quantity: log.footbedDeducted,
        unit: 'pieces',
        reason: 'entry_delete',
        referenceId: logId,
        footbedGender: log.footbedGender,
        footbedEuSize: log.footbedEuSize,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    // Delete production log
    await mongoService.deleteOne('production_logs', { _id: logId });
    return true;
  } catch (error) {
    throw error;
  }
}

export async function getDailyStats(date?: string): Promise<{
  totalPairs: number;
  totalLeather: number;
  logCount: number;
}> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const logs = await getProductionLogs({ logDate: targetDate });

  return logs.reduce(
    (acc, log) => ({
      totalPairs: acc.totalPairs + log.quantityPairs,
      totalLeather: acc.totalLeather + log.leatherDeductedSqf,
      logCount: logs.length,
    }),
    { totalPairs: 0, totalLeather: 0, logCount: logs.length }
  );
}