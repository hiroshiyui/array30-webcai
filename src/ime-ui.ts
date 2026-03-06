import { ImeEngine } from './ime-engine';

/** Array30 keyboard layout — 3 rows matching a QWERTY keyboard */
const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

/** Array30 key labels (key → array30 label) */
const KEY_LABELS: Record<string, string> = {
  q: '1⇡', w: '2⇡', e: '3⇡', r: '4⇡', t: '5⇡',
  y: '6⇡', u: '7⇡', i: '8⇡', o: '9⇡', p: '0⇡',
  a: '1-', s: '2-', d: '3-', f: '4-', g: '5-',
  h: '6-', j: '7-', k: '8-', l: '9-', ';': '0-',
  z: '1⇣', x: '2⇣', c: '3⇣', v: '4⇣', b: '5⇣',
  n: '6⇣', m: '7⇣', ',': '8⇣', '.': '9⇣', '/': '0⇣',
};

export class ImeUI {
  private container: HTMLElement;
  private engine: ImeEngine;
  private inputDisplay: HTMLElement;
  private candidateBar: HTMLElement;
  private targetInput: HTMLTextAreaElement | null = null;
  private onCommit: ((char: string) => void) | null = null;

  constructor(engine: ImeEngine) {
    this.engine = engine;
    this.container = document.createElement('div');
    this.container.id = 'ime-bar';
    this.inputDisplay = document.createElement('div');
    this.inputDisplay.className = 'ime-input-display';
    this.candidateBar = document.createElement('div');
    this.candidateBar.className = 'ime-candidates';
    this.buildUI();
    this.attachKeyboardHandler();
  }

  /** Attach to a target textarea — committed chars will be inserted here */
  attachTo(textarea: HTMLTextAreaElement): void {
    this.targetInput = textarea;
  }

  /** Set a callback for when a character is committed */
  setCommitCallback(cb: (char: string) => void): void {
    this.onCommit = cb;
  }

  /** Mount the IME bar into the DOM */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  private buildUI(): void {
    // Status / input display row
    const statusRow = document.createElement('div');
    statusRow.className = 'ime-status-row';

    this.inputDisplay.textContent = '';
    statusRow.appendChild(this.inputDisplay);
    statusRow.appendChild(this.candidateBar);

    this.container.appendChild(statusRow);

    // On-screen keyboard
    const keyboard = document.createElement('div');
    keyboard.className = 'ime-keyboard';

    for (const row of KEYBOARD_ROWS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'ime-keyboard-row';
      for (const key of row) {
        const btn = document.createElement('button');
        btn.className = 'ime-key';
        btn.dataset.key = key;
        const label = KEY_LABELS[key] ?? key;
        btn.innerHTML = `<span class="ime-key-main">${key.toUpperCase()}</span><span class="ime-key-label">${label}</span>`;
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault(); // prevent focus loss
          this.onKeyInput(key);
        });
        rowEl.appendChild(btn);
      }
      rowEl.appendChild(this.createActionButton(row));
      keyboard.appendChild(rowEl);
    }

    // Bottom row: space bar
    const bottomRow = document.createElement('div');
    bottomRow.className = 'ime-keyboard-row ime-bottom-row';
    const spaceBtn = document.createElement('button');
    spaceBtn.className = 'ime-key ime-space';
    spaceBtn.textContent = '空白';
    spaceBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onKeyInput(' ');
    });
    bottomRow.appendChild(spaceBtn);
    keyboard.appendChild(bottomRow);

    this.container.appendChild(keyboard);
  }

  private createActionButton(row: string[]): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ime-key ime-action';
    if (row === KEYBOARD_ROWS[0]) {
      // Backspace on the first row
      btn.textContent = '⌫';
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onKeyInput('Backspace');
      });
    } else if (row === KEYBOARD_ROWS[1]) {
      // Escape / clear on the second row
      btn.textContent = 'Esc';
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onKeyInput('Escape');
      });
    } else {
      // Enter on the third row
      btn.textContent = '⏎';
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.commitToTarget('\n');
      });
    }
    return btn;
  }

  private onKeyInput(key: string): void {
    const consumed = this.engine.handleKey(key);
    if (consumed) {
      const committed = this.engine.committed;
      if (committed) {
        this.commitToTarget(committed);
      }
      this.updateDisplay();
    }
  }

  private commitToTarget(char: string): void {
    if (this.targetInput) {
      const ta = this.targetInput;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + char + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + char.length;
      ta.focus();
    }
    if (this.onCommit) {
      this.onCommit(char);
    }
  }

  private updateDisplay(): void {
    this.inputDisplay.textContent = this.engine.inputDisplay || '';
    this.candidateBar.innerHTML = '';
    for (let i = 0; i < this.engine.candidates.length && i < 10; i++) {
      const span = document.createElement('span');
      span.className = 'ime-candidate';
      const num = i === 9 ? 0 : i + 1;
      span.innerHTML = `<span class="ime-candidate-num">${num}</span>${this.engine.candidates[i]}`;
      span.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const key = i === 9 ? '0' : String(i + 1);
        this.onKeyInput(key);
      });
      this.candidateBar.appendChild(span);
    }
  }

  private attachKeyboardHandler(): void {
    document.addEventListener('keydown', (e) => {
      const key = e.key;
      const consumed = this.engine.handleKey(key);
      if (consumed) {
        e.preventDefault();
        const committed = this.engine.committed;
        if (committed) {
          this.commitToTarget(committed);
        }
        this.updateDisplay();
      }
    });
  }
}
