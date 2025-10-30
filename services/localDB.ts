import { Transaction } from '../types';

const DB_NAME = 'ali-enterprises-db';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

class LocalDBService {
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        reject('Error opening IndexedDB');
      };
    });
  }

  public async getTransactions(): Promise<Transaction[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error fetching transactions from IndexedDB:', request.error);
        reject('Error fetching transactions');
      };
    });
  }

  public async saveTransaction(transaction: Transaction): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const dbTransaction = db.transaction([STORE_NAME], 'readwrite');
      const store = dbTransaction.objectStore(STORE_NAME);
      const request = store.put(transaction);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error saving transaction to IndexedDB:', request.error);
        reject('Error saving transaction');
      };
    });
  }

  public async deleteTransaction(transactionId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const dbTransaction = db.transaction([STORE_NAME], 'readwrite');
      const store = dbTransaction.objectStore(STORE_NAME);
      const request = store.delete(transactionId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error deleting transaction from IndexedDB:', request.error);
        reject('Error deleting transaction');
      };
    });
  }

  public async clearTransactions(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error clearing transactions from IndexedDB:', request.error);
        reject('Error clearing transactions');
      };
    });
  }
}

export const localDB = new LocalDBService();
