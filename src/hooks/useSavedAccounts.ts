import { useState, useEffect, useCallback } from 'react';

export interface SavedAccount {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  refreshToken: string;
  savedAt: number;
}

const STORAGE_KEY = 'muvit_saved_accounts';
const MAX_ACCOUNTS = 4;

function loadAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistAccounts(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function useSavedAccounts() {
  const [accounts, setAccounts] = useState<SavedAccount[]>(loadAccounts);

  // Keep state in sync if another tab changes storage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setAccounts(loadAccounts());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const saveAccount = useCallback((account: SavedAccount) => {
    setAccounts((prev) => {
      // Replace existing or add new (max 4)
      const filtered = prev.filter((a) => a.userId !== account.userId);
      const next = [account, ...filtered].slice(0, MAX_ACCOUNTS);
      persistAccounts(next);
      return next;
    });
  }, []);

  const removeAccount = useCallback((userId: string) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.userId !== userId);
      persistAccounts(next);
      return next;
    });
  }, []);

  const getAccount = useCallback(
    (userId: string) => accounts.find((a) => a.userId === userId) ?? null,
    [accounts],
  );

  return { accounts, saveAccount, removeAccount, getAccount, isFull: accounts.length >= MAX_ACCOUNTS };
}
