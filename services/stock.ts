import { mongoService } from './mongodb';
import { Stock, useStockStore, FootbedEntry } from '../store/stockStore';
import { MATERIALS, REASONS } from '../constants';

type Material = 'leather' | 'buckle' | 'footbed';
type Reason = 'worker_entry' | 'manual_add' | 'entry_edit' | 'entry_delete';

interface StockDeduction {
  leatherDeducted: number;
  leatherType: string;
  buckleDeducted: number;
  buckleType: string;
  footbedDeducted: number;
  footbedType: string;
  footbedGender: 'Men' | 'Women';
  footbedEuSize: number;
}

export async function getStock(): Promise<Stock | null> {
  try {
    const stockData = await mongoService.findOne<Stock>('stock', {});
    // Only update store if data actually changed to prevent unnecessary re-renders
    const currentStock = useStockStore.getState().stock;
    if (JSON.stringify(stockData) !== JSON.stringify(currentStock)) {
      useStockStore.getState().setStock(stockData);
    }
    return stockData;
  } catch {
    return null;
  }
}

interface SupplierDetails {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierContact?: string;
}

interface AddStockParams {
  material: Material;
  materialType?: string;
  footbedGender?: 'Men' | 'Women';
  footbedEuSize?: number;
}

export async function addStock(
  quantity: number,
  updatedBy: string,
  updatedByName: string,
  params: AddStockParams,
  supplierDetails?: SupplierDetails,
  reason: Reason = 'manual_add'
): Promise<boolean> {
  try {
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) return false;

    const { material, materialType, footbedGender, footbedEuSize } = params;

    // Build the base update
    const updateOps: Record<string, unknown> = {
      $set: { lastUpdated: new Date().toISOString() },
      $inc: {} as Record<string, number>,
    };

    switch (material) {
      case 'leather': {
        const existingLeathers = stock.leathers || [];
        const leatherIndex = existingLeathers.findIndex((l: any) => l.type === (materialType || 'Nubuck'));
        if (leatherIndex >= 0) {
          await mongoService.updateOne('stock', { _id: stock._id }, {
            $inc: {
              leatherSqf: quantity,
              [`leathers.${leatherIndex}.qty`]: quantity
            },
            $set: { leatherType: materialType || 'Nubuck', lastUpdated: new Date().toISOString() }
          });
        } else {
          await mongoService.updateOne('stock', { _id: stock._id }, {
            $inc: { leatherSqf: quantity },
            $push: {
              leathers: { type: materialType || 'Nubuck', qty: quantity }
            },
            $set: { leatherType: materialType || 'Nubuck', lastUpdated: new Date().toISOString() }
          });
        }
        break;
      }
      case 'buckle': {
        const existingBuckles = stock.buckles || [];
        const buckleIndex = existingBuckles.findIndex((b: any) => b.type === (materialType || 'Brass Buckle'));
        if (buckleIndex >= 0) {
          await mongoService.updateOne('stock', { _id: stock._id }, {
            $inc: {
              buckleQty: quantity,
              [`buckles.${buckleIndex}.qty`]: quantity
            },
            $set: { buckleType: materialType || 'Brass Buckle', lastUpdated: new Date().toISOString() }
          });
        } else {
          await mongoService.updateOne('stock', { _id: stock._id }, {
            $inc: { buckleQty: quantity },
            $push: {
              buckles: { type: materialType || 'Brass Buckle', qty: quantity }
            },
            $set: { buckleType: materialType || 'Brass Buckle', lastUpdated: new Date().toISOString() }
          });
        }
        break;
      }
      case 'footbed': {
        // Footbed uses array - find or create entry
        const existingFootbeds = stock.footbeds || [];
        const existingIndex = existingFootbeds.findIndex(
          (f: FootbedEntry) => f.gender === footbedGender && f.euSize === footbedEuSize && f.type === (materialType || 'Standard Footbed')
        );

        if (existingIndex >= 0) {
          // Update existing entry's quantity
          await mongoService.updateOne(
            'stock',
            { _id: stock._id },
            {
              $inc: { [`footbeds.${existingIndex}.qty`]: quantity },
              $set: { lastUpdated: new Date().toISOString() },
            }
          );
        } else {
          // Push new footbed entry
          await mongoService.updateOne('stock', { _id: stock._id }, {
            $push: {
              footbeds: {
                gender: footbedGender,
                euSize: footbedEuSize,
                type: materialType || 'Standard Footbed',
                qty: quantity,
              },
            },
            $set: { lastUpdated: new Date().toISOString() },
          });
        }
        break;
      }
    }

    // Build stock log
    const stockLogData: Record<string, unknown> = {
      type: 'add',
      material,
      materialType: materialType || null,
      quantity,
      unit: material === 'leather' ? 'sqf' : 'pieces',
      reason: 'manual_add',
      updatedBy,
      updatedByName,
      timestamp: new Date().toISOString(),
    };

    if (material === 'footbed') {
      stockLogData.footbedGender = footbedGender;
      stockLogData.footbedEuSize = footbedEuSize;
    }

    if (supplierDetails) {
      stockLogData.supplierName = supplierDetails.supplierName;
      stockLogData.invoiceNumber = supplierDetails.invoiceNumber.toUpperCase();
      stockLogData.invoiceDate = supplierDetails.invoiceDate;
      stockLogData.supplierContact = supplierDetails.supplierContact || null;
    }

    await mongoService.insertOne('stock_logs', stockLogData);

    // Refresh stock data
    await getStock();

    return true;
  } catch {
    return false;
  }
}

