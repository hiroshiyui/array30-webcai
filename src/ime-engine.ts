import { CinTable } from './cin-parser';

export class ImeEngine {
  private mainTable: CinTable | null = null;
  private shortcodeTable: CinTable | null = null;
  private specialTable: CinTable | null = null;

  private _input = '';
  private _candidates: string[] = [];
  private _committed = '';

  get input(): string { return this._input; }
  get candidates(): string[] { return this._candidates; }
  get committed(): string { return this._committed; }

  /** Key label for the current input sequence */
  get inputDisplay(): string {
    if (!this.mainTable) return this._input;
    return this._input
      .split('')
      .map(k => this.mainTable!.keyNames[k] ?? k)
      .join('');
  }

  setTables(main: CinTable, shortcode: CinTable, special: CinTable): void {
    this.mainTable = main;
    this.shortcodeTable = shortcode;
    this.specialTable = special;
  }

  /** Valid keys for Array30 input */
  private readonly validKeys = new Set(
    'abcdefghijklmnopqrstuvwxyz.,;/'.split('')
  );

  /** Handle a key press. Returns true if the key was consumed. */
  handleKey(key: string): boolean {
    const k = key.toLowerCase();

    // Digit selects a candidate (1-9 map to index 0-8, 0 maps to index 9)
    if (/^[0-9]$/.test(k) && this._candidates.length > 0) {
      const idx = k === '0' ? 9 : parseInt(k) - 1;
      if (idx < this._candidates.length) {
        this._committed = this._candidates[idx];
        this._input = '';
        this._candidates = [];
        return true;
      }
    }

    // Space commits the first candidate
    if (k === ' ') {
      if (this._candidates.length > 0) {
        this._committed = this._candidates[0];
        this._input = '';
        this._candidates = [];
        return true;
      }
      if (this._input.length > 0) {
        // No candidates — clear input
        this._input = '';
        this._candidates = [];
        return true;
      }
      return false;
    }

    // Escape clears
    if (k === 'escape') {
      if (this._input.length > 0 || this._candidates.length > 0) {
        this._input = '';
        this._candidates = [];
        return true;
      }
      return false;
    }

    // Backspace
    if (k === 'backspace') {
      if (this._input.length > 0) {
        this._input = this._input.slice(0, -1);
        this.lookup();
        return true;
      }
      return false;
    }

    // Valid array30 key
    if (this.validKeys.has(k)) {
      this._committed = '';
      this._input += k;
      this.lookup();
      return true;
    }

    return false;
  }

  /** Look up candidates from all tables */
  private lookup(): void {
    this._candidates = [];
    if (!this._input) return;

    // Priority: special > shortcode > main
    const seen = new Set<string>();
    const addCandidates = (table: CinTable | null) => {
      if (!table) return;
      const chars = table.charDefs.get(this._input);
      if (chars) {
        for (const c of chars) {
          if (!seen.has(c)) {
            seen.add(c);
            this._candidates.push(c);
          }
        }
      }
    };

    addCandidates(this.specialTable);
    addCandidates(this.shortcodeTable);
    addCandidates(this.mainTable);
  }

  /** Clear all state */
  reset(): void {
    this._input = '';
    this._candidates = [];
    this._committed = '';
  }
}
