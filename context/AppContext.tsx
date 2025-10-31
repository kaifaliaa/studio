import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Transaction, NoteCounts } from '../types';
import { COMPANY_NAMES as defaultCompanyNames, LOCATIONS, DENOMINATIONS } from '../constants';
import { googleSheets } from '../services/googleSheets';
import { useAuth, User } from './AuthContext';
import { localDB } from '../services/LocalDBService';

interface AppContextType {
  user: User | null;
  transactions: Transaction[];
  vault: NoteCounts;
  companyNames: string[];
  locations: string[];
  addTransaction: (newTransaction: Omit<Transaction, 'id'> & { manualDate?: string }) => Promise<void>;
  updateTransaction: (updatedTransaction: Transaction) => Promise<void>;
  deleteTransactionsByIds: (ids: string[]) => Promise<void>;
  addCompany: (companyName: string) => Promise<void>;
  deleteCompany: (companyName: string) => Promise<void>;
  googleSheetsConnected: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  manualSync: () => Promise<void>;
  clearLocalDB: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

const initializeVault = (): NoteCounts => {
    const freshVault: NoteCounts = {};
    DENOMINATIONS.forEach(d => freshVault[d] = 0);
    return freshVault;
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [companyNames, setCompanyNames] = useState<string[]>(defaultCompanyNames);
  const [vault, setVault] = useState<NoteCounts>(() => initializeVault());
  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const transactions = allTransactions.filter(tx => {
    if (!currentUser) return false;
    const currentUserName = (currentUser.displayName || currentUser.email) || 'Unknown User';
    const txRecordedBy = tx.recordedBy.replace('@gmail.com', '');
    const simplifiedCurrentUserName = currentUserName.replace('@gmail.com', '');
    return txRecordedBy.toLowerCase() === simplifiedCurrentUserName.toLowerCase();
  });

  const recalculateVault = useCallback((transactions: Transaction[], currentUserName?: string) => {
    const newVault = initializeVault();
    if (!currentUserName) {
        if(currentUser) {
            currentUserName = currentUser?.displayName || currentUser?.email || 'Unknown User';
        }
    }
    const userTransactions = transactions.filter(tx => tx.recordedBy === currentUserName);
    userTransactions.forEach(tx => {
      if (tx.paymentMethod === 'cash' && tx.breakdown && typeof tx.breakdown === 'object') {
        for (const denomStr in tx.breakdown) {
          const denom = parseInt(denomStr, 10);
          const count = tx.breakdown[denom] || 0;
          if (DENOMINATIONS.includes(denom)) {
            if (tx.type === 'credit') {
              newVault[denom] = (newVault[denom] || 0) + count;
            } else if (tx.type === 'debit') {
              newVault[denom] = (newVault[denom] || 0) - count;
            }
          }
        }
      }
    });
    return newVault;
  }, [currentUser]);

  const syncWithGoogleSheets = useCallback(async () => {
    if (!currentUser) return;

    setSyncStatus('syncing');
    try {
        console.log('🔄 Starting sync with Google Sheets...');
        const isConnected = await googleSheets.testConnection();
        if (isConnected) {
            setGoogleSheetsConnected(true);
            console.log('✅ Google Sheets connected. Initializing sheet...');
            await googleSheets.initializeSheet();

            console.log('📥 Fetching transactions from Google Sheets...');
            const sheetTransactions = await googleSheets.getAllTransactions();
            console.log(`📥 Fetched ${sheetTransactions.length} transactions from sheets.`);

            const localTransactions = await localDB.getTransactions();
            console.log(`💿 Loaded ${localTransactions.length} local transactions.`);

            const sheetTxMap = new Map(sheetTransactions.map(tx => [tx.id, tx]));
            const mergedTransactions = [...sheetTransactions];

            for (const localTx of localTransactions) {
                if (!sheetTxMap.has(localTx.id)) {
                    console.log(`📤 Uploading new local transaction ${localTx.id} to Google Sheets.`);
                    try {
                        await googleSheets.addTransaction(localTx);
                        mergedTransactions.push(localTx);
                    } catch (uploadError) {
                        console.error(`❌ Failed to upload transaction ${localTx.id}:`, uploadError);
                        mergedTransactions.push(localTx); 
                    }
                }
            }

            const finalSorted = mergedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            console.log(`📊 Merged transaction count: ${finalSorted.length}`);
            setAllTransactions(finalSorted);
            await localDB.clearAndRepopulateTransactions(finalSorted);
            console.log('💿 Local database updated with merged transactions.');

            const currentUserName = (currentUser.displayName || currentUser.email) || 'Unknown User';
            const recalculatedVault = recalculateVault(finalSorted, currentUserName);
            setVault(recalculatedVault);
            console.log('✅ Vault recalculated after sync.');

            setSyncStatus('success');
            console.log('✅ Sync with Google Sheets completed successfully.');
        } else {
            setGoogleSheetsConnected(false);
            setSyncStatus('error');
            console.warn('❌ Google Sheets connection failed. Operating in offline mode.');
        }
    } catch (error) {
        setGoogleSheetsConnected(false);
        setSyncStatus('error');
        console.error('💥 Sync failed:', error);
    }
}, [currentUser, recalculateVault]);

useEffect(() => {
    if (!currentUser) return;

    const loadLocalDataAndSync = async () => {
        try {
            console.log('🔄 Loading initial data from IndexedDB...');
            const localTransactions = await localDB.getTransactions();
            console.log(`✅ Loaded ${localTransactions.length} transactions from IndexedDB`);
            const sortedTransactions = localTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllTransactions(sortedTransactions);

            console.log('🧮 Recalculating vault from local data...');
            const currentUserName = (currentUser.displayName || currentUser.email) || 'Unknown User';
            const recalculatedVault = recalculateVault(sortedTransactions, currentUserName);
            setVault(recalculatedVault);
            console.log('✅ Vault recalculated.');

            // Trigger background sync
            syncWithGoogleSheets();

        } catch (error) {
            console.error("CRITICAL: Failed to load local data. Resetting application state.", error);
            setAllTransactions([]);
            setVault(initializeVault());
        }
    };

    loadLocalDataAndSync();
}, [currentUser, syncWithGoogleSheets, recalculateVault]);

  useEffect(() => {
    try {
      localStorage.setItem('companyNames', JSON.stringify(companyNames));
    } catch (error) {
      console.error("Failed to save company names to localStorage", error);
    }
  }, [companyNames]);

  const addTransaction = useCallback(async (newTransactionData: Omit<Transaction, 'id'> & { manualDate?: string }) => {
    const transactionDate = newTransactionData.manualDate || newTransactionData.date;
    const newTransaction: Transaction = {
      ...newTransactionData,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
    };

    // UI Update First
    setAllTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    // Vault update
    if (newTransaction.paymentMethod === 'cash' && newTransaction.breakdown) {
        setVault(prevVault => {
            const updatedVault = { ...prevVault };
            for (const denom in newTransaction.breakdown) {
                const denomNum = parseInt(denom, 10);
                const count = newTransaction.breakdown[denomNum];
                if (newTransaction.type === 'credit') updatedVault[denomNum] += count;
                else if (newTransaction.type === 'debit') updatedVault[denomNum] -= count;
            }
            return updatedVault;
        });
    }

    // Persist and Sync in Background
    (async () => {
      try {
        await localDB.saveTransaction(newTransaction);
        console.log(`✅ Transaction ${newTransaction.id} saved locally.`);

        if (googleSheetsConnected) {
          setSyncStatus('syncing');
          await googleSheets.addTransaction(newTransaction);
          setSyncStatus('success');
          console.log(`✅ Transaction ${newTransaction.id} synced to Google Sheets.`);
        }
      } catch (error) {
        setSyncStatus('error');
        console.error(`❌ Failed to save or sync transaction ${newTransaction.id}:`, error);
      }
    })();
  }, [googleSheetsConnected]);

  const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
    // UI Update First
    const originalTransaction = allTransactions.find(tx => tx.id === updatedTransaction.id);
    setAllTransactions(prev => prev.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    // Vault update
    setVault(prevVault => {
        const newVault = { ...prevVault };
        if (originalTransaction && originalTransaction.paymentMethod === 'cash' && originalTransaction.breakdown) {
            for (const denomStr in originalTransaction.breakdown) {
                const denom = parseInt(denomStr, 10); const count = originalTransaction.breakdown[denom] || 0;
                if (originalTransaction.type === 'credit') newVault[denom] -= count;
                else if (originalTransaction.type === 'debit') newVault[denom] += count;
            }
        }
        if (updatedTransaction.paymentMethod === 'cash' && updatedTransaction.breakdown) {
            for (const denomStr in updatedTransaction.breakdown) {
                const denom = parseInt(denomStr, 10); const count = updatedTransaction.breakdown[denom] || 0;
                if (updatedTransaction.type === 'credit') newVault[denom] += count;
                else if (updatedTransaction.type === 'debit') newVault[denom] -= count;
            }
        }
        return newVault;
    });

    // Persist and Sync in Background
    (async () => {
      try {
        await localDB.saveTransaction(updatedTransaction);
        console.log(`✅ Transaction ${updatedTransaction.id} updated locally.`);

        if (googleSheetsConnected) {
          setSyncStatus('syncing');
          await googleSheets.updateTransaction(updatedTransaction);
          setSyncStatus('success');
          console.log(`✅ Transaction ${updatedTransaction.id} updated in Google Sheets.`);
        }
      } catch (error) {
        setSyncStatus('error');
        console.error(`❌ Failed to update or sync transaction ${updatedTransaction.id}:`, error);
      }
    })();
  }, [allTransactions, googleSheetsConnected]);