export async function deductFootbed(
  deduction: { qty: number; gender: 'Men' | 'Women'; euSize: number; type: string },
  referenceId: string,
  updatedBy: string,
  updatedByName: string,
  reason: Reason = 'worker_entry'
): Promise<boolean> {
  try {
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) return false;

    const existingFootbeds = stock.footbeds || [];
    const footbedIndex = existingFootbeds.findIndex(
      (f: FootbedEntry) => f.gender === deduction.gender && f.euSize === deduction.euSize && f.type === deduction.type
    );

    if (footbedIndex < 0) {
      throw new Error(`No footbed stock found for ${deduction.gender} EU ${deduction.euSize}`);
    }

    const currentQty = existingFootbeds[footbedIndex].qty;
    if (currentQty < deduction.qty) {
      throw new Error(`Not enough footbed stock for ${deduction.gender} EU ${deduction.euSize}`);
    }

    await mongoService.updateOne(
      'stock',
      { _id: stock._id },
      {
        $inc: { [`footbeds.${footbedIndex}.qty`]: -deduction.qty },
        $set: { lastUpdated: new Date().toISOString() },
      }
    );

    // Log the deduction
    await mongoService.insertOne('stock_logs', {
      type: 'deduct',
      material: 'footbed',
      materialType: existingFootbeds[footbedIndex].type,
      quantity: deduction.qty,
      unit: 'pieces',
      reason,
      referenceId,
      footbedGender: deduction.gender,
      footbedEuSize: deduction.euSize,
      updatedBy,
      updatedByName,
      timestamp: new Date().toISOString(),
    });

    // Refresh stock data
    await getStock();

    return true;
  } catch (error) {
    throw error;
  }
}

export async function returnFootbed(
  deduction: { qty: number; gender: 'Men' | 'Women'; euSize: number; type: string },
  referenceId: string,
  updatedBy: string,
  updatedByName: string,
  reason: Reason = 'entry_delete'
): Promise<boolean> {
  try {
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) return false;

    const existingFootbeds = stock.footbeds || [];
    const footbedIndex = existingFootbeds.findIndex(
      (f: FootbedEntry) => f.gender === deduction.gender && f.euSize === deduction.euSize && f.type === deduction.type
    );

    if (footbedIndex >= 0) {
      await mongoService.updateOne(
        'stock',
        { _id: stock._id },
        {
          $inc: { [`footbeds.${footbedIndex}.qty`]: deduction.qty },
          $set: { lastUpdated: new Date().toISOString() },
        }
      );
    } else {
      // Create new entry if it doesn't exist
      await mongoService.updateOne('stock', { _id: stock._id }, {
        $push: {
          footbeds: {
            gender: deduction.gender,
            euSize: deduction.euSize,
            type: deduction.type,
            qty: deduction.qty,
          },
        },
        $set: { lastUpdated: new Date().toISOString() },
      });
    }

    // Log the return
    await mongoService.insertOne('stock_logs', {
      type: 'add',
      material: 'footbed',
      materialType: existingFootbeds[footbedIndex]?.type || 'Standard Footbed',
      quantity: deduction.qty,
      unit: 'pieces',
      reason,
      referenceId,
      footbedGender: deduction.gender,
      footbedEuSize: deduction.euSize,
      updatedBy,
      updatedByName,
      timestamp: new Date().toISOString(),
    });

    // Refresh stock data
    await getStock();

    return true;
  } catch (error) {
    throw error;
  }
}

