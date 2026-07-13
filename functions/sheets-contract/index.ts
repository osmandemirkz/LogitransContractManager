import { corsHeaders } from '../_shared/cors.ts';

const SPREADSHEET_ID = '1tVIljUf6_DG-x0LlkXrqDlsDszcgFH8eWV9VddBCOx4';

// Embedded service account (anlasmakayit)
const EMBEDDED_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'gen-lang-client-0465296472',
  private_key_id: 'ac071b9fa14bd9e94d13dbe17b242ff8ba0198f4',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZiySeBtbzzdmF\nBzP/pdQi8y7/Ej4LMuTXp45mkahL7HGeIuIZ0U65WxggAQkiME8E1Ak+uTQNqPva\nWNpY2Smb7Iao25m4G1gUBahv+jwW+NdQEzic3SwYbyFRXpt95vZOrDqpdip7kLrN\nP9FxMxOn/EgEhu3tY3Et7jjwQBqCPEcm4rFaZyQGQwPIhOxIY49yI+ybBEyaiWuJ\niQezhITcaFm1/Pml6288WovIizG0Mm9d6G8JWFAhkvcAwpvU99D4gwASFA1TesGy\nPXL1NNrsfKqlLJL1UP1VXo+p71tecoSVz6808RfPsfwIq+AdEOu3aacXMIyVgZ9E\n1tw2pvn1AgMBAAECggEAElyyC8uof543tsiPnUvGPuf3ZszHo2LZmZFZTfOL+NKd\nmXs4yfSWmEMl42eq+XGJ7e6m1B5GVEPX9EttLLQx1KkviZe1nyphshjzKXZ99XNu\nGyJwNB9gDjTtI0Tgy4z/686SSgUBG3pxJgt1toAY7+Q1wPoRoaiz4CxcLn0+r5DW\nfbU56WFeaxh4TCFX1fGFMG2+fppw0PZQsl0NH1fDGmoM7gPYuOoWodtWWG0MV9DV\nO/UJF3GD/MGlmOiyC5mIvtD/GKrMvm7Z8IyJRn5l0KZATrYWQc98UH8+2Yhpuiet\na0fIGBg64rE4Aaz0iw+14sn/12HZfy/b4dYLEXcH0QKBgQD+ilJQs1viq4I44aWK\n1jnzFiv2/7cNdqkULfbZOI7Tpy3OlzQBsouTeTHNwCssjn2EFJyMd0ivKvrPK2Mj\n0cyafXgk4XVjoY1bGgSp6u3EzpCh1UW548fHTRsGASB8R5EwT1bpO5V/EfikhkZ7\n9nlcmEPPHV0EwAwswMlwAqh9MQKBgQDayoIeSNTdTW4cGqPScb262+h1sFyCuPel\nhmnK9raYIOTR8jfCZ/s8VgxCnpOD8c8cPD66ad0G0h7vtPbtoGg/3teJoN9jHxT2\niUxVnuR28MNMyPzvipa66N9u67nWZcEgrUr5pkXzbVJ6pqsfW3b+P1nsgXt39Wut\n7ZrpU+MIBQKBgAmC/7p2SVu6Dv6zJ+19PeMgk/oB6kQ9h+nyIcRSQbwVBjgvHEln\n86FKKRtIMBTVKkmSP5tcJcIt9/tf4q+G+n9XavLt3eYgNlkOKthyp/nvwiXaA2YD\n5gZDklvyFNWwEvPcMyI6EMcT09fKEL43IqfcJMSLk1tHFe1iMuTVpJgxAoGBAMV/\nnhtmVTh7h9S4u37hC4qcredmzut1up7hiagcMtF6h/N4eZr0sBZT+nc8nB6z7egn\n/dvaahmZHTH2ohv4+4IET34+CMh6KzsszwpPBx7S0QkEOUamTM/mHKMNCNEfQ0mT\nBKX80RIfch+jSb9hmjWBzFOwwlqT4KK9ZGQRRFRdAoGBALLSv+5lw5pen5D05uza\nBN/ZxJEwSSo6m6FyhJ1GDYV6dlPpmqVzSftWazBnums5NzCX6dJ9wuWFdwKzKR5S\nqtfHLp6zto9OPvdrumdfNjBGnw/Gwh8UKP0ANJUlQwGFYbKsHTDKbTM9jpSRVnju\nlHR+ZukyOkkRIjKjvM5a4QAU\n-----END PRIVATE KEY-----\n',
  client_email: 'anlasmakayit@gen-lang-client-0465296472.iam.gserviceaccount.com',
  client_id: '115472963878687163830',
  token_uri: 'https://oauth2.googleapis.com/token',
};
const SHEET_NAME = 'YAZILIM2026';
const DRIVE_FOLDER_ID = '17-Ta1mJkkAJmVC9q67_Pmba5x4pPUVin';

