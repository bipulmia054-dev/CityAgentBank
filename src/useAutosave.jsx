import React, { useEffect, useRef, useState } from 'react';
import { createAutosave } from './autosave.js';
const active = new Set();
export const hasPendingAutosaves = () => [...active].some(save=>save.dirty());
export const flushAutosaves = async () => (await Promise.all([...active].map(save=>save.flush()))).every(Boolean);

export function useAutosave({ session, value, write, validate }) {
  const controller = useRef(null);
  const [status, setStatus] = useState({state:'saved'});
  useEffect(() => {
    if (session == null) { controller.current = null; return; }
    const instance = createAutosave({initial:value, write, validate, notify:setStatus});
    active.add(instance);
    controller.current = instance; setStatus({state:'saved'});
    const unload = e => { if (instance.dirty()) { e.preventDefault(); e.returnValue = ''; } };
    const retry = () => { if (instance.dirty()) void instance.flush(); };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('online', retry);
    return () => { active.delete(instance); instance.dispose(); window.removeEventListener('beforeunload', unload); window.removeEventListener('online', retry); };
  }, [session]);
  useEffect(() => { controller.current?.change(value); }, [value, session]);
  return {status, flush:() => controller.current?.flush() ?? Promise.resolve(true), dirty:() => controller.current?.dirty() ?? false};
}

export function AutoSaveStatus({save}) {
  const {state,message} = save.status;
  return <div className="autoSaveStatus" role="status" aria-live="polite">
    {state==='error' ? `Auto-save হয়নি: ${message} — এই পেজ বন্ধ করবেন না।` : state==='saving' ? 'Server-এ Auto-save হচ্ছে…' : state==='pending' ? 'পরিবর্তন Auto-save হবে…' : 'সব পরিবর্তন Server-এ Saved'}
    {state==='error' && <button type="button" className="secondary" onClick={()=>save.flush()}>আবার চেষ্টা করুন</button>}
  </div>;
}
