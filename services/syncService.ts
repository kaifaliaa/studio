import { localDB } from './LocalDBService';
import { googleSheets } from './googleSheets';
import { Transaction } from '../types';

class SyncService {
  public async findAndRemoveDuplicateTransactions(): Promise<void> {
    try {
      console.log('Starting duplicate transaction check...');

      const localTransactions = await localDB.getTransactions();
      const sheetTransactions = await googleSheets.getAllTransactions();

      if (sheetTransactions.length === 0) {
        console.log('No transactions found in Google Sheets. Nothing to compare.');
        return;
      }

      const sheetTransactionIds = new Set(sheetTransactions.map(t => t.id));

      const duplicateTransactions = localTransactions.filter(localT => 
        sheetTransactions.some(sheetT => 
          sheetT.id === localT.id && this.isTransactionContentSame(localT, sheetT)
        )
      );

      const transactionsToDelete = localTransactions.filter(localT => !sheetTransactionIds.has(localT.id));

      if (duplicateTransactions.length > 0) {
        console.log(`Found ${duplicateTransactions.length} duplicate transactions. No action needed for these as they are in sync.`);
      }

      if (transactionsToDelete.length > 0) {
        console.log(`Found ${transactionsToDelete.length} transactions in local DB that are not in Google Sheets. Deleting them...`);
        for (const transaction of transactionsToDelete) {
          await localDB.deleteTransaction(transaction.id);
          console.log(`Deleted transaction with ID: ${transaction.id} from local DB.`);
        }
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