// Base64url encode
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlFromUint8Array(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getGoogleAccessToken(serviceAccount: any, scope = 'https://www.googleapis.com/auth/spreadsheets'): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const pemKey = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64urlFromUint8Array(new Uint8Array(signature));
  const jwt = `${signingInput}.${encodedSignature}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    throw new Error(`Google token error: ${err}`);
  }

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

const HEADER_ROW = [
  'Anlaşma Durumu', 'Название закачика', 'Logitrans компании', 'Сектор',
  'Менеджер Logitrans', 'Email', 'Мобильный телефон', 'Городской телефон',
  'БИН/ИИН', 'Страна', 'Город', 'Адрес', 'Директор', 'Валюта', 'Сумма договора',
  'ИИК(Счета)', 'Название банка', 'БИК(Swift)',
  'Номер договора', 'Дата договора', 'Файл', 'Ссылка на файл', 'Дата добавления'
];

async function ensureHeaderRow(accessToken: string, spreadsheetId = SPREADSHEET_ID, sheetName = SHEET_NAME): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A1:W1`);
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return;
  const data = await resp.json();
  const firstRow: string[] = data.values?.[0] || [];
  if (firstRow[0] === 'Anlaşma Durumu') return;
  const insertRange = encodeURIComponent(`${sheetName}!A1:W1`);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${insertRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADER_ROW] }),
    }
  );
}

