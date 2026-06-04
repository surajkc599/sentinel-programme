import { Injectable } from '@angular/core';
import { Assessment } from '@core/models/assessment.model';

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private readonly dbName = 'SENTINEL_Drafts';
  private readonly storeName = 'drafts';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'client_id' });
        }
      };
    });
  }

  async saveDraft(draft: Assessment): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(draft);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async getDrafts(): Promise<Assessment[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async deleteDraft(clientId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(clientId);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async clearAllDrafts(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.clear();

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }
}