  const deleteTransactionsByIds = useCallback(async (ids: string[]) => {
    const transactionsToDelete = allTransactions.filter(tx => ids.includes(tx.id));
    
    // UI Update First
    setAllTransactions(prev => prev.filter(tx => !ids.includes(tx.id)));
    // Vault update
    setVault(prevVault => {
        const updatedVault = { ...prevVault };
        transactionsToDelete.forEach(tx => {
            if (tx.paymentMethod === 'cash' && tx.breakdown) {
                for(const denom in tx.breakdown) {
                    const denomNum = parseInt(denom, 10); const count = tx.breakdown[denomNum];
                    if (tx.type === 'credit') updatedVault[denomNum] -= count;
                    else if (tx.type === 'debit') updatedVault[denomNum] += count;
                }
            }
        });
        return updatedVault;
    });

    // Persist and Sync in Background
    (async () => {
      try {
        for (const id of ids) {
          await localDB.deleteTransaction(id);
        }
        console.log(`✅ Transactions ${ids.join(', ')} deleted locally.`);

        if (googleSheetsConnected) {
          setSyncStatus('syncing');
          for (const id of ids) {
            await googleSheets.deleteTransaction(id);
          }
          setSyncStatus('success');
          console.log(`✅ Transactions ${ids.join(', ')} deleted from Google Sheets.`);
        }
      } catch (error) {
        setSyncStatus('error');
        console.error(`❌ Failed to delete or sync transactions ${ids.join(', ')}:`, error);
      }
    })();
  }, [allTransactions, googleSheetsConnected]);

  const addCompany = useCallback(async (companyName: string) => {
    setCompanyNames(prev => [...prev, companyName].sort());
  }, []);

  const deleteCompany = useCallback(async (companyName: string) => {
    setCompanyNames(prev => prev.filter(c => c !== companyName));
  }, []);

  const manualSync = useCallback(async () => {
      await syncWithGoogleSheets();
  }, [syncWithGoogleSheets]);

  const clearLocalDB = useCallback(async () => {
    try {
      await localDB.clearTransactions();
      setAllTransactions([]);
      setVault(initializeVault());
      console.log('✅ Local database cleared successfully.');
    } catch (error) {
      console.error('❌ Failed to clear local database:', error);
    }
  }, []);
  

  const value = {
    user: currentUser,
    transactions,
    vault,
    companyNames,
    locations: LOCATIONS,
    addTransaction,
    updateTransaction,
    deleteTransactionsByIds,
    addCompany,
    deleteCompany,
    googleSheetsConnected,
    syncStatus,
    manualSync,
    clearLocalDB,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
