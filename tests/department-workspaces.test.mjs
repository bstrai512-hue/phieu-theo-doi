import { slugFromName, checkedWorkspaceSlug, withWorkspaceSlugs, resolveWorkspace } from '../src/services/workspaces/model.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalWorkspaces } from '../src/services/workspaces/local.ts';
import { createLocalTreatmentServices } from '../src/services/treatment-records/local-storage.ts';
import { rememberedWorkspace, rememberWorkspace, selectWorkspace } from '../src/services/workspaces/selection.ts';
import { createTreatmentWorkspace } from '../src/services/treatment-records/workspace.ts';
import { defaults } from '../src/services/treatment-records/model.ts';
import * as workspaces from '../convex/workspaces.ts';
import * as records from '../convex/records.ts';
import * as templates from '../convex/templates.ts';
import * as care from '../convex/careDefaults.ts';

function localSetup() {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  return { entries, storage, directory: createLocalWorkspaces(() => storage), services: key => createLocalTreatmentServices(() => storage, key) };
}
const careLibrary = name => ({ templates: [{id:'care',name,values:{pulse:'80'}}], defaultTemplateId:'care' });

test('local directory normalizes names, rejects duplicates and survives reopening', async () => {
  const { directory, storage } = localSetup();
  assert.deepEqual(await directory.list(), [{key:'shared',name:'Dữ liệu chung',slug:'du-lieu-chung'}]);
  const item = await directory.create('  Khoa   Nội  ');
  assert.equal(item.name, 'Khoa Nội');
  assert.match(item.key, /^[a-f0-9]{64}$/);
  await assert.rejects(directory.create('khoa nội'), /đã tồn tại/);
  await assert.rejects(directory.create('Dữ liệu chung'), /đã tồn tại/);
  await assert.rejects(directory.create(' '), /100/);
  assert.deepEqual((await createLocalWorkspaces(() => storage).list())[1], item);
});

test('department records, both template libraries and revisions stay isolated; shared legacy bytes remain intact', async () => {
  const { entries, directory, services } = localSetup();
  const legacy = JSON.stringify(defaults()); entries.set('treatment-quick-entry-v1', legacy);
  const oldCare = JSON.stringify({revision:3,value:{values:{pulse:'70'}}}); entries.set('care-defaults-v1',oldCare);
  const a = await directory.create('Khoa A'); const b = await directory.create('Khoa B');
  const sa = services(a.key), sb = services(b.key);
  assert.deepEqual(await sa.records.list(), []); assert.deepEqual(await sa.templates.list(), []);
  assert.deepEqual((await sa.careDefaults.get()).value.templates, []);
  const {patient,forms} = defaults();
  const record = await sa.records.create({patient:{...patient,name:'Bệnh nhân A'},forms});
  await sa.templates.create({id:'same',kind:'orders',text:'Mẫu A',group:'A'});
  await sa.careDefaults.update(careLibrary('A'),0);
  await assert.rejects(sb.records.get(record.id),/Không tìm thấy/);
  await assert.rejects(sb.records.update(record.id,{patient}),/Không tìm thấy/);
  await assert.rejects(sb.records.remove(record.id),/Không tìm thấy/);
  assert.deepEqual(await sb.records.list(),[]); assert.deepEqual(await sb.templates.list(),[]);
  assert.equal((await sb.careDefaults.get()).revision,0);
  await sb.templates.create({id:'same',kind:'orders',text:'Mẫu B',group:'B'});
  await sb.careDefaults.update(careLibrary('B'),0);
  assert.equal((await services(a.key).records.get(record.id)).patient.name,'Bệnh nhân A');
  assert.equal((await sa.templates.list())[0].text,'Mẫu A');
  assert.equal((await sa.careDefaults.get()).value.templates[0].name,'A');
  assert.equal((await sb.careDefaults.get()).value.templates[0].name,'B');
  assert.equal(entries.get('treatment-quick-entry-v1'),legacy); assert.equal(entries.get('care-defaults-v1'),oldCare);
  assert.equal((await services('shared').careDefaults.get()).revision,3);
});

