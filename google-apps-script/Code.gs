const SPREADSHEET_ID = '1wl5FXLawJoJLh81PQDXhWhUcEJOW5tM30qyVb3OOuYQ';
const TAB_ID = 0;
const HEADERS = ['Submitted at (IST)', 'Name', 'Phone', 'Email', 'Training (days)', 'Fee (INR)', 'Registration ID'];
const FEES = {7: 5000, 15: 10000, 30: 20000};

function doPost(event) {
  let lock;
  try {
    const data = JSON.parse(event.postData.contents);
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
    const headers = last ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0] : HEADERS;
    const columns = HEADERS.map(label => headers.indexOf(label));
    if (columns.some((col, i) => col < 0 || headers.lastIndexOf(HEADERS[i]) !== col)) {
      return reply({ok: false, error: 'headers'});
    }

    if (last > 1) {
      const previous = sheet.getRange(2, columns[6] + 1, last - 1, 1)
        .createTextFinder(data.id).matchEntireCell(true).findNext();
      if (previous) {
        const values = sheet.getRange(previous.getRow(), 1, 1, headers.length).getValues()[0];
        const same = [data.name, data.phone, data.email, data.days].every((v, i) => values[columns[i + 1]] === v);
        return reply(same ? {ok: true, id: data.id} : {ok: false, error: 'conflict'});
      }
    }

    const timestamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
    const fields = [timestamp, data.name, data.phone, data.email, data.days, FEES[data.days], data.id];
    const rows = last ? [] : [row(HEADERS)];
    rows.push(row(headers.map((_, col) => fields[columns.indexOf(col)])));
    // An atomic append stores the receipt and data together, including the headings on first use.
    Sheets.Spreadsheets.batchUpdate({requests: [{appendCells: {sheetId: TAB_ID, rows, fields: 'userEnteredValue'}}]}, SPREADSHEET_ID);
    return reply({ok: true, id: data.id});
  } catch (err) {
    console.error('Registration failed: ' + err.name);
    return reply({ok: false, error: 'unavailable'});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function row(values) {
  return {values: values.map(value => value === undefined ? {} : {
    userEnteredValue: typeof value === 'number' ? {numberValue: value} : {stringValue: value}
  })};
}

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
