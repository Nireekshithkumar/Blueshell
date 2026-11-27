const SPREADSHEET_ID = '1wl5FXLawJoJLh81PQDXhWhUcEJOW5tM30qyVb3OOuYQ';
const TAB_ID = 0;
const HEADERS = ['Submitted at (IST)', 'Name', 'Phone', 'Email', 'Training (days)', 'Fee (INR)', 'Registration ID'];
const EMAIL_STATUS = 'Client email status';
const FEES = {7: 5000, 15: 10000, 30: 20000};

function doPost(event) {
  let lock;
  try {
    const data = JSON.parse(event.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('REGISTRATION_SHARED_SECRET');
    if (!secret || data.token !== secret) return reply({ok: false, error: 'unauthorized'});
    if (!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(data.id) ||
        !Number.isInteger(data.days) || !Object.prototype.hasOwnProperty.call(FEES, data.days) ||
        ![data.name, data.phone, data.email].every(value => typeof value === 'string' && value.trim()) ||
        !/^[^\s@]+@[^\s@]+$/.test(data.email)) {
      return reply({ok: false, error: 'invalid'});
    }

    lock = LockService.getScriptLock();
    lock.waitLock(20000);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(TAB_ID);
    const last = sheet.getLastRow();
    const {headers, columns, statusColumn} = registrationLayout(sheet, last);
    let savedRow;
    if (last > 1) {
      const previous = sheet.getRange(2, columns[6] + 1, last - 1, 1)
        .createTextFinder(data.id).matchEntireCell(true).findNext();
      if (previous) {
        const values = sheet.getRange(previous.getRow(), 1, 1, headers.length).getValues()[0];
        const same = [data.name, data.phone, data.email, data.days].every((v, i) => values[columns[i + 1]] === v);
        if (!same) return reply({ok: false, error: 'conflict'});
        savedRow = previous.getRow();
      }
    }

    if (!savedRow) {
      const timestamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
      const fields = [timestamp, data.name, data.phone, data.email, data.days, FEES[data.days], data.id];
      const rows = last ? [] : [headers];
      rows.push(headers.map((_, col) => col === statusColumn ? 'Pending' : fields[columns.indexOf(col)] ?? ''));
      const tab = "'" + sheet.getName().replace(/'/g, "''") + "'";
      // RAW keeps phones and user-supplied strings literal. The reply identifies the committed row.
      const write = Sheets.Spreadsheets.Values.append({values: rows}, SPREADSHEET_ID, tab + '!A1', {
        valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS'
      });
      const range = write.updates.updatedRange;
      savedRow = Number(range.match(/(\d+)$/)[1]);
    }

    // The append (or matching receipt) is confirmed. Notification errors cannot undo that fact.
    try {
      const registrationRow = savedRow;
      notifyRow(sheet, registrationRow, columns, statusColumn, false);
    } catch (err) {
      console.error('Notification pending or requiring review: ' + err.name);
    }
    return reply({ok: true, id: data.id});
  } catch (err) {
    console.error('Registration failed: ' + err.name);
    return reply({ok: false, error: 'unavailable'});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function registrationLayout(sheet, last) {
  const headers = last ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0] : HEADERS.concat(EMAIL_STATUS);
  const columns = HEADERS.map(label => headers.indexOf(label));
  if (columns.some((col, i) => col < 0 || headers.lastIndexOf(HEADERS[i]) !== col)) {
    throw new Error('Check the registration headings in tab 0');
  }
  let statusColumn = headers.indexOf(EMAIL_STATUS);
  if (statusColumn < 0) {
    statusColumn = headers.length;
    if (statusColumn === sheet.getMaxColumns()) sheet.insertColumnAfter(statusColumn);
    sheet.getRange(1, statusColumn + 1).setValue(EMAIL_STATUS);
    SpreadsheetApp.flush();
    headers.push(EMAIL_STATUS);
  }
  if (headers.lastIndexOf(EMAIL_STATUS) !== statusColumn) throw new Error('Duplicate notification heading');
  return {headers, columns, statusColumn};
}

function notifyRow(sheet, rowNumber, columns, statusColumn, retryFailed) {
  const cell = sheet.getRange(rowNumber, statusColumn + 1);
  const status = String(cell.getValue());
  if (status !== 'Pending' && !(retryFailed && status.startsWith('Failed'))) return;
  const values = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const details = columns.map((column, i) => HEADERS[i] + ': ' + values[column]).join('\n');
  const recipient = PropertiesService.getScriptProperties().getProperty('REGISTRATION_RECIPIENT') || 'blueshells.team@gmail.com';
  // A crash after dispatch must not cause a second email on a browser retry.
  cell.setValue('Sending');
  SpreadsheetApp.flush();
  try {
    MailApp.sendEmail({to: recipient, subject: 'BlueShells training registration ' + values[columns[6]], body: details});
  } catch (err) {
    cell.setValue('Failed - check recipient, authorization or mail quota');
    SpreadsheetApp.flush();
    return;
  }
  cell.setValue('Sent');
  SpreadsheetApp.flush();
}

// Editor/time-trigger entry point. Never exposed through the public HTTP handler.
function retryClientNotifications() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(TAB_ID);
    const last = sheet.getLastRow();
    if (last < 2) return;
    const {columns, statusColumn} = registrationLayout(sheet, last);
    const states = sheet.getRange(2, statusColumn + 1, last - 1, 1).getDisplayValues();
    let attempts = 0;
    for (let i = 0; i < states.length && attempts < 10; i++) {
      if (states[i][0] === 'Pending' || states[i][0].startsWith('Failed')) {
        notifyRow(sheet, i + 2, columns, statusColumn, true);
        attempts++;
      }
    }
  } finally { lock.releaseLock(); }
}

function checkRegistrationSetup() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(TAB_ID);
  if (!sheet) throw new Error('Tab ID 0 is missing');
  Sheets.Spreadsheets.get(SPREADSHEET_ID, {fields: 'spreadsheetId'});
  console.log('Target tab located. Remaining daily mail quota: ' + MailApp.getRemainingDailyQuota());
}