test('first visit requires a choice, saved selection is validated and local/cloud preferences do not mix', async () => {
  const { directory, storage } = localSetup(); const a = await directory.create('Khoa A'); const items = await directory.list();
  assert.equal(rememberedWorkspace(storage,'local',items),null);
  rememberWorkspace(storage,'local',a);
  assert.deepEqual(rememberedWorkspace(storage,'local',items),a);
  assert.equal(rememberedWorkspace(storage,'cloud',items),null);
  assert.equal(rememberedWorkspace(storage,'local',items.filter(x=>x.key!==a.key)),null);
});

test('switch waits for saving, blocks failures and does not change selection when remembering fails', async () => {
  const next = {key:'a'.repeat(64),name:'A'}; const events = [];
  assert.equal(await selectWorkspace(next,async()=>false,()=>events.push('remember'),()=>events.push('activate')),false);
  assert.deepEqual(events,[]);
  await assert.rejects(selectWorkspace(next,async()=>{throw Error('save failed')},()=>events.push('remember'),()=>events.push('activate')),/save failed/);
  await assert.rejects(selectWorkspace(next,async()=>true,()=>{throw Error('quota')},()=>events.push('activate')),/quota/);
  assert.deepEqual(events,[]);
  let complete;
  const pending=selectWorkspace(next,()=>new Promise(resolve=>{complete=resolve}),()=>events.push('remember'),()=>events.push('activate'));
  assert.deepEqual(events,[]); complete(true); assert.equal(await pending,true);
  assert.deepEqual(events,['remember','activate']);
});

test('prepareToLeave saves the latest draft and retains it on failed saves', async () => {
  const {services,directory}=localSetup(); const a=await directory.create('A'); const service=services(a.key);
  const editor=createTreatmentWorkspace(service); await editor.load();
  editor.setData(data=>({...data,patient:{...data.patient,name:'Draft A'}}));
  assert.equal(await editor.prepareToLeave(),true);
  assert.equal((await service.records.list())[0].patientName,'Draft A');
  service.records.update=async()=>{throw Error('offline')};
  editor.setData(data=>({...data,patient:{...data.patient,name:'Latest A'}}));
  assert.equal(await editor.prepareToLeave(),false);
  assert.equal(editor.getSnapshot().data.patient.name,'Latest A'); assert.equal(editor.getSnapshot().saved,false);
  editor.dispose();
});

// Exercise the actual backend handlers with an in-memory QueryCtx/MutationCtx.
function backend() {
  const tables=new Map(); let sequence=0;
  const table=name=>{if(!tables.has(name))tables.set(name,[]);return tables.get(name)};
  const find=id=>[...tables.values()].flat().find(item=>item._id===id);
  const db={
    query(name){let conditions=[];const query={
      withIndex(_index,build){const builder={eq(field,value){conditions.push([field,value]);return builder}};build(builder);return query},
      async collect(){return structuredClone(table(name).filter(item=>conditions.every(([field,value])=>item[field]===value)))},
      async unique(){const values=await query.collect();assert.ok(values.length<=1);return values[0]??null},
    };return query},
    async insert(name,value){const id=`id-${++sequence}`;table(name).push({...structuredClone(value),_id:id,_creationTime:sequence});return id},
    async patch(id,patch){Object.assign(find(id),structuredClone(patch))},
    async replace(id,value){const item=find(id);for(const key of Object.keys(item))if(!key.startsWith('_'))delete item[key];Object.assign(item,structuredClone(value))},
    async delete(id){for(const [name,items] of tables)tables.set(name,items.filter(item=>item._id!==id))},
  };
  return {db};
}
const run=(fn,ctx,args={})=>fn._handler(ctx,args);

test('Convex directory preserves shared data, rejects duplicate names and creates empty departments',async()=>{
 const ctx=backend();const a='a'.repeat(64);
 await run(workspaces.initialize,ctx,{workspaceKey:'shared',records:[{id:'legacy',patient:defaults().patient,forms:defaults().forms}],templates:[]});
 await run(workspaces.create,ctx,{workspaceKey:a,name:'  Khoa Nội '});
 assert.deepEqual(await run(workspaces.list,ctx),[{key:'shared',name:'Dữ liệu chung',slug:'du-lieu-chung'},{key:a,name:'Khoa Nội',slug:'khoa-noi'}]);
 await assert.rejects(run(workspaces.create,ctx,{workspaceKey:'b'.repeat(64),name:'khoa nội'}),/đã tồn tại/);
 assert.equal((await run(workspaces.snapshot,ctx,{workspaceKey:'shared'})).records[0].id,'legacy');
 assert.deepEqual((await run(workspaces.snapshot,ctx,{workspaceKey:a})).records,[]);
 await assert.rejects(run(workspaces.initialize,ctx,{workspaceKey:'c'.repeat(64),records:[],templates:[]}),/Không tìm thấy Khoa/);
});

