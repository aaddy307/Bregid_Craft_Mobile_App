import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { mongoService } from './mongodb';
import { useAuthStore, User } from '../store/authStore';

const AUTH_TOKEN_KEY = 'bregid_auth_token';
const isWeb = Platform.OS === 'web';

async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(key);
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(key);
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently ignore delete errors
    }
  }
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const combined = password + salt;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
  return hash;
}

function generateSalt(): string {
  return Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 34) + Math.random().toString(36).substring(2, 34);
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const { email, password } = credentials;

  const userDoc = await mongoService.findOne<User>('users', {
    email: email.toLowerCase(),
    isActive: true,
  });

  if (!userDoc) {
    throw new Error('Invalid email or password');
  }

  if (!userDoc.passwordHash) {
    throw new Error('Account not set up properly. Please contact admin.');
  }

  const hash = await hashPassword(password, userDoc.passwordSalt || '');
  if (hash !== userDoc.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken();
  const now = new Date().toISOString();

  await mongoService.deleteOne('sessions', { userId: userDoc._id });
  await mongoService.insertOne('sessions', {
    userId: userDoc._id,
    token,
    isActive: true,
    createdAt: now,
    lastActiveAt: now,
  });

  await setSecureItem(AUTH_TOKEN_KEY, token);
  useAuthStore.getState().setUser(userDoc);
  useAuthStore.getState().setToken(token);

  return { user: userDoc, token };
}

export async function logout(): Promise<void> {
  try {
    const token = await getSecureItem(AUTH_TOKEN_KEY);
    if (token) {
      await mongoService.deleteOne('sessions', { token });
    }
  } catch {
    // Silently handle logout errors
  }

  useAuthStore.getState().logout();
  mongoService.clearAccessToken();
  await deleteSecureItem(AUTH_TOKEN_KEY);
}

export async function restoreSession(): Promise<User | null> {
  try {
    const token = await getSecureItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    const session = await mongoService.findOne('sessions', { token, isActive: true });
    if (!session) {
      await deleteSecureItem(AUTH_TOKEN_KEY);
      return null;
    }

    await mongoService.updateOne('sessions', { token }, {
      $set: { lastActiveAt: new Date().toISOString() },
    });

    const user = await mongoService.findOne<User>('users', {
      _id: session.userId,
      isActive: true,
    });

    if (user) {
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setToken(token);
      mongoService.setAccessToken(token);
      return user;
    }

    await deleteSecureItem(AUTH_TOKEN_KEY);
    return null;
  } catch {
    await deleteSecureItem(AUTH_TOKEN_KEY);
    return null;
  }
}

export async function updateExpoPushToken(token: string): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;

  await mongoService.updateOne('users', { _id: user._id }, {
    $set: { expoPushToken: token },
  });

  useAuthStore.getState().setUser({ ...user, expoPushToken: token });
}

export async function hashAndSetPassword(userId: string, password: string): Promise<boolean> {
  try {
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    await mongoService.updateOne('users', { _id: userId }, {
      $set: { passwordHash: hash, passwordSalt: salt },
    });
    return true;
  } catch {
    return false;
  }
}

export async function registerSession(): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;

  const token = await getSecureItem(AUTH_TOKEN_KEY);
  if (token) {
    await mongoService.updateOne('sessions', { token }, {
      $set: { lastActiveAt: new Date().toISOString() },
    });
  }
}