export async function deductStock(
  deduction: StockDeduction,
  referenceId: string,
  updatedBy: string,
  updatedByName: string,
  reason: Reason = 'worker_entry'
): Promise<boolean> {
  try {
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) return false;

    // Validate leather
    if (stock.leatherSqf < deduction.leatherDeducted) {
      throw new Error('Insufficient leather stock');
    }

    // Validate buckle
    if (stock.buckleQty < deduction.buckleDeducted) {
      throw new Error('Insufficient buckle stock');
    }

    // Update leather category-wise
    if (deduction.leatherDeducted > 0) {
      const existingLeathers = stock.leathers || [];
      const leatherIndex = existingLeathers.findIndex((l: any) => l.type === deduction.leatherType);
      if (leatherIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            leatherSqf: -deduction.leatherDeducted,
            [`leathers.${leatherIndex}.qty`]: -deduction.leatherDeducted
          },
          $set: { lastUpdated: new Date().toISOString() }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { leatherSqf: -deduction.leatherDeducted },
          $set: { lastUpdated: new Date().toISOString() }
        });
      }
    }

    // Update buckle category-wise
    if (deduction.buckleDeducted > 0) {
      const existingBuckles = stock.buckles || [];
      const buckleIndex = existingBuckles.findIndex((b: any) => b.type === deduction.buckleType);
      if (buckleIndex >= 0) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: {
            buckleQty: -deduction.buckleDeducted,
            [`buckles.${buckleIndex}.qty`]: -deduction.buckleDeducted
          },
          $set: { lastUpdated: new Date().toISOString() }
        });
      } else {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $inc: { buckleQty: -deduction.buckleDeducted },
          $set: { lastUpdated: new Date().toISOString() }
        });
      }
    }

    // Log leather deduction
    if (deduction.leatherDeducted > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'deduct',
        material: 'leather',
        materialType: deduction.leatherType,
        quantity: deduction.leatherDeducted,
        unit: 'sqf',
        reason,
        referenceId,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    // Log buckle deduction
    if (deduction.buckleDeducted > 0) {
      await mongoService.insertOne('stock_logs', {
        type: 'deduct',
        material: 'buckle',
        materialType: deduction.buckleType,
        quantity: deduction.buckleDeducted,
        unit: 'pieces',
        reason,
        referenceId,
        updatedBy,
        updatedByName,
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  } catch (error) {
    throw error;
  }
}

export async function updateThresholds(
  thresholds: { leatherSqf: number; buckleQty: number; footbedQty: number }
): Promise<boolean> {
  try {
    const stock = await mongoService.findOne<Stock>('stock', {});
    if (!stock) return false;

    await mongoService.updateOne('stock', { _id: stock._id }, {
      $set: {
        thresholds,
        lastUpdated: new Date().toISOString(),
      },
    });

    return true;
  } catch {
    return false;
  }
}

export async function getStockLogs(limit = 50): Promise<unknown[]> {
  try {
    return await mongoService.findMany('stock_logs', {}, { sort: { timestamp: -1 }, limit });
  } catch {
    return [];
  }
}

export async function initializeStock(): Promise<boolean> {
  try {
    const existingStock = await mongoService.findOne<Stock>('stock', {});
    if (existingStock) return true;

    await mongoService.insertOne('stock', {
      leatherSqf: 0,
      leatherType: 'Nubuck',
      buckleQty: 0,
      buckleType: 'Brass Buckle',
      footbeds: [],
      thresholds: {
        leatherSqf: 100,
        buckleQty: 50,
        footbedQty: 50,
      },
      lastUpdated: new Date().toISOString(),
    });

    return true;
  } catch {
    return false;
  }
}

// ─── Material Categories ────────────────────────────────────────────────────

export interface MaterialCategory {
  _id: string;
  type: 'leather' | 'buckle' | 'footbed';
  name: string;
  size?: number;
  gender?: 'Men' | 'Women';
  color?: string;
  createdAt: string;
}

export async function getMaterialCategories(
  type?: 'leather' | 'buckle' | 'footbed'
): Promise<MaterialCategory[]> {
  try {
    const filter = type ? { type } : {};
    return await mongoService.findMany<MaterialCategory>('material_categories', filter, {
      sort: { type: 1, name: 1 },
    });
  } catch {
    return [];
  }
}

export async function addMaterialCategory(
  type: 'leather' | 'buckle' | 'footbed',
  name: string,
  size?: number,
  gender?: 'Men' | 'Women',
  color?: string
): Promise<boolean> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return false;
    
    // Prevent duplicates based on name, size, gender, and color
    const query: Record<string, any> = { type, name: trimmed };
    if (size !== undefined) query.size = size;
    if (gender !== undefined) query.gender = gender;
    if (color !== undefined) query.color = color.trim();
    
    const existing = await mongoService.findOne('material_categories', query);
    if (existing) return false;
    
    await mongoService.insertOne('material_categories', {
      type,
      name: trimmed,
      size,
      gender,
      color: color?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateMaterialCategory(
  id: string,
  name: string,
  color?: string
): Promise<boolean> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return false;
    
    // 1. Get the existing category before updating
    const oldCategory = await mongoService.findOne<MaterialCategory>('material_categories', { _id: id });
    if (!oldCategory) return false;

    // 2. Prevent duplicates based on name, size, gender, and color
    const query: Record<string, any> = {
      _id: { $ne: id },
      type: oldCategory.type,
      name: trimmed,
    };
    if (oldCategory.size !== undefined) query.size = oldCategory.size;
    if (oldCategory.gender !== undefined) query.gender = oldCategory.gender;
    if (color !== undefined) {
      query.color = color.trim() || undefined;
    } else if (oldCategory.color !== undefined) {
      query.color = oldCategory.color;
    }

    const existing = await mongoService.findOne('material_categories', query);
    if (existing) return false;

    // 3. Perform the category update
    const updateFields: Record<string, any> = { name: trimmed };
    if (color !== undefined) {
      updateFields.color = color.trim() || undefined;
    }
    
    const result = await mongoService.updateOne(
      'material_categories',
      { _id: id },
      { $set: updateFields }
    );
    
    if (result.modifiedCount === 0) {
      return true;
    }

    // 4. Cascade changes to products and stock
    const newName = trimmed;
    const newColor = color !== undefined ? color.trim() : oldCategory.color;

    if (oldCategory.type === 'leather') {
      // Products: update leatherType
      const affectedProducts = await mongoService.findMany<any>('products', { leatherType: oldCategory.name });
      for (const p of affectedProducts) {
        await mongoService.updateOne('products', { _id: p._id }, { $set: { leatherType: newName } });
      }

      // Stock: update leathers array and leatherType
      const stock = await mongoService.findOne<Stock>('stock', {});
      if (stock) {
        const stockUpdate: Record<string, any> = {};
        if (stock.leatherType === oldCategory.name) {
          stockUpdate.leatherType = newName;
        }
        const existingLeathers = stock.leathers || [];
        const index = existingLeathers.findIndex(l => l.type === oldCategory.name);
        if (index >= 0) {
          stockUpdate[`leathers.${index}.type`] = newName;
        }
        if (Object.keys(stockUpdate).length > 0) {
          await mongoService.updateOne('stock', { _id: stock._id }, { $set: stockUpdate });
        }
      }
    } else if (oldCategory.type === 'buckle') {
      const oldPrefix = oldCategory.color ? `${oldCategory.name} (${oldCategory.color})` : oldCategory.name;
      const newPrefix = newColor ? `${newName} (${newColor})` : newName;

      if (oldPrefix !== newPrefix) {
        // Products: update buckleType if starts with oldPrefix
        const affectedProducts = await mongoService.findMany<any>('products', {});
        for (const p of affectedProducts) {
          if (p.buckleType && p.buckleType.startsWith(`${oldPrefix} - `)) {
            const sizePart = p.buckleType.substring(oldPrefix.length);
            await mongoService.updateOne('products', { _id: p._id }, { $set: { buckleType: `${newPrefix}${sizePart}` } });
          }
        }

        // Stock: update buckles array and buckleType
        const stock = await mongoService.findOne<Stock>('stock', {});
        if (stock) {
          const stockUpdate: Record<string, any> = {};
          if (stock.buckleType && stock.buckleType.startsWith(`${oldPrefix} - `)) {
            const sizePart = stock.buckleType.substring(oldPrefix.length);
            stockUpdate.buckleType = `${newPrefix}${sizePart}`;
          }
          const existingBuckles = stock.buckles || [];
          existingBuckles.forEach((b, idx) => {
            if (b.type && b.type.startsWith(`${oldPrefix} - `)) {
              const sizePart = b.type.substring(oldPrefix.length);
              stockUpdate[`buckles.${idx}.type`] = `${newPrefix}${sizePart}`;
            }
          });
          if (Object.keys(stockUpdate).length > 0) {
            await mongoService.updateOne('stock', { _id: stock._id }, { $set: stockUpdate });
          }
        }
      }
    } else if (oldCategory.type === 'footbed') {
      // Products: update footbedType if matches
      const affectedProducts = await mongoService.findMany<any>('products', { footbedType: oldCategory.name });
      for (const p of affectedProducts) {
        await mongoService.updateOne('products', { _id: p._id }, { $set: { footbedType: newName } });
      }

      // Stock: update footbeds array
      const stock = await mongoService.findOne<Stock>('stock', {});
      if (stock) {
        const stockUpdate: Record<string, any> = {};
        const existingFootbeds = stock.footbeds || [];
        existingFootbeds.forEach((f, idx) => {
          if (
            f.type === oldCategory.name &&
            f.gender === oldCategory.gender &&
            f.euSize === oldCategory.size
          ) {
            stockUpdate[`footbeds.${idx}.type`] = newName;
          }
        });
        if (Object.keys(stockUpdate).length > 0) {
          await mongoService.updateOne('stock', { _id: stock._id }, { $set: stockUpdate });
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function deleteMaterialCategory(id: string): Promise<boolean> {
  try {
    // 1. Get the existing category before deleting
    const oldCategory = await mongoService.findOne<MaterialCategory>('material_categories', { _id: id });
    if (!oldCategory) return false;

    // 2. Perform the category deletion
    const result = await mongoService.deleteOne('material_categories', { _id: id });
    if (result.deletedCount === 0) return false;

    // 3. Cascade changes to products and stock
    if (oldCategory.type === 'leather') {
      // Products: reset leatherType to empty
      const affectedProducts = await mongoService.findMany<any>('products', { leatherType: oldCategory.name });
      for (const p of affectedProducts) {
        await mongoService.updateOne('products', { _id: p._id }, { $set: { leatherType: '' } });
      }

      // Stock: remove from leathers array and decrement leatherSqf
      const stock = await mongoService.findOne<Stock>('stock', {});
      if (stock) {
        const existingLeathers = stock.leathers || [];
        const leatherEntry = existingLeathers.find(l => l.type === oldCategory.name);
        if (leatherEntry) {
          const updateOps: Record<string, any> = {
            $inc: { leatherSqf: -leatherEntry.qty },
            $pull: { leathers: { type: oldCategory.name } }
          };
          if (stock.leatherType === oldCategory.name) {
            updateOps.$set = { leatherType: '' };
          }
          await mongoService.updateOne('stock', { _id: stock._id }, updateOps);
        }
      }
    } else if (oldCategory.type === 'buckle') {
      const oldPrefix = oldCategory.color ? `${oldCategory.name} (${oldCategory.color})` : oldCategory.name;

      // Products: reset buckleType if starts with oldPrefix
      const affectedProducts = await mongoService.findMany<any>('products', {});
      for (const p of affectedProducts) {
        if (p.buckleType && p.buckleType.startsWith(`${oldPrefix} - `)) {
          await mongoService.updateOne('products', { _id: p._id }, { $set: { buckleType: '' } });
        }
      }

      // Stock: remove from buckles array and decrement buckleQty
      const stock = await mongoService.findOne<Stock>('stock', {});
      if (stock) {
        const existingBuckles = stock.buckles || [];
        const bucklesToPull = existingBuckles.filter(b => b.type && b.type.startsWith(`${oldPrefix} - `));
        const qtyDeducted = bucklesToPull.reduce((sum, b) => sum + b.qty, 0);

        if (bucklesToPull.length > 0) {
          const updateOps: Record<string, any> = {
            $inc: { buckleQty: -qtyDeducted },
            $pull: { buckles: { type: { $in: bucklesToPull.map(b => b.type) } } }
          };
          if (stock.buckleType && stock.buckleType.startsWith(`${oldPrefix} - `)) {
            updateOps.$set = { buckleType: '' };
          }
          await mongoService.updateOne('stock', { _id: stock._id }, updateOps);
        }
      }
    } else if (oldCategory.type === 'footbed') {
      // Products: clear footbedType only if no other footbed category shares this name
      const otherCats = await mongoService.findOne('material_categories', {
        type: 'footbed',
        name: oldCategory.name,
        _id: { $ne: oldCategory._id }
      });
      if (!otherCats) {
        const affectedProducts = await mongoService.findMany<any>('products', { footbedType: oldCategory.name });
        for (const p of affectedProducts) {
          await mongoService.updateOne('products', { _id: p._id }, { $set: { footbedType: '' } });
        }
      }

      // Stock: remove from footbeds array
      const stock = await mongoService.findOne<Stock>('stock', {});
      if (stock) {
        await mongoService.updateOne('stock', { _id: stock._id }, {
          $pull: {
            footbeds: {
              type: oldCategory.name,
              gender: oldCategory.gender,
              euSize: oldCategory.size
            }
          }
        });
      }
    }

    return true;
  } catch {
    return false;
  }
}