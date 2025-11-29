import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Transaction } from '../types';

// Icons
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { TrendingUpIcon } from '../components/icons/TrendingUpIcon';
import { TrendingDownIcon } from '../components/icons/TrendingDownIcon';
import { StarIcon } from '../components/icons/StarIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { MinusCircleIcon } from '../components/icons/MinusCircleIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { PrinterIcon } from '../components/icons/PrinterIcon';
import { WalletIcon } from '../components/icons/WalletIcon';
import { RupeeIcon } from '../components/icons/RupeeIcon';
import { CalendarDaysIcon } from '../components/icons/CalendarDaysIcon';
import { FilterIcon } from '../components/icons/FilterIcon';
import { UserIcon } from '../components/icons/UserIcon';

const TransactionItem: React.FC<{
  transaction: Transaction;
  isSelected: boolean;
  onSelect: (id: string) => void;
  from: string;
}> = ({ transaction, isSelected, onSelect, from }) => {
  const { id, date, type, person, amount, paymentMethod } = transaction;

  const formattedDate = new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg flex items-center p-4 gap-4 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        checked={isSelected}
        onChange={() => onSelect(id)}
        aria-label={`Select transaction for ${person || 'N/A'}`}
      />
      {type === 'credit' ? (
        <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0" />
      ) : (
        <MinusCircleIcon className="h-8 w-8 text-red-500 flex-shrink-0" />
      )}
      <div className="flex-grow truncate">
        <p className="font-semibold text-lg text-gray-800 dark:text-white truncate">{person || 'N/A'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{formattedDate}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        <div className="text-right">
            <p className={`text-xl font-bold ${
              amount < 0 ? 'text-red-600 dark:text-red-400' : 
              type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
            {type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{paymentMethod}</p>
        </div>
        <Link to={`/edit/${id}`} state={{ from }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" aria-label="Edit transaction">
            <PencilIcon className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
};

const GroupHistoryPage: React.FC = () => {
  const { groupName } = useParams<{ groupName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { transactions, deleteTransactionsByIds, addForwardEntry, user } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.email === 'a@gmail.com';
  const locationFilter = searchParams.get('location');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [filterYear, setFilterYear] = useState(searchParams.get('year') || 'all');
  const [filterMonth, setFilterMonth] = useState(searchParams.get('month') || 'all');
  const [filterDay, setFilterDay] = useState(searchParams.get('day') || 'all');
  const [filterType, setFilterType] = useState(searchParams.get('type') || 'all');
  const [filterRecorder, setFilterRecorder] = useState(searchParams.get('recorder') || 'all');
  const [showAllDates, setShowAllDates] = useState(searchParams.get('showAllDates') === 'true');

  const decodedGroupName = groupName ? decodeURIComponent(groupName) : '';
  const companyGroup = ['KOTAK', 'CHOLA', 'UNITY SMALL'];

  const groupTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => companyGroup.includes(tx.company || 'NA'));
    if (locationFilter) {
      filtered = filtered.filter(tx => tx.location === locationFilter);
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, locationFilter]);
  
  const personsData = useMemo(() => {
    const persons = new Map<string, { transactions: Transaction[], totalCredit: number, totalDebit: number, netBalance: number }>();

    groupTransactions.forEach(tx => {
        const personName = tx.person || 'Unknown';
        if (!persons.has(personName)) {
            persons.set(personName, { transactions: [], totalCredit: 0, totalDebit: 0, netBalance: 0 });
        }

        const personData = persons.get(personName)!;
        personData.transactions.push(tx);
        if (tx.type === 'credit') {
            personData.totalCredit += tx.amount;
        } else {
            personData.totalDebit += tx.amount;
        }
        personData.netBalance = personData.totalCredit - personData.totalDebit;
    });

    return Array.from(persons.entries()).map(([person, data]) => ({ person, ...data }));

  }, [groupTransactions]);


  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  const handlePersonClick = (personName: string) => {
    if (expandedPerson === personName) {
        setExpandedPerson(null);
    } else {
        setExpandedPerson(personName);
    }
  };

  if (!decodedGroupName) return <div className="text-center p-8">Group name not found.</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 no-print">
          <div className="flex items-center gap-4">
              <Link to={"/summary"} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                  <ArrowLeftIcon className="h-5 w-5"/><span>Back to Summaries</span>
              </Link>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white w-full sm:w-auto text-center sm:text-left">
            {decodedGroupName} History
          </h2>
      </header>

    {personsData.map(({ person, transactions, totalCredit, totalDebit, netBalance }) => (
        <div key={person} className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
            <div className="p-4 cursor-pointer" onClick={() => handlePersonClick(person)}>
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-xl text-gray-900 dark:text-white">{person}</h3>
                    <div className={`${netBalance >= 0 ? 'text-blue-600' : 'text-orange-500'} font-bold text-xl`}>₹{netBalance.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex justify-between text-sm mt-2">
                    <div className="text-green-600">Credit: ₹{totalCredit.toLocaleString('en-IN')}</div>
                    <div className="text-red-600">Debit: ₹{totalDebit.toLocaleString('en-IN')}</div>
                </div>
            </div>
            {expandedPerson === person && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    {transactions.map(tx => (
                        <TransactionItem 
                            key={tx.id} 
                            transaction={tx} 
                            isSelected={selectedIds.includes(tx.id)} 
                            onSelect={() => {}} 
                            from={location.pathname + location.search} 
                        />
                    ))}
                </div>
            )}
        </div>
    ))}

    </div>
  );
};

export default GroupHistoryPage;