test('Convex operations and snapshots isolate records, templates, care libraries and workspace revisions',async()=>{
 const ctx=backend(), a='a'.repeat(64), b='b'.repeat(64);
 for(const [key,name] of [[a,'A'],[b,'B']])await run(workspaces.create,ctx,{workspaceKey:key,name});
 const input={patient:defaults().patient,forms:defaults().forms};
 await run(records.create,ctx,{workspaceKey:a,record:{id:'record',...input}});
 await run(templates.create,ctx,{workspaceKey:a,template:{id:'template',kind:'orders',text:'Mẫu A',group:'A'}});
 await run(care.update,ctx,{workspaceKey:a,expectedRevision:0,value:careLibrary('A')});
 assert.deepEqual(await run(records.list,ctx,{workspaceKey:b}),[]);
 for(const action of ['get','update','remove'])await assert.rejects(run(records[action],ctx,{workspaceKey:b,id:'record',input:{patient:input.patient}}),/Không tìm thấy/);
 for(const action of ['update','remove'])await assert.rejects(run(templates[action],ctx,{workspaceKey:b,id:'template',input:{text:'B'}}),/Không tìm thấy/);
 assert.deepEqual(await run(templates.list,ctx,{workspaceKey:b}),[]);
 assert.equal((await run(care.get,ctx,{workspaceKey:b})).revision,0);
 await run(records.create,ctx,{workspaceKey:b,record:{id:'record',...input}});
 await run(templates.create,ctx,{workspaceKey:b,template:{id:'template',kind:'orders',text:'Mẫu B',group:'B'}});
 await run(care.update,ctx,{workspaceKey:b,expectedRevision:0,value:careLibrary('B')});
 await run(records.saveEditor,ctx,{workspaceKey:a,id:'record',input:{...input,patient:{...input.patient,name:'A updated'}},templates:[],expectedRevision:2});
 assert.equal((await run(workspaces.snapshot,ctx,{workspaceKey:a})).records[0].patient.name,'A updated');
 const snapshotB=await run(workspaces.snapshot,ctx,{workspaceKey:b});
 assert.equal(snapshotB.records[0].patient.name,'');assert.equal(snapshotB.templates[0].text,'Mẫu B');assert.equal(snapshotB.revision,2);
 assert.equal((await run(care.get,ctx,{workspaceKey:b})).value.templates[0].name,'B');
 // Legacy consolidation cannot absorb named department data.
 await run(workspaces.shareExisting,ctx);
 assert.equal((await run(records.get,ctx,{workspaceKey:b,id:'record'})).id,'record');
 await run(templates.replaceAll,ctx,{workspaceKey:a,templates:[]});
 assert.equal((await run(templates.list,ctx,{workspaceKey:b}))[0].text,'Mẫu B');
});

test('department settings isolate storage, validate options and reject stale saves', async () => {
  const {directory, storage} = localSetup();
  const a = await directory.create('A'), b = await directory.create('B');
  const value = {department:' Nội hô hấp ', rooms:['101','102'], beds:['A1','A2']};
  const initial = await directory.settings(a.key);
  assert.equal(initial.value.beds.length,55);
  const saved = await directory.saveSettings(a.key,value,0);
  assert.equal(saved.value.department,'Nội hô hấp');
  assert.deepEqual((await directory.settings(b.key)).value.rooms,[]);
  assert.deepEqual(await createLocalWorkspaces(()=>storage).settings(a.key),saved);
  await assert.rejects(directory.saveSettings(a.key,value,0),/đã thay đổi/);
  await assert.rejects(directory.saveSettings(a.key,{...value,rooms:['101',' 101 ']},1),/trùng/);
  await assert.rejects(directory.settings('f'.repeat(64)),/Không tìm thấy/);
});

