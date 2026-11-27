const ORDER_HEADERS = ['Enquiry ID', 'Submitted at (IST)', 'Service', 'Name', 'Phone', 'Email', 'Requirements', 'Status'];

function doPost(event) {
  let lock;
  try {
    const input = JSON.parse(event.postData.contents);
    const settings = PropertiesService.getScriptProperties();
    const secret = settings.getProperty('ORDERS_SHARED_SECRET');
    if (!secret || input.token !== secret) return reply({ok:false, error:'unauthorized'});

    if (typeof input.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id) ||
        input.service !== 'Whole system setup' || !validText(input.name,200) || !validText(input.phone,60) ||
        !validText(input.email,320) || !/^[^\s@]+@[^\s@]+$/.test(input.email) ||
        typeof input.requirements !== 'string' || input.requirements.length > 4000) {
      return reply({ok:false,error:'invalid'});
    }
    const fields = [input.service,input.name,input.phone,input.email,input.requirements].map(s => s.trim());
    lock = LockService.getScriptLock();
    lock.waitLock(20000);
    const book = SpreadsheetApp.openById(settings.getProperty('ORDERS_SPREADSHEET_ID'));
    const sheet = book.getSheetByName('Orders') || book.insertSheet('Orders');
    const last = sheet.getLastRow();
    const headers = last ? sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0] : ORDER_HEADERS;
    const cols = ORDER_HEADERS.map(h => headers.indexOf(h));
    if (cols.some((col,i) => col < 0 || headers.lastIndexOf(ORDER_HEADERS[i]) !== col)) throw Error('Orders headings');
    if (last > 1) {
      const match = sheet.getRange(2,cols[0]+1,last-1,1).createTextFinder(input.id).matchEntireCell(true).findNext();
      if (match) {
        const row = sheet.getRange(match.getRow(),1,1,headers.length).getValues()[0];
        const same = fields.every((v,i) => row[cols[i+2]] === v);
        return reply(same ? {ok:true,id:input.id} : {ok:false,error:'conflict'});
      }
    }
    const values = [input.id,Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd HH:mm:ss'),...fields,'New'];
    const rows = last ? [] : [headers];
    rows.push(headers.map((_,i) => values[cols.indexOf(i)] ?? ''));
    SpreadsheetApp.flush();
    Sheets.Spreadsheets.Values.update({values:rows},book.getId(),"'Orders'!A"+(last+1),{valueInputOption:'RAW'});
    return reply({ok:true,id:input.id});
  } catch (err) {
    console.error('Orders write failed: '+err.name);
    return reply({ok:false,error:'unavailable'});
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

function validText(value,max) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
function reply(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

function checkOrdersSetup() {
  const settings = PropertiesService.getScriptProperties();
  if (!settings.getProperty('ORDERS_SHARED_SECRET')) throw Error('Set ORDERS_SHARED_SECRET');
  const book = SpreadsheetApp.openById(settings.getProperty('ORDERS_SPREADSHEET_ID'));
  Sheets.Spreadsheets.get(book.getId(), {fields:'spreadsheetId'});
  console.log('Orders spreadsheet accessible');
}
