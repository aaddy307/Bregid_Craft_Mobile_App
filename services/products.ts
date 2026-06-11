import { mongoService } from './mongodb';
import { useProductStore, Product } from '../store/productStore';

const MEN_SIZES = [40, 41, 42, 43, 44];
const WOMEN_SIZES = [36, 37, 38, 39, 40, 41];

const SEED_PRODUCTS = [
  { sku: 'BRMCLNUBLK001', name: 'Classic Black Nubuk', gender: 'Men' as const },
  { sku: 'BRMCLNUBLU002', name: 'Classic Blue Nubuck', gender: 'Men' as const },
  { sku: 'BRMCLOLBRW003', name: 'Classic Brown Oil', gender: 'Men' as const },
  { sku: 'BRMLGNUBLK004', name: 'Lagom Black Nubuck', gender: 'Men' as const },
  { sku: 'BRMLGNUTAN005', name: 'Lagom Tan Nubuck', gender: 'Men' as const },
  { sku: 'BRMLGBRGRY006', name: 'Lagom Grey', gender: 'Men' as const },
  { sku: 'BRMCLSMBLK024', name: 'Classic Black Smooth', gender: 'Men' as const },
  { sku: 'BRMCLCHBRW025', name: 'Classic Choco Brown', gender: 'Men' as const },
  { sku: 'BRMCLGRTAN026', name: 'Classic Tan Grain', gender: 'Men' as const },
  { sku: 'BRWCLNUBLK007', name: 'Classic Black Nubuck', gender: 'Women' as const },
  { sku: 'BRWCLNUBLU008', name: 'Classic Blue Nubuck', gender: 'Women' as const },
  { sku: 'BRWCLOLBRW009', name: 'Classic Brown Oil', gender: 'Women' as const },
  { sku: 'BRWCLMTROG010', name: 'Classic Rose Gold Metallic', gender: 'Women' as const },
  { sku: 'BRWCLMTSLV011', name: 'Classic Silver Metallic', gender: 'Women' as const },
  { sku: 'BRWCLMTCRE012', name: 'Classic Cream Metallic', gender: 'Women' as const },
  { sku: 'BRWLGNUBLK013', name: 'Lagom Black Nubuck', gender: 'Women' as const },
  { sku: 'BRWLGNUTAN014', name: 'Lagom Tan Suede', gender: 'Women' as const },
  { sku: 'BRWLGMTROG015', name: 'Lagom Rose Gold Metallic', gender: 'Women' as const },
  { sku: 'BRWLGMTSLV016', name: 'Lagom Silver Metallic', gender: 'Women' as const },
  { sku: 'BRWLGMTCRE017', name: 'Lagom Cream Metallic', gender: 'Women' as const },
  { sku: 'BRWGGNUBLK018', name: 'Gigil Black Nubuck', gender: 'Women' as const },
  { sku: 'BRWGGSDTAN019', name: 'Gigil Tan Suede', gender: 'Women' as const },
  { sku: 'BRWGGMTROG020', name: 'Gigil Rose Gold Metallic', gender: 'Women' as const },
  { sku: 'BRWGGMTSLV021', name: 'Gigil Silver Metallic', gender: 'Women' as const },
  { sku: 'BRWGGMTCRE022', name: 'Gigil Cream Metallic', gender: 'Women' as const },
  { sku: 'BRWGGNDBLK023', name: 'Gigil Black NDM', gender: 'Women' as const },
  { sku: 'BRWCLHRLEO027', name: 'Classic Leopard Hairon', gender: 'Women' as const },
];

export async function getProducts(): Promise<Product[]> {
  try {
    const products = await mongoService.findMany<Product>('products', { isActive: true });
    useProductStore.getState().setProducts(products);
    return products;
  } catch {
    useProductStore.getState().setError('Failed to fetch products');
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    return await mongoService.findOne<Product>('products', { _id: id });
  } catch {
    return null;
  }
}

export async function createProduct(
  data: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>
): Promise<Product | null> {
  try {
    const now = new Date().toISOString();
    const product = await mongoService.insertOne<Product>('products', {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    await getProducts();
    return product;
  } catch {
    return null;
  }
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, '_id' | 'createdAt'>>
): Promise<boolean> {
  try {
    await mongoService.updateOne('products', { _id: id }, {
      $set: {
        ...data,
        updatedAt: new Date().toISOString(),
      },
    });
    await getProducts();
    return true;
  } catch {
    return false;
  }
}

export async function deactivateProduct(id: string): Promise<boolean> {
  return updateProduct(id, { isActive: false });
}

export async function deleteProduct(id: string): Promise<boolean> {
  return updateProduct(id, { isActive: false });
}

export async function seedProducts(): Promise<boolean> {
  try {
    const existingCount = await mongoService.countDocuments('products', {});
    if (existingCount > 0) return true;

    const now = new Date().toISOString();
    const productsToInsert = SEED_PRODUCTS.map((p) => ({
      name: p.name,
      sku: p.sku,
      gender: p.gender,
      sizes: p.gender === 'Men' ? MEN_SIZES : WOMEN_SIZES,
      leatherSqfPerPair: 0,
      bucklePerPair: 0,
      footbedPerPair: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    for (const product of productsToInsert) {
      await mongoService.insertOne('products', product);
    }

    await getProducts();
    return true;
  } catch {
    return false;
  }
}