test('Convex settings preserve episode revisions, isolate scopes and guard concurrent updates', async()=>{
  const ctx=backend(), a='a'.repeat(64), b='b'.repeat(64);
  for(const [key,name] of [[a,'A'],[b,'B']]) await run(workspaces.create,ctx,{workspaceKey:key,name});
  const value={department:'Nội',rooms:['101'],beds:['A1']};
  const next=await run(workspaces.saveSettings,ctx,{workspaceKey:a,value,revision:0});
  assert.deepEqual(await run(workspaces.settings,ctx,{workspaceKey:a}),next);
  assert.deepEqual((await run(workspaces.settings,ctx,{workspaceKey:b})).value.rooms,[]);
  assert.equal((await run(workspaces.snapshot,ctx,{workspaceKey:a})).revision,0);
  await assert.rejects(run(workspaces.saveSettings,ctx,{workspaceKey:a,value,revision:0}),/đã thay đổi/);
  await assert.rejects(run(workspaces.saveSettings,ctx,{workspaceKey:b,value:{...value,beds:['a','A']},revision:0}),/trùng/);
});

test('department defaults apply only to new drafts and do not rewrite saved patients',async()=>{
 const {services}=localSetup();const adapter=services('shared');let department='Nội';
 const ws=createTreatmentWorkspace(adapter,()=>department);
 try {
   await ws.load();await ws.newDraft();
   assert.equal(ws.getSnapshot().data.patient.department,'Nội');
   assert.equal(ws.getSnapshot().saved,true);
   ws.setData(data=>({...data,patient:{...data.patient,name:'Giả lập',department:'Khoa cũ'}}));
   await ws.flush();const id=ws.getSnapshot().recordId;
   department='Ngoại';await ws.newDraft();
   assert.equal(ws.getSnapshot().data.patient.department,'Ngoại');
   await ws.selectRecord(id);
   assert.equal(ws.getSnapshot().data.patient.department,'Khoa cũ');
 } finally {ws.dispose()}
});

test('unnamed cleanup deletes only legacy scopes without records or configuration; dry run preserves all',async()=>{
 const ctx=backend();
 const empty='1'.repeat(64), seeded='2'.repeat(64), occupied='3'.repeat(64), configured='4'.repeat(64), named='5'.repeat(64);
 for(const key of ['shared',empty,seeded,occupied,configured,named])await ctx.db.insert('workspaces',{key,...(key===named?{name:'Nội'}:{}),...(key===configured?{settings:{department:'A',rooms:[],beds:[]}}:{})});
 await ctx.db.insert('templates',{workspaceKey:seeded,id:'seed',kind:'orders',text:'Mẫu cũ'});
 await ctx.db.insert('treatmentRecords',{workspaceKey:occupied,id:'patient'});
 const audit=await run(workspaces.cleanupUnnamed,ctx,{apply:false});
 assert.equal(audit.length,4);assert.ok(audit.every(item=>!item.deleted));
 assert.equal((await ctx.db.query('workspaces').collect()).length,6);
 const result=await run(workspaces.cleanupUnnamed,ctx,{apply:true});
 assert.deepEqual(result.filter(item=>item.deleted).map(item=>item.key),[empty,seeded]);
 assert.deepEqual((await ctx.db.query('workspaces').collect()).map(item=>item.key),['shared',occupied,configured,named]);
 assert.equal((await ctx.db.query('treatmentRecords').collect()).length,1);
 assert.equal((await ctx.db.query('templates').collect()).length,0);
});

test('rename keeps the department key and data, rejects duplicates and stale names', async()=>{
 const {directory,services}=localSetup();const a=await directory.create('Nội'),b=await directory.create('Ngoại');
 const record=await services(a.key).records.create({patient:defaults().patient,forms:defaults().forms});
 assert.deepEqual(await directory.rename(a.key,'  Nội   hô hấp ','Nội'),{key:a.key,name:'Nội hô hấp',slug:'noi'});
 assert.equal((await services(a.key).records.get(record.id)).id,record.id);
 await assert.rejects(directory.rename(a.key,b.name,'Nội hô hấp'),/đã tồn tại/);
 await assert.rejects(directory.rename(a.key,'Tên mới','Nội'),/đã thay đổi/);
 await assert.rejects(directory.rename('shared','Chung','Dữ liệu chung'),/Không thể/);
 const ctx=backend();await run(workspaces.create,ctx,{workspaceKey:a.key,name:'Nội'});await run(workspaces.create,ctx,{workspaceKey:b.key,name:'Ngoại'});
 const before=await run(workspaces.snapshot,ctx,{workspaceKey:a.key});
 assert.deepEqual(await run(workspaces.rename,ctx,{workspaceKey:a.key,name:'Nội hô hấp',expectedName:'Nội'}),{key:a.key,name:'Nội hô hấp',slug:'noi'});
 assert.deepEqual(await run(workspaces.snapshot,ctx,{workspaceKey:a.key}),before);
 await assert.rejects(run(workspaces.rename,ctx,{workspaceKey:a.key,name:'ngoại',expectedName:'Nội hô hấp'}),/đã tồn tại/);
 await assert.rejects(run(workspaces.rename,ctx,{workspaceKey:a.key,name:'Mới',expectedName:'Nội'}),/đã thay đổi/);
 await assert.rejects(run(workspaces.rename,ctx,{workspaceKey:'shared',name:'Chung',expectedName:'Dữ liệu chung'}),/Không thể/);
});

