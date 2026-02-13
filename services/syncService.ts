import { localDB } from './LocalDBService';
import { googleSheets } from './googleSheets';
import { Transaction } from '../types';

class SyncService {
  private isSyncing = false;

  constructor() {
    this.startPeriodicSync();
  }

  private startPeriodicSync() {
    setInterval(async () => {
      if (!this.isSyncing) {
        await this.syncWithGoogleSheets();
      }
    }, 60000); // Sync every 60 seconds
  }

  public async syncWithGoogleSheets(): Promise<void> {
    this.isSyncing = true;
    try {
      console.log('Starting sync with Google Sheets...');

      const [localTransactions, sheetTransactions] = await Promise.all([
        localDB.getTransactions(),
        googleSheets.getAllTransactions(),
      ]);

      const localTransactionIds = new Set(localTransactions.map(t => t.id));
      const sheetTransactionIds = new Set(sheetTransactions.map(t => t.id));

      // Upload new local transactions to Google Sheets
      const newLocalTransactions = localTransactions.filter(localT => !sheetTransactionIds.has(localT.id));

      if (newLocalTransactions.length > 0) {
        console.log(`Found ${newLocalTransactions.length} new local transactions to upload.`);
        await googleSheets.addTransactions(newLocalTransactions);
        console.log('Successfully uploaded new local transactions.');
      }

      // Download new sheet transactions to local DB
      const newSheetTransactions = sheetTransactions.filter(sheetT => !localTransactionIds.has(sheetT.id));

      if (newSheetTransactions.length > 0) {
        console.log(`Found ${newSheetTransactions.length} new transactions in Google Sheets to download.`);
        await Promise.all(newSheetTransactions.map(transaction => localDB.addTransaction(transaction)));
        console.log('Successfully downloaded new transactions from Google Sheets.');
      }
      
      console.log('Sync with Google Sheets finished.');
    } catch (error) {
      console.error('Error during sync with Google Sheets:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  public async findAndRemoveDuplicateTransactions(): Promise<void> {
    try {
      console.log('Starting duplicate transaction check...');

      const [localTransactions, sheetTransactions] = await Promise.all([
        localDB.getTransactions(),
        googleSheets.getAllTransactions(),
      ]);

      if (sheetTransactions.length === 0) {
        console.log('No transactions found in Google Sheets. Nothing to compare.');
        return;
      }
      
      const sheetTransactionsById = new Map(sheetTransactions.map(t => [t.id, t]));

      const duplicateTransactions = localTransactions.filter(localT => {
        const sheetT = sheetTransactionsById.get(localT.id);
        return sheetT && this.isTransactionContentSame(localT, sheetT);
      });

      const transactionsToDelete = localTransactions.filter(localT => !sheetTransactionsById.has(localT.id));

      if (duplicateTransactions.length > 0) {
        console.log(`Found ${duplicateTransactions.length} duplicate transactions. No action needed for these as they are in sync.`);
      }

      if (transactionsToDelete.length > 0) {
        console.log(`Found ${transactionsToDelete.length} transactions in local DB that are not in Google Sheets. Deleting them...`);
        await Promise.all(transactionsToDelete.map(transaction => localDB.deleteTransaction(transaction.id)));
        console.log(`Deleted ${transactionsToDelete.length} transactions from local DB.`);
      } else {
        console.log('No transactions to delete from local DB.');
      }

      console.log('Duplicate transaction check finished.');
    } catch (error) {
      console.error('Error during duplicate transaction check:', error);
    }
  }

  private isTransactionContentSame(t1: Transaction, t2: Transaction): boolean {
    return (
      t1.date === t2.date &&
      t1.type === t2.type &&
      t1.paymentMethod === t2.paymentMethod &&
      t1.amount === t2.amount &&
      t1.company === t2.company &&
      t1.person === t2.person
    );
  }
}

export const syncService = new SyncService();
