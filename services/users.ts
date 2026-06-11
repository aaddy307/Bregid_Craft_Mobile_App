import { mongoService } from './mongodb';
import { useAuthStore, User } from '../store/authStore';
import { hashAndSetPassword } from './auth';

interface CreateUserInput {
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'manager' | 'worker';
  dailyTarget?: number;
  password: string;
}

export async function getUsers(): Promise<User[]> {
  try {
    // Fetch ALL users (active + inactive) so managers can reactivate deactivated accounts
    return await mongoService.findMany<User>('users', {}, {
      sort: { name: 1 },
    });
  } catch {
    return [];
  }
}

export async function getWorkers(): Promise<User[]> {
  try {
    return await mongoService.findMany<User>('users', { role: 'worker', isActive: true }, {
      sort: { name: 1 },
    });
  } catch {
    return [];
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    return await mongoService.findOne<User>('users', { _id: id });
  } catch {
    return null;
  }
}

export async function createUser(
  input: CreateUserInput,
  createdBy: string
): Promise<User | null> {
  try {
    const now = new Date().toISOString();
    const user = await mongoService.insertOne<User>('users', {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      role: input.role,
      dailyTarget: input.role === 'worker' ? input.dailyTarget || 0 : 0,
      isActive: true,
      createdAt: now,
      createdBy,
    });

    // Hash and store the password so the new user can actually log in
    if (user && user._id) {
      await hashAndSetPassword(user._id, input.password);
    }

    return user;
  } catch {
    return null;
  }
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, '_id' | 'createdAt' | 'createdBy'>>
): Promise<boolean> {
  try {
    await mongoService.updateOne('users', { _id: id }, { $set: data });

    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser._id === id) {
      useAuthStore.getState().setUser({ ...currentUser, ...data });
    }

    return true;
  } catch {
    return false;
  }
}

export { type User } from '../store/authStore';

export async function deactivateUser(id: string): Promise<boolean> {
  return updateUser(id, { isActive: false });
}

export async function activateUser(id: string): Promise<boolean> {
  return updateUser(id, { isActive: true });
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const result = await mongoService.deleteOne('users', { _id: id });
    await mongoService.deleteOne('sessions', { userId: id });
    return result.deletedCount > 0;
  } catch {
    return false;
  }
}

export async function resetUserPassword(id: string, newPassword: string): Promise<boolean> {
  try {
    const user = await getUserById(id);
    if (!user) return false;
    return await hashAndSetPassword(id, newPassword);
  } catch {
    return false;
  }
}

export async function setWorkerTarget(workerId: string, target: number): Promise<boolean> {
  return updateUser(workerId, { dailyTarget: target });
}

export async function updateWorkerTargets(
  targets: { workerId: string; target: number }[]
): Promise<boolean> {
  try {
    for (const { workerId, target } of targets) {
      await updateUser(workerId, { dailyTarget: target });
    }
    return true;
  } catch {
    return false;
  }
}