test('slugs transliterate Vietnamese, resolve old keys and reject unsafe or ambiguous segments',()=>{
 assert.equal(slugFromName('  Nội Hô Hấp / Đặc biệt  '),'noi-ho-hap-dac-biet');
 const items=withWorkspaceSlugs([{key:'shared',name:'Dữ liệu chung',slug:'du-lieu-chung'},{key:'a'.repeat(64),name:'Nội'},{key:'b'.repeat(64),name:'Noi'}]);
 assert.deepEqual(items.map(item=>item.slug),['du-lieu-chung','noi','noi-2']);
 assert.equal(resolveWorkspace(items,'noi-2')?.key,'b'.repeat(64));
 assert.equal(resolveWorkspace(items,'a'.repeat(64))?.slug,'noi');
 assert.equal(resolveWorkspace(items,'missing'),undefined);
 for(const value of ['', 'Nội', 'a/b','shared','a'.repeat(64),'-noi','noi--ho','a'.repeat(81)]) assert.throws(()=>checkedWorkspaceSlug(value));
});

test('local slug migration persists once; edits preserve data and reject collisions and stale writes',async()=>{
 const {directory,storage,entries}=localSetup();const key='a'.repeat(64);
 entries.set('department-workspaces-v1',JSON.stringify([{key,name:'Nội hô hấp'}]));
 let item=(await directory.list())[1];assert.equal(item.slug,'noi-ho-hap');
 item=await directory.rename(key,'Tên mới',item.name);assert.equal(item.slug,'noi-ho-hap');
 item=await directory.changeSlug(key,'ho-hap','noi-ho-hap');assert.equal(item.key,key);
 assert.equal((await createLocalWorkspaces(()=>storage).list())[1].slug,'ho-hap');
 await assert.rejects(directory.changeSlug(key,'du-lieu-chung','ho-hap'),/sử dụng/);
 await assert.rejects(directory.changeSlug(key,'moi','noi-ho-hap'),/đã thay đổi/);
});

test('Convex slug backfill is idempotent; creates avoid collisions and slug changes preserve snapshots',async()=>{
 const ctx=backend(),a='a'.repeat(64),b='b'.repeat(64);
 await ctx.db.insert('workspaces',{key:a,name:'Nội hô hấp',revision:0});
 assert.equal((await run(workspaces.backfillSlugs,ctx)).updated,1);
 assert.equal((await run(workspaces.backfillSlugs,ctx)).updated,0);
 const created=await run(workspaces.create,ctx,{workspaceKey:b,name:'Noi ho hap'});assert.equal(created.slug,'noi-ho-hap-2');
 const before=await run(workspaces.snapshot,ctx,{workspaceKey:a});
 const next=await run(workspaces.changeSlug,ctx,{workspaceKey:a,slug:'ho-hap',expectedSlug:'noi-ho-hap'});assert.equal(next.key,a);
 assert.deepEqual(await run(workspaces.snapshot,ctx,{workspaceKey:a}),before);
 await assert.rejects(run(workspaces.changeSlug,ctx,{workspaceKey:a,slug:created.slug,expectedSlug:'ho-hap'}),/sử dụng/);
 await assert.rejects(run(workspaces.changeSlug,ctx,{workspaceKey:a,slug:'new',expectedSlug:'noi-ho-hap'}),/đã thay đổi/);
});
