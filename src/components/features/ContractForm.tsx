import React, { useEffect, useState } from 'react';
import { CURRENCIES } from '@/constants/companies';
import { COUNTRIES } from '@/constants/countries';
import { ClientInfo, ContractLanguage } from '@/types/contract';
import { Building2, User, Globe, MapPin, Mail, Phone, DollarSign, Hash, Calendar, Languages } from 'lucide-react';
import { getActiveForwarders, Forwarder } from '@/lib/forwardersApi';

interface Manager {
  id: string;
  name: string;
  companyId?: string;
}

interface ContractFormProps {
  expeditorId: string;
  managerId: string;
  clientInfo: ClientInfo;
  availableManagers?: Manager[];
  languages: ContractLanguage[];
  onExpeditorChange: (id: string) => void;
  onManagerChange: (id: string) => void;
  onClientChange: (field: keyof ClientInfo, value: string) => void;
  onLanguagesChange: (langs: ContractLanguage[]) => void;
}

const LANG_OPTIONS: { key: ContractLanguage; label: string; flag: string }[] = [
  { key: 'ru', label: 'Русский', flag: '🇷🇺' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

/** Red asterisk for required fields */
const Req = () => <span style={{ color: 'hsl(0 70% 60%)', marginLeft: '2px' }}>*</span>;

const ContractForm: React.FC<ContractFormProps> = ({
  expeditorId,
  managerId,
  clientInfo,
  availableManagers = [],
  languages,
  onExpeditorChange,
  onManagerChange,
  onClientChange,
  onLanguagesChange,
}) => {
  const [forwarders, setForwarders] = useState<Forwarder[]>([]);

  useEffect(() => {
    getActiveForwarders()
      .then(list => setForwarders(list))
      .catch(e => console.warn('[ContractForm] forwarders load failed:', e?.message));
  }, []);

  const toggleLanguage = (lang: ContractLanguage) => {
    if (languages.includes(lang)) {
      if (languages.length === 1) return;
      onLanguagesChange(languages.filter(l => l !== lang));
    } else {
      onLanguagesChange([...languages, lang]);
    }
  };

  return (
    <div className="form-panel h-full overflow-y-auto flex flex-col">
      {/* Language selector */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(215 22% 24%)', background: 'hsl(215 28% 15%)' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <Languages size={14} style={{ color: 'hsl(38 92% 50%)' }} />
          <span className="text-xs font-semibold" style={{ color: 'hsl(38 92% 50%)' }}>
            Язык договора / Anlaşma Dili
          </span>
        </div>
        <div className="flex gap-2">
          {LANG_OPTIONS.map(opt => {
            const selected = languages.includes(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => toggleLanguage(opt.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none"
                style={{
                  background: selected ? 'hsl(38 92% 50% / 0.18)' : 'hsl(215 25% 20%)',
                  border: `1.5px solid ${selected ? 'hsl(38 92% 50%)' : 'hsl(215 22% 30%)'}`,
                  color: selected ? 'hsl(38 92% 65%)' : 'hsl(215 15% 52%)',
                }}
                title={languages.length === 1 && selected ? 'En az bir dil seçili olmalı' : undefined}
              >
                <span>{opt.flag}</span>
                <span>{opt.label}</span>
                {selected && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'hsl(38 92% 50%)' }} />}
              </button>
            );
          })}
        </div>
        {languages.length > 1 && (
          <p className="text-xs mt-2" style={{ color: 'hsl(215 15% 45%)' }}>
            {languages.length === 2 ? '2 sütunlu / 2-колонный' : '3 sütunlu / 3-колонный'} görünüm
          </p>
        )}
      </div>

      {/* Header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'hsl(215 22% 24%)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} style={{ color: 'hsl(38 92% 50%)' }} />
          <span className="font-semibold text-sm" style={{ color: 'hsl(210 20% 92%)' }}>
            Договор / Contract Form
          </span>
        </div>
        <p className="text-xs" style={{ color: 'hsl(215 15% 55%)' }}>
          Заполните форму — договор обновится автоматически
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Expeditor section */}
        <div>
          <label className="form-label-style block mb-1.5">
            Logitrans компании / Logitrans Şirketi
          </label>
          <select
            className="form-select-style"
            value={expeditorId}
            onChange={e => onExpeditorChange(e.target.value)}
          >
            {forwarders.length > 0
              ? forwarders.map(f => (
                  <option key={f.id} value={f.id}>{f.companyNameRu}</option>
                ))
              : (
                // Fallback while loading
                <option value={expeditorId}>{expeditorId}</option>
              )
            }
          </select>
        </div>

        <div>
          <label className="form-label-style block mb-1.5">
            Менеджер Logitrans / Logitrans Temsilcisi
          </label>
          <select
            className="form-select-style"
            value={managerId}
            onChange={e => onManagerChange(e.target.value)}
          >
            <option value="">— Выберите менеджера —</option>
            {availableManagers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="section-divider" />

        {/* Client Info */}
        <div className="rounded-lg p-3" style={{ background: 'hsl(215 25% 20%)', border: '1px solid hsl(215 22% 28%)' }}>
          <div className="flex items-center gap-2 mb-3">
            <User size={14} style={{ color: 'hsl(38 92% 50%)' }} />
            <span className="text-xs font-semibold" style={{ color: 'hsl(38 92% 50%)' }}>
              Müşteri Bilgileri / Информация о клиенте
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="form-label-style block mb-1">Название закачика / Müşteri Firma Adı<Req /></label>
              <input type="text" className="form-input-style" placeholder="Müşteri Firma Adı" value={clientInfo.companyName} onChange={e => onClientChange('companyName', e.target.value)} />
            </div>

            <div>
              <label className="form-label-style block mb-1 flex items-center gap-1"><Globe size={10} /> Страна / Ülke<Req /></label>
              <select className="form-select-style" value={clientInfo.country} onChange={e => onClientChange('country', e.target.value)}>
                <option value="">— Firmanın Bulunduğu Ülke —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label-style block mb-1 flex items-center gap-1"><MapPin size={10} /> Город / Şehir<Req /></label>
              <input type="text" className="form-input-style" placeholder="Firmanın Bulunduğu Şehir" value={clientInfo.city} onChange={e => onClientChange('city', e.target.value)} />
            </div>

            <div>
              <label className="form-label-style block mb-1">Адрес / Adres<Req /></label>
              <input type="text" className="form-input-style" placeholder="Firma Adresi" value={clientInfo.address} onChange={e => onClientChange('address', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label-style block mb-1">Сектор / Sektör</label>
                <input type="text" className="form-input-style" placeholder="Faliyet Alanı" value={clientInfo.sector} onChange={e => onClientChange('sector', e.target.value)} />
              </div>
              <div>
                <label className="form-label-style block mb-1 flex items-center gap-1"><Mail size={10} /> Email<Req /></label>
                <input type="email" className="form-input-style" placeholder="Email" value={clientInfo.email} onChange={e => onClientChange('email', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label-style block mb-1 flex items-center gap-1"><Phone size={10} /> Моб. телефон<Req /></label>
                <input type="tel" className="form-input-style" placeholder="+" value={clientInfo.mobilePhone} onChange={e => onClientChange('mobilePhone', e.target.value)} />
              </div>
              <div>
                <label className="form-label-style block mb-1">Гор. телефон</label>
                <input type="tel" className="form-input-style" placeholder="Sabit Telefon" value={clientInfo.officePhone} onChange={e => onClientChange('officePhone', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label-style block mb-1 flex items-center gap-1"><DollarSign size={10} /> Валюта<Req /></label>
                <select className="form-select-style" value={clientInfo.currency} onChange={e => onClientChange('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-style block mb-1 flex items-center gap-1"><DollarSign size={10} /> Сумма договора / Tutar<Req /></label>
                <input type="text" className="form-input-style" placeholder="1 000 000" value={clientInfo.contractAmount || ''} onChange={e => onClientChange('contractAmount', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label-style block mb-1">ИИК(Счета) / Hesap №<Req /></label>
              <input type="text" className="form-input-style" placeholder="Hesap №" value={clientInfo.account} onChange={e => onClientChange('account', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label-style block mb-1">БИН / ИИН<Req /></label>
                <input type="text" className="form-input-style" placeholder="Vergi Numarası" value={clientInfo.bin} onChange={e => onClientChange('bin', e.target.value)} />
              </div>
              <div>
                <label className="form-label-style block mb-1">Директор / Firma Müdürü<Req /></label>
                <input type="text" className="form-input-style" placeholder="Firma Müdürü" value={clientInfo.director} onChange={e => onClientChange('director', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label-style block mb-1">Название банка<Req /></label>
                <input type="text" className="form-input-style" placeholder="Banka Adı" value={clientInfo.bankName} onChange={e => onClientChange('bankName', e.target.value)} />
              </div>
              <div>
                <label className="form-label-style block mb-1">БИК(Swift)<Req /></label>
                <input type="text" className="form-input-style" placeholder="Swift" value={clientInfo.swift} onChange={e => onClientChange('swift', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label-style block mb-1 flex items-center gap-1"><Calendar size={10} /> Дата Договора<Req /></label>
                <input type="date" className="form-input-style" value={clientInfo.contractDate} onChange={e => onClientChange('contractDate', e.target.value)} />
              </div>
              <div>
                <label className="form-label-style block mb-1 flex items-center gap-1"><Hash size={10} /> Номер договора №<Req /></label>
                <input type="text" className="form-input-style" placeholder="Anlaşma Numarası" value={clientInfo.contractNumber} onChange={e => onClientChange('contractNumber', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractForm;
