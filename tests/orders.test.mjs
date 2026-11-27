import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import orders from '../netlify/functions/orders.mjs'

test('orders writer creates the tab once and returns the saved receipt on identical retries', () => {
  const rows = []
  let created = 0, failWrite = true
  const sheet = {
    getLastRow:()=>rows.length, getLastColumn:()=>rows[0].length,
    getRange(r,c){ return {
      getDisplayValues:()=>[rows[r-1]], getValues:()=>[rows[r-1]],
      createTextFinder:id=>({matchEntireCell:()=>({findNext:()=>{
        const i=rows.findIndex(row=>row[c-1]===id);return i<0?null:{getRow:()=>i+1}
      }})})
    }}
  }
  const book = {getId:()=>'sheet',getSheetByName:n=>n==='Orders' && created ? sheet:null,
    insertSheet(n){ assert.equal(n,'Orders');created++;return sheet }}
  const context = vm.createContext({
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>k==='ORDERS_SHARED_SECRET'?'secret':'sheet'})},
    LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},
    SpreadsheetApp:{openById:()=>book,flush(){}},
    Utilities:{formatDate:(_,zone)=>{assert.equal(zone,'Asia/Kolkata');return '2026-11-27 12:34:56'}},
    Sheets:{Spreadsheets:{Values:{update(body,id,range,opts){
      assert.equal(range,"'Orders'!A1");assert.equal(opts.valueInputOption,'RAW')
      if(failWrite)throw Error('unavailable');rows.push(...body.values)
    }}}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}
  })
  vm.runInContext(readFileSync(new URL('../google-apps-script/orders/Code.gs',import.meta.url),'utf8'),context)
  const fields={token:'secret',service:'Whole system setup',name:'Test',phone:'+91 00123',email:'a@example.org',requirements:'=test',id:'12345678-1234-4123-8123-123456789abc'}
  const post=(overrides={})=>context.doPost({postData:{contents:JSON.stringify({...fields,...overrides})}})
  assert.equal(post({service:'Other'}).ok,false);assert.equal(post({token:'wrong'}).ok,false);assert.equal(created,0)
  assert.equal(post().ok,false);assert.equal(rows.length,0)
  failWrite=false;assert.deepEqual(post(),{ok:true,id:fields.id});assert.deepEqual(post(),{ok:true,id:fields.id})
  assert.equal(post({name:'Different'}).error,'conflict')
  assert.equal(rows.length,2);assert.equal(created,1)
  assert.deepEqual([...rows[1]],[fields.id,'2026-11-27 12:34:56',fields.service,fields.name,fields.phone,fields.email,'=test','New'])
})

test('orders function uses the orders deployment and verifies its confirmation',async t=>{
  process.env.ORDERS_SCRIPT_URL='https://script.google.com/macros/s/example/exec'
  process.env.ORDERS_SHARED_SECRET='private'
  const req=()=>new Request('https://example.org/.netlify/functions/orders',{method:'POST',body:JSON.stringify({id:'receipt',token:'client'})})
  const send=t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,process.env.ORDERS_SCRIPT_URL);assert.equal(JSON.parse(options.body).token,'private')
    return Response.json({ok:true,id:'receipt'})
  })
  assert.deepEqual(await (await orders(req())).json(),{ok:true,id:'receipt'})
  send.mock.mockImplementation(async()=>Response.json({ok:true,id:'wrong'}))
  assert.equal((await orders(req())).status,502)
})

test('misconfigured orders never reach Google and logs omit private values', async t => {
  const url = 'https://script.google.com/macros/s/private-deployment/exec'
  const secret = 'private-test-secret'
  const logs = []
  t.mock.method(console, 'error', message => logs.push(message))
  const send = t.mock.method(globalThis, 'fetch', async target => {
    assert.equal(target, url)
    return Response.json({ok:true,id:'test'})
  })
  const request = () => new Request('https://example.org/.netlify/functions/orders', {
    method:'POST', body:JSON.stringify({id:'test'})
  })
  for (const [endpoint,token,setting] of [
    ['',secret,'ORDERS_SCRIPT_URL'], [url+'/dev',secret,'ORDERS_SCRIPT_URL'], [url,'','ORDERS_SHARED_SECRET']
  ]) {
    process.env.ORDERS_SCRIPT_URL = endpoint
    process.env.ORDERS_SHARED_SECRET = token
    const response = await orders(request())
    assert.equal(response.status,503)
    assert.deepEqual(await response.json(), {ok:false,error:'configuration'})
    assert.ok(logs.at(-1).includes(setting))
  }
  assert.equal(send.mock.callCount(),0)
  assert.ok(!logs.join().includes(secret) && !logs.join().includes('private-deployment'))
  process.env.ORDERS_SCRIPT_URL = ' '+url+' '
  process.env.ORDERS_SHARED_SECRET = secret
  assert.equal((await orders(request())).status,200)
})
