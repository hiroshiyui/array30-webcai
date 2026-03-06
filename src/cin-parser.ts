/** Key name mapping from the %keyname section */
export interface KeyNameMap {
  [key: string]: string;
}

/** Parsed .cin table */
export interface CinTable {
  ename: string;
  cname: string;
  keyNames: KeyNameMap;
  charDefs: Map<string, string[]>;
}

/** Parse a .cin format string into a CinTable */
export function parseCin(text: string): CinTable {
  const lines = text.split('\n');
  const table: CinTable = {
    ename: '',
    cname: '',
    keyNames: {},
    charDefs: new Map(),
  };

  let section: 'none' | 'keyname' | 'chardef' = 'none';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('%ename ')) {
      table.ename = line.slice(7).trim();
      continue;
    }
    if (line.startsWith('%cname ')) {
      table.cname = line.slice(7).trim();
      continue;
    }
    if (line === '%keyname begin') { section = 'keyname'; continue; }
    if (line === '%keyname end') { section = 'none'; continue; }
    if (line === '%chardef begin') { section = 'chardef'; continue; }
    if (line === '%chardef end') { section = 'none'; continue; }

    if (section === 'keyname') {
      const parts = line.split(/\s+/, 2);
      if (parts.length === 2) {
        table.keyNames[parts[0]] = parts[1];
      }
    } else if (section === 'chardef') {
      const tabIdx = line.indexOf('\t');
      if (tabIdx === -1) continue;
      const key = line.slice(0, tabIdx);
      const value = line.slice(tabIdx + 1);
      const existing = table.charDefs.get(key);
      if (existing) {
        existing.push(value);
      } else {
        table.charDefs.set(key, [value]);
      }
    }
  }

  return table;
}
