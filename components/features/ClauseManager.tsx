import React, { useState } from 'react';
import { FlatClauseItem } from '@/types/contract';
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Link2, Link2Off, GripVertical } from 'lucide-react';

interface ClauseManagerProps {
  clauses: FlatClauseItem[];
  onToggle: (id: string) => void;
  onUpdateContent: (id: string, field: 'contentRu' | 'contentEn' | 'contentTr', value: string) => void;
  onAddClause: () => void;
  onRemove: (id: string) => void;
}

const ClauseManager: React.FC<ClauseManagerProps> = ({
  clauses,
  onToggle,
  onUpdateContent,
  onAddClause,
  onRemove,
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'ru' | 'en' | 'tr'>('ru');
  const [syncAllLangs, setSyncAllLangs] = useState(false);

  const langTabs = [
    { key: 'ru' as const, label: '🇷🇺 RU' },
    { key: 'en' as const, label: '🇬🇧 EN' },
    { key: 'tr' as const, label: '🇹🇷 TR' },
  ];

  const getContentField = (lang: 'ru' | 'en' | 'tr'): 'contentRu' | 'contentEn' | 'contentTr' => {
    if (lang === 'ru') return 'contentRu';
    if (lang === 'en') return 'contentEn';
    return 'contentTr';
  };

  const handleContentChange = (id: string, value: string) => {
    if (syncAllLangs) {
      (['contentRu', 'contentEn', 'contentTr'] as const).forEach(f => onUpdateContent(id, f, value));
    } else {
      onUpdateContent(id, getContentField(activeLang), value);
    }
  };

  const activeCount = clauses.filter(c => c.isActive).length;

  return (
    <div className="form-panel h-full overflow-y-auto flex flex-col">
      <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(215 22% 24%)' }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'hsl(210 20% 92%)' }}>Пункты договора</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 55%)' }}>
            {activeCount}/{clauses.length} активных
          </p>
        </div>
        <button
          onClick={onAddClause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
          style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}
        >
          <Plus size={13} /> Добавить
        </button>
      </div>

      {/* Language tabs */}
      <div className="px-4 pt-3 pb-1 space-y-2">
        <div className="flex gap-1.5 items-center">
          {langTabs.map(lt => (
            <button
              key={lt.key}
              onClick={() => setActiveLang(lt.key)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: activeLang === lt.key ? 'hsl(38 92% 50% / 0.18)' : 'hsl(215 25% 20%)',
                border: `1px solid ${activeLang === lt.key ? 'hsl(38 92% 50%)' : 'hsl(215 22% 30%)'}`,
                color: activeLang === lt.key ? 'hsl(38 92% 65%)' : 'hsl(215 15% 52%)',
                opacity: syncAllLangs ? 0.5 : 1,
              }}
              disabled={syncAllLangs}
            >
              {lt.label}
            </button>
          ))}
          <span className="flex-1" />
          <button
            onClick={() => setSyncAllLangs(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
            style={{
              background: syncAllLangs ? 'hsl(200 70% 30% / 0.25)' : 'hsl(215 25% 20%)',
              border: `1px solid ${syncAllLangs ? 'hsl(200 70% 55%)' : 'hsl(215 22% 30%)'}`,
              color: syncAllLangs ? 'hsl(200 80% 70%)' : 'hsl(215 15% 52%)',
            }}
          >
            {syncAllLangs ? <Link2 size={11} /> : <Link2Off size={11} />}
            <span className="hidden sm:inline">{syncAllLangs ? 'Senkron: Açık' : 'Senkron'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {clauses.map((clause) => {
          const isExpanded = expanded === clause.id;
          const isHeader = clause.isHeader === true;
          const preview = clause[getContentField(activeLang)] || '';

          return (
            <div
              key={clause.id}
              className="rounded-lg overflow-hidden transition-all"
              style={{
                background: isHeader
                  ? (clause.isActive ? 'hsl(215 28% 22%)' : 'hsl(215 28% 16%)')
                  : (clause.isActive ? 'hsl(215 25% 20%)' : 'hsl(215 25% 15%)'),
                border: `1px solid ${isHeader
                  ? (clause.isActive ? 'hsl(38 92% 50% / 0.3)' : 'hsl(215 22% 24%)')
                  : (clause.isActive ? 'hsl(215 22% 30%)' : 'hsl(215 22% 22%)')}`,
                opacity: clause.isActive ? 1 : 0.55,
              }}
            >
              <div className="flex items-center gap-2 p-2.5">
                {/* Number badge */}
                <div
                  className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded min-w-[32px] text-center"
                  style={{
                    background: isHeader ? 'hsl(38 92% 50% / 0.15)' : 'hsl(215 25% 28%)',
                    color: isHeader ? 'hsl(38 92% 55%)' : 'hsl(215 15% 65%)',
                    fontSize: '10px',
                  }}
                >
                  {clause.itemNumber}
                </div>

                {/* Content preview */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs truncate"
                    style={{
                      color: isHeader ? 'hsl(38 92% 65%)' : 'hsl(210 20% 82%)',
                      fontWeight: isHeader ? 600 : 400,
                    }}
                  >
                    {preview.slice(0, 70).replace(/\n/g, ' ') || <em style={{ color: 'hsl(215 15% 40%)' }}>Boş</em>}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onToggle(clause.id)}
                    className="p-1 rounded transition-colors"
                    style={{ color: clause.isActive ? 'hsl(38 92% 50%)' : 'hsl(215 15% 45%)' }}
                    title={clause.isActive ? 'Devre dışı bırak' : 'Etkinleştir'}
                  >
                    {clause.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button
                    onClick={() => setExpanded(prev => prev === clause.id ? null : clause.id)}
                    className="p-1 rounded transition-colors"
                    style={{ color: 'hsl(215 15% 55%)' }}
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <button
                    onClick={() => onRemove(clause.id)}
                    className="p-1 rounded transition-colors hover:text-red-400"
                    style={{ color: 'hsl(215 15% 45%)' }}
                    title="Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="px-3 pb-3" style={{ borderTop: '1px solid hsl(215 22% 26%)' }}>
                  <div className="pt-2">
                    <label className="form-label-style block mb-1">
                      {activeLang === 'ru' ? '🇷🇺 Rusça' : activeLang === 'en' ? '🇬🇧 İngilizce' : '🇹🇷 Türkçe'}
                    </label>
                    <textarea
                      className="form-input-style resize-none"
                      rows={isHeader ? 2 : 6}
                      value={clause[getContentField(activeLang)] || ''}
                      onChange={e => handleContentChange(clause.id, e.target.value)}
                      style={{ fontSize: '11px', lineHeight: '1.5' }}
                    />
                  </div>
                  {!isHeader && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(['ru', 'en', 'tr'] as const).filter(l => l !== activeLang).map(l => (
                        <div key={l} className="col-span-1">
                          <label className="form-label-style block mb-0.5 text-xs">
                            {l === 'ru' ? '🇷🇺 RU' : l === 'en' ? '🇬🇧 EN' : '🇹🇷 TR'}
                          </label>
                          <textarea
                            className="form-input-style resize-none"
                            rows={3}
                            value={clause[getContentField(l)] || ''}
                            onChange={e => onUpdateContent(clause.id, getContentField(l), e.target.value)}
                            style={{ fontSize: '10px', lineHeight: '1.4' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClauseManager;
