import React, { useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Transaction } from '../types';
import { contacts } from '../utils/contacts';

// Icons
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { MinusCircleIcon } from '../components/icons/MinusCircleIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { ShareIcon } from '../components/icons/ShareIcon';

type TransactionWithBalance = Transaction & { closingBalance: number };

const TransactionItem: React.FC<{
  transaction: TransactionWithBalance;
  isSelected: boolean;
  onSelect: (id: string) => void;
  from: string;
}> = ({ transaction, isSelected, onSelect, from }) => {
  const { id, date, type, person, amount, paymentMethod, closingBalance } = transaction;

  const formattedDate = new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
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
            <p className={`text-xl font-bold ${type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
              {type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{paymentMethod}</p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                Bal: ₹{closingBalance.toLocaleString('en-IN')}
            </p>
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
  const { transactions } = useAppContext();
  const location = useLocation();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const decodedGroupName = groupName ? decodeURIComponent(groupName) : '';
  const companyGroup = ['CHOLA', 'BAJAJ', 'IDFC', 'HERO', 'LT'];

  const groupTransactions = useMemo(() => {
    return transactions
      .filter(tx => companyGroup.includes(tx.company?.toUpperCase() || 'NA'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const personsData = useMemo(() => {
    const personsMap = new Map<string, Transaction[]>();

    groupTransactions.forEach(tx => {
        const personName = (tx.person || 'Unknown').toUpperCase();
        if (!personsMap.has(personName)) {
            personsMap.set(personName, []);
        }
        personsMap.get(personName)!.push(tx);
    });

    return Array.from(personsMap.entries()).map(([person, txs]) => {
        const sortedTxs = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let closingBalance = 0;
        const txsWithBalance: TransactionWithBalance[] = [];
        for (let i = sortedTxs.length - 1; i >= 0; i--) {
            const tx = sortedTxs[i];
            closingBalance += (tx.type === 'credit' ? tx.amount : -tx.amount);
            txsWithBalance.unshift({ ...tx, closingBalance });
        }

        const totalCredit = txsWithBalance.reduce((sum, tx) => tx.type === 'credit' ? sum + tx.amount : sum, 0);
        const totalDebit = txsWithBalance.reduce((sum, tx) => tx.type === 'debit' ? sum + tx.amount : sum, 0);
        const netBalance = totalCredit - totalDebit;

        return { person, transactions: txsWithBalance, totalCredit, totalDebit, netBalance };
    });
  }, [groupTransactions]);

  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  const handlePersonClick = (personName: string) => {
    setExpandedPerson(expandedPerson === personName ? null : personName);
  };

  const handleShare = (person: string, netBalance: number, transactions: TransactionWithBalance[]) => {
    const upperPerson = person.toUpperCase();
    const contactKey = Object.keys(contacts).find(key => upperPerson.includes(key));
    const whatsappNumber = contactKey ? contacts[contactKey] : undefined;

    if (!whatsappNumber) {
      alert(`WhatsApp number not found for ${person}. Please add it to the contacts list.`);
      return;
    }

    let message = `Hello ${person},\n\nHere is your transaction summary:\n\n`;
    transactions.slice(0, 5).forEach(tx => {
        const formattedDate = new Date(tx.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const sign = tx.type === 'credit' ? '+' : '-';
        message += `${formattedDate}: ${sign}₹${tx.amount.toLocaleString('en-IN')} (${tx.paymentMethod}) - Closing Bal: ₹${tx.closingBalance.toLocaleString('en-IN')}\n`;
    });
    message += `\nFinal Net Balance: ₹${netBalance.toLocaleString('en-IN')}`;
    
    const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!decodedGroupName) return <div className="text-center p-8">Group name not found.</div>;

  return (
    <div className="max-w-7xl mx-auto pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 my-6 px-4 no-print">
          <div className="flex items-center gap-4">
              <Link to={"/summary"} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                  <ArrowLeftIcon className="h-5 w-5"/><span>Back to Summaries</span>
              </Link>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white w-full sm:w-auto text-center sm:text-left">
            {decodedGroupName} Finance History
          </h2>
      </header>

    {personsData.map(({ person, transactions, totalCredit, totalDebit, netBalance }) => (
        <div key={person} className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4 mx-4">
            <div className="p-4 cursor-pointer" onClick={() => handlePersonClick(person)}>
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-xl text-gray-900 dark:text-white">{person}</h3>
                    <div className="flex items-center gap-4">
                      <div className={`${netBalance >= 0 ? 'text-blue-600' : 'text-orange-500'} font-bold text-xl`}>₹{netBalance.toLocaleString('en-IN')}</div>
                      <button onClick={(e) => { e.stopPropagation(); handleShare(person, netBalance, transactions); }} className="p-2 text-gray-400 hover:text-green-500 transition-colors" aria-label="Share on WhatsApp">
                        <ShareIcon className="h-6 w-6" />
                      </button>
                    </div>
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
                            onSelect={(id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])} 
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