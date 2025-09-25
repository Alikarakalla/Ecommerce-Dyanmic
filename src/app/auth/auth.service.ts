import { Injectable, computed, effect, signal } from '@angular/core';
import {
  AuthCredentials,
  AuthUser,
  OrderItemSnapshot,
  OrderRecord,
  ProfileUpdatePayload,
  SignupPayload
} from '../models/auth.model';

const USERS_STORAGE_KEY = 'ecommerce-dynamic-users';
const SESSION_STORAGE_KEY = 'ecommerce-dynamic-session';
const ADMIN_INVITE_CODE = 'ADMIN-ACCESS-2024';

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 11);
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usersSignal = signal<AuthUser[]>(this.loadUsers());
  private readonly currentUserSignal = signal<AuthUser | null>(this.loadSession());

  readonly users = computed(() => this.usersSignal());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');
  readonly orders = computed(() => this.currentUserSignal()?.orders ?? []);

  constructor() {
    effect(() => {
      this.persistUsers(this.usersSignal());
    });

    effect(() => {
      this.persistSession(this.currentUserSignal());
    });

    this.ensureAdminSeed();
  }

  signup(payload: SignupPayload): { success: boolean; message?: string } {
    const users = this.usersSignal();
    const emailExists = users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase());

    if (emailExists) {
      return { success: false, message: 'Email is already registered.' };
    }

    if (payload.role === 'admin' && payload.adminCode !== ADMIN_INVITE_CODE) {
      return { success: false, message: 'Invalid admin invite code.' };
    }

    const user: AuthUser = {
      id: createId(),
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: payload.password,
      role: payload.role,
      orders: []
    };

    this.usersSignal.update((existing) => [...existing, user]);
    this.currentUserSignal.set(user);

    return { success: true };
  }

  login(credentials: AuthCredentials): { success: boolean; message?: string } {
    const user = this.usersSignal().find((item) => item.email === credentials.email.toLowerCase());

    if (!user || user.password !== credentials.password) {
      return { success: false, message: 'Invalid email or password.' };
    }

    this.currentUserSignal.set(user);
    return { success: true };
  }

  logout(): void {
    this.currentUserSignal.set(null);
  }

  updateProfile(payload: ProfileUpdatePayload): { success: boolean; message?: string } {
    const current = this.currentUserSignal();
    if (!current) {
      return { success: false, message: 'You need to be signed in.' };
    }

    const conflictingEmail = this.usersSignal().find(
      (user) => user.email === payload.email.toLowerCase() && user.id !== current.id
    );

    if (conflictingEmail) {
      return { success: false, message: 'Email is already taken by another account.' };
    }

    const updated: AuthUser = {
      ...current,
      name: payload.name,
      email: payload.email.toLowerCase(),
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      country: payload.country
    };

    this.upsertUser(updated);
    return { success: true };
  }

  recordOrder(order: OrderRecord): void {
    const current = this.currentUserSignal();
    if (!current) {
      return;
    }

    const updated: AuthUser = {
      ...current,
      orders: [order, ...current.orders]
    };

    this.upsertUser(updated);
  }

  upsertUser(updated: AuthUser): void {
    this.usersSignal.update((users) => users.map((user) => (user.id === updated.id ? updated : user)));
    if (this.currentUserSignal()?.id === updated.id) {
      this.currentUserSignal.set(updated);
    }
  }

  private loadUsers(): AuthUser[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as AuthUser[];
      return parsed.map((user) => ({
        ...user,
        orders: user.orders ?? []
      }));
    } catch (error) {
      console.error('Failed to parse stored users', error);
      return [];
    }
  }

  private loadSession(): AuthUser | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const user = JSON.parse(raw) as AuthUser;
      return {
        ...user,
        orders: user.orders ?? []
      };
    } catch (error) {
      console.error('Failed to parse current session', error);
      return null;
    }
  }

  private persistUsers(users: AuthUser[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private persistSession(user: AuthUser | null): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (!user) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }

  private ensureAdminSeed(): void {
    const hasAdmin = this.usersSignal().some((user) => user.role === 'admin');
    if (hasAdmin) {
      return;
    }

    const admin: AuthUser = {
      id: createId(),
      name: 'Demo Admin',
      email: 'admin@demo.com',
      password: 'admin123',
      role: 'admin',
      orders: []
    };

    this.usersSignal.update((existing) => [...existing, admin]);
  }
}
