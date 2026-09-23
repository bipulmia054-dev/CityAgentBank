// One immutable snapshot at a time: older requests cannot overwrite newer edits.
export function createAutosave({ initial, write, validate = () => '', notify = () => {}, delay = 800 }) {
  let latest = JSON.stringify(initial), saved = latest, timer, running, error = '', disposed = false;
  const dirty = () => latest !== saved;
  const report = (state, message = '') => { if (!disposed) notify({ state, message }); };
  async function flush() {
    clearTimeout(timer);
    if (running) { await running; return flush(); }
    if (!dirty()) return true;
    const snapshot = latest, value = JSON.parse(snapshot), invalid = validate(value);
    if (invalid) { error = invalid; report('error', invalid); return false; }
    error = '';
    report('saving');
    let ok = false;
    running = (async () => {
      try { await write(value); saved = snapshot; ok = true; }
      catch (e) { error = e.message || 'Save হয়নি'; report('error', error); }
    })();
    await running; running = null;
    if (!ok) return false;
    if (dirty()) return flush();
    report('saved'); return true;
  }
  return {
    change(value) {
      const next = JSON.stringify(value);
      if (next === latest) return;
      latest = next; clearTimeout(timer);
      report(dirty() ? 'pending' : 'saved');
      if (dirty()) timer = setTimeout(flush, delay);
    },
    flush, dirty,
    dispose() { disposed = true; clearTimeout(timer); },
  };
}
