import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Transaction } from '../types';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';
import { FilterIcon } from '../components/icons/FilterIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { MinusCircleIcon } from '../components/icons/MinusCircleIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { numberToWords } from '../utils/numberToWords';
import { ArrowPathIcon } from '../components/icons/ArrowPathIcon';
import { DocumentArrowDownIcon } from '../components/icons/DocumentArrowDownIcon';

const HistoryPage: React.FC = () => {
  const { transactions, deleteTransactionsByIds, companyNames, locations, manualSync, syncStatus, personNames } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterName, setFilterName] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [showAllDates, setShowAllDates] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  const mainHistoryTransactions = useMemo(() => {
    return transactions.filter(tx => 
      tx.paymentMethod === 'cash' && 
      tx.breakdown && 
      Object.keys(tx.breakdown).length > 0
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const { years, months, days } = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    const days = new Set<string>();
    
    mainHistoryTransactions.forEach(tx => {
        const d = new Date(tx.date);
        years.add(d.getFullYear().toString());
        if (filterYear === 'all' || d.getFullYear().toString() === filterYear) {
            months.add((d.getMonth() + 1).toString().padStart(2, '0'));
        }
        if ((filterYear === 'all' || d.getFullYear().toString() === filterYear) && 
            (filterMonth === 'all' || (d.getMonth() + 1).toString().padStart(2, '0') === filterMonth)) {
            days.add(d.getDate().toString().padStart(2, '0'));
        }
    });
    
    return {
        years: Array.from(years).sort((a,b) => parseInt(b) - parseInt(a)),
        months: Array.from(months).sort((a,b) => parseInt(a) - parseInt(b)),
        days: Array.from(days).sort((a,b) => parseInt(a) - parseInt(b)),
    };
  }, [mainHistoryTransactions, filterYear, filterMonth]);

  const filteredTransactions = useMemo(() => {
    return mainHistoryTransactions.filter(tx => {
      if (filterCompany !== 'all' && (tx.company || 'NA') !== filterCompany) return false;
      if (filterLocation !== 'all' && tx.location !== filterLocation) return false;
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterName !== 'all' && tx.person !== filterName) return false;

      if (!showAllDates) {
        const txDate = new Date(tx.date);
        const currentDate = new Date();
        return txDate.getFullYear() === currentDate.getFullYear() &&
               txDate.getMonth() === currentDate.getMonth() &&
               txDate.getDate() === currentDate.getDate();
      } else {
        if (filterYear !== 'all' && new Date(tx.date).getFullYear().toString() !== filterYear) return false;
        if (filterMonth !== 'all' && (new Date(tx.date).getMonth() + 1).toString().padStart(2, '0') !== filterMonth) return false;
        if (filterDay !== 'all' && new Date(tx.date).getDate().toString().padStart(2, '0') !== filterDay) return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      if (searchTerm && !(
          tx.person?.toLowerCase().includes(searchLower) ||
          tx.company?.toLowerCase().includes(searchLower) ||
          tx.amount.toString().includes(searchLower) ||
          tx.location.toLowerCase().includes(searchLower) ||
          tx.recordedBy.replace('@gmail.com', '').toLowerCase().includes(searchLower)
      )) return false;

      return true;
    });
  }, [mainHistoryTransactions, searchTerm, filterCompany, filterLocation, filterType, filterName, showAllDates, filterYear, filterMonth, filterDay]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterCompany('all');
    setFilterLocation('all');
    setFilterType('all');
    setFilterName('all');
    setFilterYear('all');
    setFilterMonth('all');
    setFilterDay('all');
    setShowAllDates(true);
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [filteredTransactions]);

  const totals = useMemo(() => {
    const totalCredit = filteredTransactions
      .filter(tx => tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalDebit = filteredTransactions
      .filter(tx => tx.type === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const netBalance = totalCredit - totalDebit;
    
    return { totalCredit, totalDebit, netBalance };
  }, [filteredTransactions]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredTransactions.map(tx => tx.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const toggleTransactionDetails = (transactionId: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };
  
  const handleConfirmDelete = async () => {
      setIsDeleting(true);
      setDeleteError(null);
      try {
          await deleteTransactionsByIds(selectedIds);
          setIsDeleteModalOpen(false);
          setSelectedIds([]);
      } catch (err: any) {
          setDeleteError(err.message || 'Failed to delete transactions.');
      } finally {
          setIsDeleting(false);
      }
  };

  const handleSync = async () => {
    try {
      await manualSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'Person', 'Company', 'Location', 'Amount', 'Type', 'Payment Method', 'Recorded By'];
    const rows = filteredTransactions.map(tx => 
        [tx.id, tx.date, tx.person, tx.company, tx.location, tx.amount, tx.type, tx.paymentMethod, tx.recordedBy].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `history_export_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (syncStatus === 'success' || syncStatus === 'error') {
      const timer = setTimeout(() => {
        // Context will reset status to 'idle'
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Transaction History</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
              showFilters 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <FilterIcon className="h-4 w-4 mr-2 inline" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all text-sm font-medium ${
              syncStatus === 'syncing' ? 'animate-pulse' : ''
            }`}
          >
            <ArrowPathIcon className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={exportToCSV} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2 text-sm font-medium">
              <DocumentArrowDownIcon className="h-4 w-4" />
              Export CSV
          </button>
          <button onClick={handleDeleteClick} disabled={selectedIds.length === 0} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50">
              <TrashIcon className="h-4 w-4" />
              Delete ({selectedIds.length})
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
        <input 
          type="text" 
          placeholder="Search transactions..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" 
        />
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Companies</option>{companyNames.map(name => <option key={name} value={name}>{name}</option>)}</select>
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Locations</option>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Types</option><option value="credit">Credit</option><option value="debit">Debit</option></select>
                <select value={filterName} onChange={e => setFilterName(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Names</option>{personNames.map(name => <option key={name} value={name}>{name}</option>)}</select>
            </div>
            <div className="mb-4 flex items-center gap-4">
                <button onClick={() => setShowAllDates(!showAllDates)} className={`px-4 py-2 rounded-md font-medium transition-colors text-sm ${showAllDates ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {showAllDates ? 'Show All Dates' : 'Show Today Only'}
                </button>
                {!showAllDates && <span className="text-sm text-blue-600 font-medium">Showing: {new Date().toLocaleDateString('en-IN')}</span>}
            </div>
            {showAllDates && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={filterYear} onChange={e => {setFilterYear(e.target.value); setFilterMonth('all'); setFilterDay('all');}} className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Years</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
                    <select value={filterMonth} onChange={e => {setFilterMonth(e.target.value); setFilterDay('all');}} className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Months</option>{months.map(m=><option key={m} value={m}>{m}</option>)}</select>
                    <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 appearance-none"><option value="all">All Days</option>{days.map(d=><option key={d} value={d}>{d}</option>)}</select>
                </div>
            )}
            <div className="mt-4 flex justify-end">
                <button onClick={resetFilters} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium">Clear Filters</button>
            </div>
        </div>
      )}

      {syncStatus === 'success' && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">Sync successful!</div>}
      {syncStatus === 'error' && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">Sync failed.</div>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filtered Transaction Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><p className="text-sm font-medium">Total Credits</p><p className="text-2xl font-bold text-green-600">₹{totals.totalCredit.toLocaleString('en-IN')}</p></div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"><p className="text-sm font-medium">Total Debits</p><p className="text-2xl font-bold text-red-600">₹{totals.totalDebit.toLocaleString('en-IN')}</p></div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p className="text-sm font-medium">Net Balance</p><p className={`text-2xl font-bold ${totals.netBalance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>₹{totals.netBalance.toLocaleString('en-IN')}</p></div>
        </div>
      </div>

      <div className="mb-4 flex items-center">
        <input type="checkbox" id="selectAll" onChange={handleSelectAll} checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <label htmlFor="selectAll" className="ml-2 text-sm text-gray-600 dark:text-gray-300">Select/Deselect All ({selectedIds.length} of {filteredTransactions.length} selected)</label>
      </div>

      <div className="space-y-4">
        {filteredTransactions.map((tx: Transaction) => {
          const isExpanded = expandedTransactions.has(tx.id);
          const isSelected = selectedIds.includes(tx.id);
          return (
            <div key={tx.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center p-4">
                <input 
                  type="checkbox" 
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-4"
                  checked={isSelected}
                  onChange={() => handleSelect(tx.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-grow cursor-pointer" onClick={() => toggleTransactionDetails(tx.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{tx.person || 'Unknown Customer'}</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(tx.date).toLocaleString('en-IN')}</div>
                    </div>
                    <div className={`text-xl font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="ml-4 text-gray-400">
                      {isExpanded ? <ChevronDownIcon className="h-6 w-6" /> : <ChevronRightIcon className="h-6 w-6" />}
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/20">
                  <div className="space-y-4">
                    <div className="text-sm font-mono">ID: {tx.id}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>Company:</strong> {tx.company || 'N/A'}</div>
                        <div><strong>Location:</strong> {tx.location}</div>
                        <div><strong>Recorded By:</strong> {tx.recordedBy.replace('@gmail.com', '')}</div>
                    </div>
                    <div className="italic">In Words: {numberToWords(tx.amount)}</div>
                    {tx.breakdown && Object.keys(tx.breakdown).length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Denomination Breakdown:</h4>
                        <div className="space-y-1">
                          {Object.entries(tx.breakdown).sort(([a], [b]) => parseInt(b) - parseInt(a)).map(([denom, count]) => (
                            <div key={denom}>₹{denom}: {count} notes = ₹{(parseInt(denom) * (count || 0)).toLocaleString('en-IN')}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Link to={`/edit/${tx.id}`} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">Edit</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filteredTransactions.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-4">
            <p className="text-gray-500 dark:text-gray-400">No transactions match your filters.</p>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold">Confirm Deletion</h3>
                <p className="mt-2 text-sm">Are you sure you want to delete <strong>{selectedIds.length}</strong> transaction(s)? This action cannot be undone.</p>
                {deleteError && <div className="mt-4 text-red-600">{deleteError}</div>}
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="px-4 py-2 border rounded-md">Cancel</button>
                    <button onClick={handleConfirmDelete} disabled={isDeleting} className="px-4 py-2 text-white bg-red-600 rounded-md">{isDeleting ? 'Deleting...' : 'Delete'}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
