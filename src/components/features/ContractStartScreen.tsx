import React from 'react';
import { FileText, Plus, ChevronRight } from 'lucide-react';

export type { Draft } from '@/lib/draftsApi';
export { getDrafts, saveDraft, deleteDraft, updateDraftStatus } from '@/lib/draftsApi';

interface ContractStartScreenProps {
  onNew: () => void;
  onLoadDraft: (draft: import('@/lib/draftsApi').Draft) => void;
}

const ContractStartScreen: React.FC<ContractStartScreenProps> = ({ onNew }) => {
  return (
    <div
      className="min-h-full flex flex-col items-center justify-center py-10 px-4"
      style={{ background: 'hsl(215 28% 13%)' }}
    >
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'hsl(38 92% 50%)' }}
          >
            <FileText size={32} style={{ color: 'hsl(215 28% 12%)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'hsl(210 20% 94%)' }}>
            Договоры
          </h1>
          <p className="text-sm" style={{ color: 'hsl(215 15% 52%)' }}>
            Создайте новый договор или откройте архив
          </p>
        </div>

        {/* New Contract Button */}
        <button
          onClick={onNew}
          className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:opacity-90 active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, hsl(220 70% 32%), hsl(220 70% 26%))',
            border: '1px solid hsl(220 60% 40%)',
          }}
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
            style={{ background: 'hsl(38 92% 50%)' }}
          >
            <Plus size={24} style={{ color: 'hsl(215 28% 12%)' }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base" style={{ color: 'white' }}>
              Новый договор
            </p>
            <p className="text-sm" style={{ color: 'hsl(220 40% 72%)' }}>
              Создать договор с нуля
            </p>
          </div>
          <ChevronRight size={20} style={{ color: 'hsl(220 40% 60%)' }} />
        </button>
      </div>
    </div>
  );
};


export default ContractStartScreen;
