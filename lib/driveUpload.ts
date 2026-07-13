/**
 * Google Drive upload using browser-based OAuth 2.0
 * (Google Identity Services — token model, no server quota needed)
 */

const DRIVE_FOLDER_ID = '17-Ta1mJkkAJmVC9q67_Pmba5x4pPUVin';
const CLIENT_ID = '1019352546267-lmq4odt6sdr44gb4f18hsh7i1ltfdd19.apps.googleusercontent.com';

let tokenClient: any = null;
let cachedToken: string | null = null;

/** Dynamically load Google Identity Services script */
function loadGIS(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

/** Request (or reuse) an OAuth access token with drive.file scope */
async function getAccessToken(): Promise<string> {
  await loadGIS();

  return new Promise((resolve, reject) => {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(`OAuth error: ${response.error} — ${response.error_description || ''}`));
          return;
        }
        cachedToken = response.access_token;
        resolve(response.access_token);
      },
    });

    // If we already have a token, try silent refresh first (no UI prompt)
    tokenClient.requestAccessToken({ prompt: cachedToken ? '' : 'select_account' });
  });
}

/**
 * Upload a PDF blob to the Logitrans Google Drive folder.
 * Returns the shareable view URL.
 */
export async function uploadToDrive(
  file: Blob,
  fileName: string,
): Promise<string> {
  const accessToken = await getAccessToken();

  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
    parents: [DRIVE_FOLDER_ID],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  form.append('file', file, fileName);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    // If token expired, clear cache and retry once
    if (response.status === 401) {
      cachedToken = null;
      return uploadToDrive(file, fileName);
    }
    throw new Error(`Drive upload failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const fileId: string = data.id;

  // Make file readable by anyone with the link (best-effort)
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      },
    );
  } catch {
    // Non-fatal: file is still uploaded, just may not be publicly accessible
  }

  return `https://drive.google.com/file/d/${fileId}/view`;
}
