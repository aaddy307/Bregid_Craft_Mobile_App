import { mongoService } from './mongodb';

export interface Notification {
  _id: string;
  type: 'low_stock' | 'target_reached';
  material?: 'leather' | 'buckle' | 'footbed';
  workerId?: string;
  workerName?: string;
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  createdBy?: string;
}

// Mock functions for Expo Go compatibility
// In production builds, these would use actual expo-notifications
async function requestPushPermissions(): Promise<boolean> {
  return false;
}

export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

export async function initializeNotifications(): Promise<boolean> {
  try {
    await requestPushPermissions();
    const token = await getExpoPushToken();
    return !!token;
  } catch {
    return false;
  }
}

export async function createLowStockNotification(
  material: 'leather' | 'buckle' | 'footbed',
  currentQty: number,
  threshold: number
): Promise<void> {
  const materialNames = { leather: 'Leather', buckle: 'Buckles', footbed: 'Footbeds' };
  const message = `${materialNames[material]} stock is low: ${currentQty.toFixed(2)} remaining (threshold: ${threshold})`;

  try {
    await mongoService.insertOne('notifications', {
      type: 'low_stock',
      material,
      title: 'Low Stock Alert',
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    });
  } catch {
    // Silently handle notification errors
  }
}

export async function createTargetReachedNotification(
  workerId: string,
  workerName: string,
  target: number,
  actual: number
): Promise<void> {
  const message = `${workerName} reached their daily target: ${actual} pairs (target: ${target})`;

  try {
    await mongoService.insertOne('notifications', {
      type: 'target_reached',
      workerId,
      workerName,
      title: 'Target Reached!',
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    });
  } catch {
    // Silently handle notification errors
  }
}

export async function getNotifications(limit = 50): Promise<Notification[]> {
  try {
    return await mongoService.findMany<Notification>('notifications', {}, {
      sort: { createdAt: -1 },
      limit,
    });
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    await mongoService.updateOne('notifications', { _id: notificationId }, {
      $set: { isRead: true },
    });
    return true;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    await mongoService.updateOne('notifications', { isRead: false }, {
      $set: { isRead: true },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    return await mongoService.countDocuments('notifications', { isRead: false });
  } catch {
    return 0;
  }
}