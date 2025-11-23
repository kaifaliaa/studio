import React from 'react';
import { DENOMINATIONS } from '../constants';
import { NoteCounts } from '../types';

interface CurrencyCounterProps {
  value: NoteCounts;
  onChange: (newCounts: NoteCounts) => void;
}

const CurrencyCounter: React.FC<CurrencyCounterProps> = ({ value, onChange }) => {

  const handleCountChange = (denomination: number, count: number) => {
    onChange({ ...value, [denomination]: count });
  };

  return (
    <div className="space-y-3">
      {DENOMINATIONS.map((denom) => {
        const count = value[denom] || 0;
        const total = count * denom;
        return (
          <div key={denom} className="grid grid-cols-[auto,1fr,auto] items-center gap-x-4">
            <label htmlFor={`denom-${denom}`} className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              ₹ {denom === 1 ? '1 Coin' : denom}
            </label>
            <input
              id={`denom-${denom}`}
              type="number"
              value={value[denom] || ''}
              onChange={(e) => handleCountChange(denom, parseInt(e.target.value, 10) || 0)}
              className="w-full px-2 py-1.5 text-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-base text-sm"
              placeholder="0"
            />
            <span className="text-right text-sm sm:text-base text-gray-600 dark:text-gray-400 whitespace-nowrap">
              = ₹{total.toLocaleString('en-IN')}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CurrencyCounter;
