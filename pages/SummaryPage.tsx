import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UsersIcon } from '../components/icons/UsersIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';

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
  const { transactions, locations } = useAppContext();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sortedLocations = useMemo(() => [...locations].sort(), [locations]);
  const activeLocation = selectedLocation ?? (sortedLocations.length > 0 ? sortedLocations[0] : null);
  
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const filteredSummaries = useMemo(() => {
    const relevantTransactions = transactions.filter(tx => tx.location === activeLocation);

    const summariesByGroup = relevantTransactions.reduce<SummaryAccumulator>((acc, tx) => {
      const companyName = tx.company || 'NA';
      
      if (companyName === 'NA') {
        return acc;
      }

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
    <div className="max-w-7xl mx-auto px-2 pb-24 md:pb-8">
      <div className="my-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Company Balances</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Balances for {activeLocation || 'all locations'}</p>
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
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                      ? 'bg-blue-600 text-white shadow-md'
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
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 shadow-sm"
        />
      </div>
      <div className="mb-6">
          <Link to="/group/finance" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              View Finance Group History
          </Link>
      </div>

      {/* Table for larger screens */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company Name</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Debits</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Net Balance</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSummaries.map((summary: FilteredSummary) => (
                <tr key={summary.displayName} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <Link to={getCompanyUrl(summary.companyName)} className="hover:underline">{summary.displayName} ({summary.transactionCount})</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-semibold">{currencyFormatter.format(summary.totalCredit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400 font-semibold">{currencyFormatter.format(summary.totalDebit)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${summary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                    {currencyFormatter.format(summary.netBalance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={getCompanyUrl(summary.companyName)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"><ChevronRightIcon className="h-5 w-5" /></Link>
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
            <Link to={getCompanyUrl(summary.companyName)} key={summary.displayName} className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transition-transform hover:scale-105">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-md text-gray-800 dark:text-white pr-2">{summary.displayName} <span className="text-gray-500 font-normal">({summary.transactionCount})</span></h3>
                    <ChevronRightIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                      <div className="text-gray-500 dark:text-gray-400">Credits</div>
                      <div className="text-right text-green-600 dark:text-green-400 font-semibold">{currencyFormatter.format(summary.totalCredit)}</div>
                  </div>
                  <div className="flex justify-between items-center">
                      <div className="text-gray-500 dark:text-gray-400">Debits</div>
                      <div className="text-right text-red-600 dark:text-red-400 font-semibold">{currencyFormatter.format(summary.totalDebit)}</div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="text-gray-700 dark:text-gray-300 font-bold">Net Balance</div>
                    <div className={`text-right font-bold text-lg ${summary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                        {currencyFormatter.format(summary.netBalance)}
                    </div>
                  </div>
                </div>
            </Link>
        ))}
      </div>

      {filteredSummaries.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-4">
            <p className="text-gray-500 dark:text-gray-400">No company data to display for {activeLocation}.</p>
        </div>
      )}
    </div>
  );
};

export default SummaryPage;
