import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface MongoDocument {
  _id?: string;
  [key: string]: unknown;
}

class MongoService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  clearAccessToken() {
    this.accessToken = null;
  }

  private async request(action: string, collection: string, data: {
    filter?: Record<string, unknown>;
    document?: any;
    update?: Record<string, unknown>;
    options?: { sort?: Record<string, 1 | -1>; limit?: number; projection?: Record<string, 1 | 0> };
  }): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/mongodb`, {
        collection,
        action,
        ...data,
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
        },
        timeout: 15000,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async findOne<T = MongoDocument>(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<T | null> {
    const result = await this.request('findOne', collection, { filter });
    return result.document || null;
  }

  async findMany<T = MongoDocument>(
    collection: string,
    filter: Record<string, unknown> = {},
    options?: { sort?: Record<string, 1 | -1>; limit?: number; projection?: Record<string, 1 | 0> }
  ): Promise<T[]> {
    const result = await this.request('find', collection, { filter, options });
    return result.documents || [];
  }

  async insertOne<T = MongoDocument>(
    collection: string,
    document: Record<string, unknown>
  ): Promise<T> {
    const result = await this.request('insertOne', collection, { document });
    return result.document as T;
  }

  async updateOne(
    collection: string,
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await this.request('updateOne', collection, { filter, update });
    return {
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
    };
  }

  async deleteOne(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<{ deletedCount: number }> {
    const result = await this.request('deleteOne', collection, { filter });
    return { deletedCount: result.deletedCount || 0 };
  }

  async aggregate<T = MongoDocument>(
    collection: string,
    pipeline: any[]
  ): Promise<T[]> {
    const result = await this.request('aggregate', collection, { document: pipeline });
    return result.documents || [];
  }

  async countDocuments(
    collection: string,
    filter: Record<string, unknown> = {}
  ): Promise<number> {
    const result = await this.request('countDocuments', collection, { filter });
    return result.count || 0;
  }
}

export const mongoService = new MongoService();
export default mongoService;