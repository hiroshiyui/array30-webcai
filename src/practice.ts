import { CinTable } from './cin-parser';
import { ARTICLES, Article } from './articles';

export type PracticeMode = 'random-char' | 'typing-article';

export interface PracticeState {
  mode: PracticeMode;
  /** The target text to type */
  targetText: string;
  /** Current position in the target text */
  position: number;
  /** Number of correct inputs */
  correct: number;
  /** Number of incorrect inputs */
  incorrect: number;
}

export class PracticeController {
  private state: PracticeState | null = null;
  private charPool: string[] = [];
  private reverseMap: Map<string, string[]> = new Map();
  private mainKeyNames: Record<string, string> = {};

  private containerEl: HTMLElement;
  private promptEl: HTMLElement;
  private statsEl: HTMLElement;
  private articleSelectEl: HTMLElement;

  private onModeChange: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.containerEl = container;

    this.promptEl = document.createElement('div');
    this.promptEl.className = 'practice-prompt';

    this.statsEl = document.createElement('div');
    this.statsEl.className = 'practice-stats';

    this.articleSelectEl = document.createElement('div');
    this.articleSelectEl.className = 'practice-article-select';
    this.articleSelectEl.style.display = 'none';
  }

  setModeChangeCallback(cb: () => void): void {
    this.onModeChange = cb;
  }

  /** Build the character pool and reverse lookup from the main table */
  initFromTable(main: CinTable, special: CinTable, shortcode: CinTable): void {
    this.mainKeyNames = main.keyNames;
    const seen = new Set<string>();

    const addReverse = (table: CinTable) => {
      for (const [keys, chars] of table.charDefs) {
        for (const ch of chars) {
          if (!this.reverseMap.has(ch)) {
            this.reverseMap.set(ch, []);
          }
          this.reverseMap.get(ch)!.push(keys);
          seen.add(ch);
        }
      }
    };

    addReverse(main);
    addReverse(special);
    addReverse(shortcode);

    // Only keep CJK Unified Ideographs for random practice
    this.charPool = [...seen].filter(ch => {
      const cp = ch.codePointAt(0)!;
      return cp >= 0x4E00 && cp <= 0x9FFF;
    });
  }

  /** Mount the practice UI into the container */
  mount(): void {
    this.containerEl.appendChild(this.promptEl);
    this.containerEl.appendChild(this.statsEl);
    this.containerEl.appendChild(this.articleSelectEl);
  }

  /** Start a practice mode */
  start(mode: PracticeMode): void {
    if (mode === 'random-char') {
      this.startRandomChar();
    } else {
      this.showArticleSelector();
    }
    this.onModeChange?.();
  }

  /** Stop the current practice */
  stop(): void {
    this.state = null;
    this.promptEl.innerHTML = '';
    this.statsEl.textContent = '';
    this.articleSelectEl.style.display = 'none';
    this.onModeChange?.();
  }

  get active(): boolean {
    return this.state !== null;
  }

  get currentMode(): PracticeMode | null {
    return this.state?.mode ?? null;
  }

  /** Handle a committed character from the IME. Returns true if consumed. */
  handleCommit(char: string): boolean {
    if (!this.state) return false;

    const expected = this.state.targetText[this.state.position];
    if (char === expected) {
      this.state.correct++;
      this.state.position++;
      if (this.state.position >= this.state.targetText.length) {
        // Finished
        if (this.state.mode === 'random-char') {
          this.nextRandomChar();
        } else {
          this.renderComplete();
        }
      } else {
        this.renderPrompt();
      }
    } else {
      this.state.incorrect++;
      this.renderPrompt();
    }
    this.renderStats();
    return true;
  }

  private startRandomChar(): void {
    this.articleSelectEl.style.display = 'none';
    const char = this.charPool[Math.floor(Math.random() * this.charPool.length)];
    this.state = {
      mode: 'random-char',
      targetText: char,
      position: 0,
      correct: this.state?.mode === 'random-char' ? this.state.correct : 0,
      incorrect: this.state?.mode === 'random-char' ? this.state.incorrect : 0,
    };
    this.renderPrompt();
    this.renderStats();
  }

  private nextRandomChar(): void {
    const char = this.charPool[Math.floor(Math.random() * this.charPool.length)];
    this.state!.targetText = char;
    this.state!.position = 0;
    this.renderPrompt();
  }

  private showArticleSelector(): void {
    this.articleSelectEl.style.display = '';
    this.articleSelectEl.innerHTML = '';

    // Group articles by source
    const groups = new Map<string, Article[]>();
    for (const a of ARTICLES) {
      const group = groups.get(a.source) ?? [];
      group.push(a);
      groups.set(a.source, group);
    }

    for (const [source, articles] of groups) {
      const groupEl = document.createElement('div');
      groupEl.className = 'practice-article-group';
      const heading = document.createElement('h3');
      heading.className = 'practice-article-group-title';
      heading.textContent = source;
      groupEl.appendChild(heading);
      for (const a of articles) {
        const btn = document.createElement('button');
        btn.className = 'practice-article-btn';
        btn.textContent = a.title;
        btn.addEventListener('click', () => this.startArticle(a.text));
        groupEl.appendChild(btn);
      }
      this.articleSelectEl.appendChild(groupEl);
    }

    // Custom article input
    const customLabel = document.createElement('p');
    customLabel.textContent = '或自行輸入文章：';
    this.articleSelectEl.appendChild(customLabel);
    const customInput = document.createElement('textarea');
    customInput.className = 'practice-custom-input';
    customInput.rows = 3;
    customInput.placeholder = '在此貼上要練習的文章…';
    this.articleSelectEl.appendChild(customInput);
    const customBtn = document.createElement('button');
    customBtn.className = 'practice-article-btn';
    customBtn.textContent = '開始練習';
    customBtn.addEventListener('click', () => {
      const text = customInput.value.trim();
      if (text) this.startArticle(text);
    });
    this.articleSelectEl.appendChild(customBtn);

    this.promptEl.innerHTML = '';
    this.statsEl.textContent = '';
  }

  private startArticle(text: string): void {
    this.articleSelectEl.style.display = 'none';
    this.state = {
      mode: 'typing-article',
      targetText: text,
      position: 0,
      correct: 0,
      incorrect: 0,
    };
    this.renderPrompt();
    this.renderStats();
    this.onModeChange?.();
  }

  private renderPrompt(): void {
    if (!this.state) return;

    if (this.state.mode === 'random-char') {
      const char = this.state.targetText;
      const codes = this.reverseMap.get(char) ?? [];
      const codeDisplay = codes.map(c =>
        c.split('').map(k => this.mainKeyNames[k] ?? k).join('')
      ).join(' / ');

      this.promptEl.innerHTML = '';
      const charEl = document.createElement('div');
      charEl.className = 'practice-target-char';
      charEl.textContent = char;
      this.promptEl.appendChild(charEl);

      const hintEl = document.createElement('div');
      hintEl.className = 'practice-hint';
      hintEl.textContent = `編碼：${codeDisplay}`;
      hintEl.style.visibility = 'hidden';
      this.promptEl.appendChild(hintEl);

      const hintBtn = document.createElement('button');
      hintBtn.className = 'practice-hint-btn';
      hintBtn.textContent = '顯示提示';
      hintBtn.addEventListener('click', () => {
        hintEl.style.visibility = 'visible';
      });
      this.promptEl.appendChild(hintBtn);

      const skipBtn = document.createElement('button');
      skipBtn.className = 'practice-hint-btn';
      skipBtn.textContent = '跳過';
      skipBtn.addEventListener('click', () => {
        this.nextRandomChar();
      });
      this.promptEl.appendChild(skipBtn);
    } else {
      // Article mode — show text with current position highlighted
      this.promptEl.innerHTML = '';
      const textEl = document.createElement('div');
      textEl.className = 'practice-article-text';

      const done = this.state.targetText.slice(0, this.state.position);
      const current = this.state.targetText[this.state.position];
      const remaining = this.state.targetText.slice(this.state.position + 1);

      const doneSpan = document.createElement('span');
      doneSpan.className = 'practice-done';
      doneSpan.textContent = done;

      const currentSpan = document.createElement('span');
      currentSpan.className = 'practice-current';
      currentSpan.textContent = current;

      const remainSpan = document.createElement('span');
      remainSpan.className = 'practice-remaining';
      remainSpan.textContent = remaining;

      textEl.appendChild(doneSpan);
      textEl.appendChild(currentSpan);
      textEl.appendChild(remainSpan);
      this.promptEl.appendChild(textEl);

      // Show hint for current character
      if (current) {
        const codes = this.reverseMap.get(current) ?? [];
        const codeDisplay = codes.map(c =>
          c.split('').map(k => this.mainKeyNames[k] ?? k).join('')
        ).join(' / ');
        const hintEl = document.createElement('div');
        hintEl.className = 'practice-hint';
        hintEl.textContent = `編碼：${codeDisplay}`;
        hintEl.style.visibility = 'hidden';
        this.promptEl.appendChild(hintEl);

        const hintBtn = document.createElement('button');
        hintBtn.className = 'practice-hint-btn';
        hintBtn.textContent = '顯示提示';
        hintBtn.addEventListener('click', () => {
          hintEl.style.visibility = 'visible';
        });
        this.promptEl.appendChild(hintBtn);
      }
    }
  }

  private renderStats(): void {
    if (!this.state) return;
    const { correct, incorrect } = this.state;
    const total = correct + incorrect;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    this.statsEl.textContent = `正確：${correct}　錯誤：${incorrect}　正確率：${accuracy}%`;
  }

  private renderComplete(): void {
    this.promptEl.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'practice-complete';
    msg.textContent = '練習完成！';
    this.promptEl.appendChild(msg);

    const restartBtn = document.createElement('button');
    restartBtn.className = 'practice-hint-btn';
    restartBtn.textContent = '再來一次';
    restartBtn.addEventListener('click', () => {
      this.start(this.state!.mode);
    });
    this.promptEl.appendChild(restartBtn);
  }
}