async function findRowByContractNumber(accessToken: string, contractNumber: string, spreadsheetId = SPREADSHEET_ID, sheetName = SHEET_NAME): Promise<number | null> {
  if (!contractNumber || contractNumber.trim() === '') return null;
  const range = encodeURIComponent(`${sheetName}!S:S`);
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  const rows: string[][] = data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i] || rows[i].length === 0) continue;
    const cellValue = (rows[i][0] || '').toString().trim();
    if (cellValue === contractNumber.trim()) {
      return i + 1;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const serviceAccount = serviceAccountJson ? JSON.parse(serviceAccountJson) : EMBEDDED_SERVICE_ACCOUNT;
    const body = await req.json();
    const { action } = body;
    console.log('[sheets-contract] Received action:', action, '| contractNumber:', body.contractNumber || '(empty)');

    // ─── UPLOAD_DRIVE: Upload PDF to Google Drive ──────────────────────────
    if (action === 'upload_drive') {
      const { pdfBase64, fileName } = body;

      if (!pdfBase64 || !fileName) {
        return new Response(
          JSON.stringify({ error: 'pdfBase64 and fileName are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use full drive scope — drive.file is insufficient for Shared Drives / service accounts
      const driveToken = await getGoogleAccessToken(
        serviceAccount,
        'https://www.googleapis.com/auth/drive'
      );

      // ── Step 1: Detect if the target folder is inside a Shared Drive ──────
      let sharedDriveId: string | null = null;
      try {
        const folderResp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${DRIVE_FOLDER_ID}?fields=id,driveId,teamDriveId&supportsAllDrives=true&supportsTeamDrives=true`,
          { headers: { Authorization: `Bearer ${driveToken}` } }
        );
        if (folderResp.ok) {
          const folderMeta = await folderResp.json();
          sharedDriveId = folderMeta.driveId || folderMeta.teamDriveId || null;
          console.log('[Drive] Folder driveId:', sharedDriveId || '(personal drive)');
        }
      } catch (e) {
        console.warn('[Drive] Could not detect folder driveId:', e);
      }

      // ── Step 2: Decode base64 → raw PDF bytes ─────────────────────────────
      let pdfBytes: Uint8Array;
      try {
        const binaryStr = atob(pdfBase64);
        pdfBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          pdfBytes[i] = binaryStr.charCodeAt(i);
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid base64 PDF data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ── Step 3: Build multipart/related body with raw bytes ───────────────
      const boundary = 'logitrans_drive_boundary_9k2m';
      const fileMeta: Record<string, any> = {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [DRIVE_FOLDER_ID],
      };
      // Include driveId in metadata for Shared Drive uploads
      if (sharedDriveId) {
        fileMeta.driveId = sharedDriveId;
      }

      const encoder = new TextEncoder();
      const metaJson = JSON.stringify(fileMeta);
      const metaPart = encoder.encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaJson}\r\n`
      );
      const fileHeader = encoder.encode(
        `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
      );
      const closing = encoder.encode(`\r\n--${boundary}--`);

      const totalLength = metaPart.length + fileHeader.length + pdfBytes.length + closing.length;
      const combined = new Uint8Array(totalLength);
      let off = 0;
      combined.set(metaPart, off);   off += metaPart.length;
      combined.set(fileHeader, off); off += fileHeader.length;
      combined.set(pdfBytes, off);   off += pdfBytes.length;
      combined.set(closing, off);

      // ── Step 4: Upload ────────────────────────────────────────────────────
      let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&supportsTeamDrives=true';
      if (sharedDriveId) {
        uploadUrl += `&driveId=${encodeURIComponent(sharedDriveId)}`;
      }

      const driveResp = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${driveToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
          'Content-Length': String(totalLength),
        },
        body: combined,
      });

      if (!driveResp.ok) {
        const err = await driveResp.text();
        console.error('[Drive] Upload error:', err);
        return new Response(
          JSON.stringify({ error: `Drive upload error: ${err}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const driveData = await driveResp.json();
      const fileId = driveData.id;
      console.log('[Drive] Upload success, fileId:', fileId);

      // ── Step 5: Set public read permission (best-effort, don't fail on error) ─
      try {
        const permParams = sharedDriveId
          ? '?supportsAllDrives=true&supportsTeamDrives=true'
          : '';
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions${permParams}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${driveToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
          }
        );
      } catch (e) {
        console.warn('[Drive] Permission set failed (non-fatal):', e);
      }

      const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
      return new Response(
        JSON.stringify({ success: true, fileId, fileUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Sheets actions, get Sheets access token
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // ─── APPEND: Save new contract row ─────────────────────────────────────
    if (action === 'append') {
      const {
        contractNumber, contractDate, manager, expeditor,
        clientName, country, city, address, director, email,
        mobilePhone, officePhone, bin, sector,
        currency, contractAmount, account, bankName, swift,
        pdfLink, status,
        targetSpreadsheetId, targetSheetName,
      } = body;

      // Use target spreadsheet/sheet if provided, otherwise use main DB
      const activeSpreadsheetId = (targetSpreadsheetId && targetSpreadsheetId.trim())
        ? targetSpreadsheetId.trim()
        : SPREADSHEET_ID;
      const activeSheetName = (targetSheetName && targetSheetName.trim())
        ? targetSheetName.trim()
        : SHEET_NAME;

      // Column U: "clientName Договор № contractNumber от DD.MM.YYYY"
      // Convert ISO date (2026-06-01) to Russian format (01.06.2026)
      const formatDateRu = (d?: string) => {
        if (!d) return '';
        // Already formatted as DD.MM.YYYY
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return d;
        // Convert from YYYY-MM-DD
        const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}.${m[2]}.${m[1]}`;
        return d;
      };
      const fileDesc = contractNumber
        ? `${clientName || ''} Договор № ${contractNumber} от ${formatDateRu(contractDate)}`.trim()
        : '';

      const rowData = [
        status || 'Taslak',
        clientName || '',
        expeditor || '',
        sector || '',
        manager || '',
        email || '',
        mobilePhone || '',
        officePhone || '',
        bin || '',
        country || '',
        city || '',
        address || '',
        director || '',
        currency || '',
        contractAmount || '',
        account || '',
        bankName || '',
        swift || '',
        contractNumber || '',
        contractDate || '',
        fileDesc,
        pdfLink || '',
        new Date().toLocaleString('ru-RU'),
      ];

      await ensureHeaderRow(accessToken, activeSpreadsheetId, activeSheetName);

      const existingRow = await findRowByContractNumber(accessToken, contractNumber, activeSpreadsheetId, activeSheetName);
      let sheetsResp;

      if (existingRow) {
        const range = encodeURIComponent(`${activeSheetName}!A${existingRow}:W${existingRow}`);
        sheetsResp = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${activeSpreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [rowData] }),
          }
        );
      } else {
        const range = encodeURIComponent(`${activeSheetName}!A:W`);
        sheetsResp = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${activeSpreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [rowData] }),
          }
        );
      }

      if (!sheetsResp.ok) {
        const err = await sheetsResp.text();
        return new Response(
          JSON.stringify({ error: `Sheets API error (${activeSpreadsheetId}): ${err}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, updated: !!existingRow, spreadsheetId: activeSpreadsheetId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── DELETE: Remove contract row ───────────────────────────────────────
    if (action === 'delete') {
      const { contractNumber, targetSpreadsheetId, targetSheetName } = body;

      const activeSpreadsheetId = (targetSpreadsheetId && targetSpreadsheetId.trim())
        ? targetSpreadsheetId.trim()
        : SPREADSHEET_ID;
      const activeSheetName = (targetSheetName && targetSheetName.trim())
        ? targetSheetName.trim()
        : SHEET_NAME;

      const sheetInfoResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${activeSpreadsheetId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const sheetInfo = await sheetInfoResp.json();
      const sheetObj = sheetInfo.sheets?.find((s: any) => s.properties?.title === activeSheetName);
      const sheetId = sheetObj?.properties?.sheetId ?? 0;

      const rowIndex = await findRowByContractNumber(accessToken, contractNumber, activeSpreadsheetId, activeSheetName);
      if (!rowIndex) {
        return new Response(
          JSON.stringify({ success: true, message: 'Row not found in sheet' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const deleteResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${activeSpreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            }],
          }),
        }
      );

      if (!deleteResp.ok) {
        const err = await deleteResp.text();
        return new Response(
          JSON.stringify({ error: `Sheets delete error: ${err}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('sheets-contract error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
