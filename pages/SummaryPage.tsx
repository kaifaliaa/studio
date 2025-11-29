import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UsersIcon } from '../components/icons/UsersIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { TrashIcon } from '../components/icons/TrashIcon';

interface FilteredSummary {
  displayName: string;
  companyName: string;
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
  transactionCount: number;
}

interface SummaryAccumulatorValue {
  displayName: string;
  companyName: string;
  totalCredit: number;
  totalDebit: number;
  transactionCount: number;
}
type SummaryAccumulator = { [key: string]: SummaryAccumulatorValue };

const SummaryPage: React.FC = () => {
  const { transactions, locations, companyNames, addCompany, deleteCompany } = useAppContext();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companyToDelete, setCompanyToDelete] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedLocations = useMemo(() => [...locations].sort(), [locations]);
  const activeLocation = selectedLocation ?? (sortedLocations.length > 0 ? sortedLocations[0] : null);


  const handleAddCompany = async () => {
    if (newCompanyName.trim() === '') return;
    await addCompany(newCompanyName.trim().toUpperCase());
    setNewCompanyName('');
  };

  const handleDeleteCompany = async () => {
    if (companyToDelete.trim() === '') return;
    await deleteCompany(companyToDelete.trim());
    setCompanyToDelete('');
  };

  const filteredSummaries = useMemo(() => {
    const relevantTransactions = transactions.filter(tx => tx.location === activeLocation);

    const summariesByGroup = relevantTransactions.reduce<SummaryAccumulator>((acc, tx) => {
      const companyName = tx.company || 'NA';
      const groupKey = `${companyName} ${tx.location}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          displayName: groupKey,
          companyName: companyName,
          totalCredit: 0,
          totalDebit: 0,
          transactionCount: 0,
        };
      }

      if (tx.type === 'credit') {
        acc[groupKey].totalCredit += tx.amount;
      } else {
        acc[groupKey].totalDebit += tx.amount;
      }
      acc[groupKey].transactionCount += 1;
      return acc;
    }, {});

    return Object.values(summariesByGroup)
      .map((summary: SummaryAccumulatorValue) => ({
        ...summary,
        netBalance: summary.totalCredit - summary.totalDebit,
      }))
      .filter(summary => summary.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [transactions, activeLocation, searchTerm]);

  const getCompanyUrl = (companyName: string) => {
    const encodedName = encodeURIComponent(companyName);
    if (activeLocation) {
        return `/company/${encodedName}?location=${encodeURIComponent(activeLocation)}`;
    }
    return `/company/${encodedName}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Company Balances</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Balances based on your recorded transactions.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="New Company Name"
              className="w-full sm:w-auto px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={handleAddCompany}
              className="px-3 py-1 bg-green-600 text-white rounded-md flex items-center gap-1 shrink-0"
            >
              <PlusIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={companyToDelete}
              onChange={(e) => setCompanyToDelete(e.target.value)}
              className="w-full sm:w-auto px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Select to Delete</option>
              {companyNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={handleDeleteCompany}
              disabled={!companyToDelete}
              className="px-3 py-1 bg-red-600 text-white rounded-md flex items-center gap-1 shrink-0 disabled:opacity-50"
            >
              <TrashIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>
        
      <div className="flex flex-wrap gap-2 mb-6">
        {sortedLocations.map(location => {
          const isActive = activeLocation === location;
          return (
            <button
              key={location}
              onClick={() => setSelectedLocation(location)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {location}
            </button>
          );
        })}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search Company Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
        />
      </div>
      <div className="mb-6">
          <Link to="/group/finance" className="text-blue-500 hover:underline">
              View Finance Group History
          </Link>
      </div>

      {/* Table for larger screens */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Company Name</th>
                <th scope="col" className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Credits</th>
                <th scope="col" className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Debits</th>
                <th scope="col" className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Net Balance</th>
                <th scope="col" className="px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSummaries.map((summary: FilteredSummary) => (
                <tr key={summary.displayName} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <Link to={getCompanyUrl(summary.companyName)} className="hover:underline">{summary.displayName} ({summary.transactionCount})</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">₹{summary.totalCredit.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">₹{summary.totalDebit.toLocaleString('en-IN')}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${summary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                    {summary.netBalance < 0 ? '-' : ''}₹{Math.abs(summary.netBalance).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={getCompanyUrl(summary.companyName)} className="text-gray-400 hover:text-gray-600"><ChevronRightIcon className="h-5 w-5" /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards for smaller screens */}
      <div className="md:hidden space-y-4">
        {filteredSummaries.map((summary: FilteredSummary) => (
            <Link to={getCompanyUrl(summary.companyName)} key={summary.displayName} className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{summary.displayName} ({summary.transactionCount})</h3>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-gray-500 dark:text-gray-400">Credits</div>
                    <div className="text-right text-green-600 dark:text-green-400 font-medium">₹{summary.totalCredit.toLocaleString('en-IN')}</div>
                    
                    <div className="text-gray-500 dark:text-gray-400">Debits</div>
                    <div className="text-right text-red-600 dark:text-red-400 font-medium">-₹{summary.totalDebit.toLocaleString('en-IN')}</div>
                    
                    <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 my-1"></div>

                    <div className="text-gray-600 dark:text-gray-300 font-bold">Net Balance</div>
                    <div className={`text-right font-bold ${summary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                        {summary.netBalance < 0 ? '-' : ''}₹{Math.abs(summary.netBalance).toLocaleString('en-IN')}
                    </div>
                </div>
            </Link>
        ))}
      </div>

      {filteredSummaries.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-4">
            <p className="text-gray-500 dark:text-gray-400">No company data to display for the selected location.</p>
        </div>
      )}
    </div>
  );
};

export default SummaryPage;
