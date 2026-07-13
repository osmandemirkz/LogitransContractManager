import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Google yetkilendirmesi işleniyor...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const state = params.get('state');

      if (error) {
        setStatus('error');
        setMessage(`Google yetkilendirme reddedildi: ${error}`);
        setTimeout(() => navigate('/admin'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Yetkilendirme kodu bulunamadı');
        setTimeout(() => navigate('/admin'), 3000);
        return;
      }

      // Verify state matches what we stored
      const expectedState = sessionStorage.getItem('oauth_state');
      if (state && expectedState && state !== expectedState) {
        setStatus('error');
        setMessage('Güvenlik doğrulaması başarısız (state mismatch)');
        setTimeout(() => navigate('/admin'), 3000);
        return;
      }

      try {
        setMessage('Token alınıyor...');
        const redirectUri = window.location.origin + '/oauth/callback';

        const { data, error: fnError } = await supabase.functions.invoke('sheets-contract', {
          body: {
            action: 'exchange_oauth_code',
            code,
            redirectUri,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        setStatus('success');
        setMessage(`Bağlantı başarılı! Hesap: ${data.email || 'bilinmiyor'}`);
        sessionStorage.removeItem('oauth_state');
        setTimeout(() => navigate('/admin'), 2500);
      } catch (err: any) {
        console.error('[OAuthCallback] Error:', err);
        setStatus('error');
        setMessage(`Hata: ${err.message}`);
        setTimeout(() => navigate('/admin'), 4000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'hsl(215 28% 12%)' }}
    >
      <div
        className="rounded-2xl p-8 text-center space-y-4 max-w-md w-full mx-4"
        style={{
          background: 'hsl(215 28% 17%)',
          border: `1px solid ${status === 'success' ? 'hsl(142 60% 35%)' : status === 'error' ? 'hsl(0 60% 35%)' : 'hsl(215 22% 28%)'}`,
        }}
      >
        <div className="flex justify-center">
          {status === 'loading' && (
            <Loader2 size={48} className="animate-spin" style={{ color: 'hsl(38 92% 50%)' }} />
          )}
          {status === 'success' && (
            <CheckCircle2 size={48} style={{ color: 'hsl(142 70% 55%)' }} />
          )}
          {status === 'error' && (
            <XCircle size={48} style={{ color: 'hsl(0 70% 60%)' }} />
          )}
        </div>

        <div>
          <h2
            className="text-base font-semibold mb-2"
            style={{
              color:
                status === 'success'
                  ? 'hsl(142 70% 65%)'
                  : status === 'error'
                  ? 'hsl(0 70% 70%)'
                  : 'hsl(210 20% 88%)',
            }}
          >
            {status === 'loading'
              ? 'Bağlanıyor...'
              : status === 'success'
              ? 'Google Drive Bağlandı!'
              : 'Bağlantı Hatası'}
          </h2>
          <p className="text-sm" style={{ color: 'hsl(215 15% 58%)' }}>
            {message}
          </p>
        </div>

        <p className="text-xs" style={{ color: 'hsl(215 15% 42%)' }}>
          {status === 'loading'
            ? 'Lütfen bekleyin...'
            : 'Admin paneline yönlendiriliyorsunuz...'}
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
