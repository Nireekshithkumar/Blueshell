import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

const source = readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8')
const data = {id:'12345678-1234-4123-8000-123456789abc', name:'=Test', phone:'+91 00123456', email:'test@example.org', days:7,token:'test-secret'}

function backend() {
  const rows = [], emails = []
  const faults = { write:false, mail:false }
  const sheet = {
    getName: () => 'Training', getLastRow: () => rows.length,
    getLastColumn: () => rows[0]?.length ?? 0, getMaxColumns: () => 26,
    getRange(r,c,n=1,w=1) {
      const values = () => rows.slice(r-1,r-1+n).map(row => Array.from({length:w}, (_,i) => row[c-1+i] ?? ''))
      return {
        getValues:values, getDisplayValues:() => values().map(row=>row.map(String)),
        getValue:() => rows[r-1][c-1], setValue:v => {rows[r-1][c-1]=v},
        createTextFinder:id => ({matchEntireCell:() => ({findNext:() => {
          const idx=rows.findIndex((row,i)=>i>=r-1 && row[c-1]===id)
          return idx<0 ? null : {getRow:()=>idx+1}
        }})})
      }
    }
  }
  const context = vm.createContext({
    LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},
    SpreadsheetApp:{openById:()=>({getSheetById:id=>{assert.equal(id,0);return sheet}}),flush(){}},
    Sheets:{Spreadsheets:{Values:{append(body,id,range,options){
      assert.equal(options.valueInputOption,'RAW')
      if(faults.write) throw Error('write unavailable')
      rows.push(...body.values)
      return {updates:{updatedRange:"'Training'!A1:H"+rows.length}}
    }}}},
    Utilities:{formatDate:(_,zone)=>{assert.equal(zone,'Asia/Kolkata');return '2026-11-27 15:30:00'}},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>key === 'REGISTRATION_SHARED_SECRET' ? 'test-secret' : 'owner@example.org'})},
    MailApp:{sendEmail(message){
      assert.equal(rows.length,2)
      assert.equal(rows[1][7],'Sending')
      if(faults.mail) throw Error('quota')
      emails.push(message)
    }},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},
  })
  vm.runInContext(source,context)
  return {rows,emails,faults,post:(payload=data)=>context.doPost({postData:{contents:JSON.stringify(payload)}}), retry:()=>context.retryClientNotifications()}
}

test('a confirmed write precedes email; repeated receipt has one row and one dispatch',()=>{
  const b=backend()
  assert.deepEqual(b.post(),{ok:true,id:data.id})
  assert.deepEqual([...b.rows[1]],['2026-11-27 15:30:00','=Test','+91 00123456','test@example.org',7,5000,data.id,'Sent'])
  assert.equal(b.emails[0].to,'owner@example.org')
  assert.ok(b.emails[0].body.includes(data.phone))
  assert.ok(b.post().ok); b.retry()
  assert.equal(b.post({...data,days:15}).ok,false)
  assert.equal(b.rows.length,2); assert.equal(b.emails.length,1)
})

test('uncommitted write cannot notify; failed mail can retry on the existing row',()=>{
  const b=backend();b.faults.write=true
  assert.equal(b.post().ok,false)
  assert.equal(b.rows.length,0);assert.equal(b.emails.length,0)
  b.faults.write=false;b.faults.mail=true
  assert.ok(b.post().ok); assert.match(b.rows[1][7],/^Failed/)
  b.faults.mail=false;b.retry();b.retry()
  assert.equal(b.rows.length,2);assert.equal(b.emails.length,1);assert.equal(b.rows[1][7],'Sent')
})

test('legacy receipts are preserved and do not trigger a historical email blast',()=>{
  const b=backend();b.post()
  b.rows.forEach(row=>row.pop());b.emails.length=0
  assert.ok(b.post().ok);b.retry()
  assert.equal(b.rows[0][7],'Client email status');assert.equal(b.emails.length,0)
  b.rows[1][7]='Pending';b.retry()
  assert.equal(b.emails.length,1);assert.equal(b.rows.length,2)
})
test('Vercel forwards privately, confirms a matching receipt, and rejects unconfirmed upstream responses', async t=>{
  const {default:{fetch:register}}=await import('../api/register.js')
  process.env.REGISTRATION_SCRIPT_URL='https://script.google.com/macros/s/test/exec'
  process.env.REGISTRATION_SHARED_SECRET='server-token'
  const request=()=>new Request('https://example.org/api/register',{method:'POST',body:JSON.stringify(data)})
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,process.env.REGISTRATION_SCRIPT_URL)
    assert.deepEqual(JSON.parse(options.body), {...data, token:'server-token'})
    return Response.json({ok:true,id:data.id})
  })
  assert.deepEqual(await (await register(request())).json(),{ok:true,id:data.id})
  fetch.mock.mockImplementation(async()=>Response.json({ok:true,id:'other'}))
  assert.equal((await register(request())).status,502)
  fetch.mock.mockImplementation(async()=>new Response('<html>Google sign in</html>'))
  assert.equal((await register(request())).status,502)
  delete process.env.REGISTRATION_SHARED_SECRET
  assert.equal((await register(request())).status,503)
})
