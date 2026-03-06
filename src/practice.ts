import { CinTable } from './cin-parser';
import { ARTICLES, Article } from './articles';

export type PracticeMode = 'random-char' | 'typing-article';

export interface PracticeState {
  mode: PracticeMode;
  targetText: string;
  position: number;
  correct: number;
  incorrect: number;
  startTime: number | null;
}

export class PracticeController {
  private state: PracticeState | null = null;
  private charPool: string[] = [];
  private reverseMap: Map<string, string[]> = new Map();
  private mainKeyNames: Record<string, string> = {};
  private showHint = false;

  private randomEl: HTMLElement;
  private articleEl: HTMLElement;
  private promptEl: HTMLElement;
  private statsEl: HTMLElement;
  private articleSelectEl: HTMLElement;
  private articlePromptEl: HTMLElement;
  private articleStatsEl: HTMLElement;

  private onModeChange: (() => void) | null = null;

  constructor(randomContainer: HTMLElement, articleContainer: HTMLElement) {
    this.randomEl = randomContainer;
    this.articleEl = articleContainer;

    this.promptEl = document.createElement('div');
    this.promptEl.className = 'practice-prompt';

    this.statsEl = document.createElement('div');
    this.statsEl.className = 'practice-stats';

    this.articleSelectEl = document.createElement('div');
    this.articleSelectEl.className = 'practice-article-select';

    this.articlePromptEl = document.createElement('div');
    this.articlePromptEl.className = 'practice-prompt';

    this.articleStatsEl = document.createElement('div');
    this.articleStatsEl.className = 'practice-stats';
  }

  setModeChangeCallback(cb: () => void): void {
    this.onModeChange = cb;
  }

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

    // Random practice pool: use characters from the curated shortcode
    // and special tables only (common Traditional Chinese characters)
    const commonChars = new Set<string>();
    for (const chars of shortcode.charDefs.values()) {
      for (const ch of chars) commonChars.add(ch);
    }
    for (const chars of special.charDefs.values()) {
      for (const ch of chars) commonChars.add(ch);
    }
    this.charPool = [...commonChars].filter(ch => {
      const cp = ch.codePointAt(0)!;
      return cp >= 0x4E00 && cp <= 0x9FFF;
    });
  }

  mount(): void {
    this.randomEl.appendChild(this.promptEl);
    this.randomEl.appendChild(this.statsEl);
    this.articleEl.appendChild(this.articleSelectEl);
    this.articleEl.appendChild(this.articlePromptEl);
    this.articleEl.appendChild(this.articleStatsEl);
  }

  start(mode: PracticeMode): void {
    if (mode === 'random-char') {
      this.startRandomChar();
    } else {
      this.showArticleSelector();
    }
    this.onModeChange?.();
  }

  stop(): void {
    this.state = null;
    this.promptEl.innerHTML = '';
    this.statsEl.textContent = '';
    this.articleSelectEl.innerHTML = '';
    this.articlePromptEl.innerHTML = '';
    this.articleStatsEl.textContent = '';
    this.onModeChange?.();
  }

  get active(): boolean {
    return this.state !== null;
  }

  get currentMode(): PracticeMode | null {
    return this.state?.mode ?? null;
  }

  handleCommit(char: string): boolean {
    if (!this.state) return false;

    if (!this.state.startTime) {
      this.state.startTime = Date.now();
    }

    const expected = this.state.targetText[this.state.position];
    if (char === expected) {
      this.state.correct++;
      this.state.position++;
      if (this.state.position >= this.state.targetText.length) {
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
    const char = this.charPool[Math.floor(Math.random() * this.charPool.length)];
    this.state = {
      mode: 'random-char',
      targetText: char,
      position: 0,
      correct: this.state?.mode === 'random-char' ? this.state.correct : 0,
      incorrect: this.state?.mode === 'random-char' ? this.state.incorrect : 0,
      startTime: this.state?.mode === 'random-char' ? this.state.startTime : null,
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
    this.articlePromptEl.innerHTML = '';
    this.articleStatsEl.textContent = '';
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
        const btn = document.createElement('fluent-button');
        btn.setAttribute('appearance', 'outline');
        btn.textContent = a.title;
        btn.addEventListener('click', () => this.startArticle(a.text));
        groupEl.appendChild(btn);
      }
      this.articleSelectEl.appendChild(groupEl);
    }

    // Custom article input
    const customSection = document.createElement('div');
    customSection.className = 'practice-article-group';
    const customHeading = document.createElement('h3');
    customHeading.className = 'practice-article-group-title';
    customHeading.textContent = '自訂文章';
    customSection.appendChild(customHeading);
    const customInput = document.createElement('textarea');
    customInput.className = 'practice-custom-input';
    customInput.rows = 3;
    customInput.placeholder = '在此貼上要練習的文章…';
    customSection.appendChild(customInput);
    const customBtn = document.createElement('fluent-button');
    customBtn.setAttribute('appearance', 'accent');
    customBtn.textContent = '開始練習';
    customBtn.addEventListener('click', () => {
      const text = customInput.value.trim();
      if (text) this.startArticle(text);
    });
    customSection.appendChild(customBtn);
    this.articleSelectEl.appendChild(customSection);
  }

  private startArticle(text: string): void {
    this.articleSelectEl.innerHTML = '';
    this.state = {
      mode: 'typing-article',
      targetText: text,
      position: 0,
      correct: 0,
      incorrect: 0,
      startTime: null,
    };
    this.renderPrompt();
    this.renderStats();
    this.onModeChange?.();
  }

  private getCodeDisplay(char: string): string {
    const codes = this.reverseMap.get(char) ?? [];
    return codes.map(c =>
      c.split('').map(k => this.mainKeyNames[k] ?? k).join('')
    ).join(' / ');
  }

  private renderPrompt(): void {
    if (!this.state) return;

    if (this.state.mode === 'random-char') {
      const char = this.state.targetText;
      const codeDisplay = this.getCodeDisplay(char);

      this.promptEl.innerHTML = '';

      const charEl = document.createElement('div');
      charEl.className = 'practice-target-char';
      charEl.textContent = char;
      this.promptEl.appendChild(charEl);

      const hintEl = document.createElement('div');
      hintEl.className = 'practice-hint';
      hintEl.textContent = `編碼：${codeDisplay}`;
      hintEl.style.visibility = this.showHint ? 'visible' : 'hidden';
      this.promptEl.appendChild(hintEl);

      const actions = document.createElement('div');
      actions.className = 'practice-actions';

      const hintBtn = document.createElement('fluent-button');
      hintBtn.setAttribute('appearance', this.showHint ? 'accent' : 'outline');
      hintBtn.textContent = this.showHint ? '隱藏提示' : '顯示提示';
      hintBtn.addEventListener('click', () => {
        this.showHint = !this.showHint;
        this.renderPrompt();
      });
      actions.appendChild(hintBtn);

      const skipBtn = document.createElement('fluent-button');
      skipBtn.setAttribute('appearance', 'stealth');
      skipBtn.textContent = '跳過';
      skipBtn.addEventListener('click', () => {
        this.nextRandomChar();
      });
      actions.appendChild(skipBtn);

      this.promptEl.appendChild(actions);
    } else {
      // Article mode
      this.articlePromptEl.innerHTML = '';
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
      this.articlePromptEl.appendChild(textEl);

      if (current) {
        const codeDisplay = this.getCodeDisplay(current);
        const hintEl = document.createElement('div');
        hintEl.className = 'practice-hint';
        hintEl.textContent = `編碼：${codeDisplay}`;
        hintEl.style.visibility = this.showHint ? 'visible' : 'hidden';
        this.articlePromptEl.appendChild(hintEl);

        const hintBtn = document.createElement('fluent-button');
        hintBtn.setAttribute('appearance', this.showHint ? 'accent' : 'outline');
        hintBtn.setAttribute('size', 'small');
        hintBtn.textContent = this.showHint ? '隱藏提示' : '顯示提示';
        hintBtn.addEventListener('click', () => {
          this.showHint = !this.showHint;
          this.renderPrompt();
        });
        this.articlePromptEl.appendChild(hintBtn);
      }
    }
  }

  private renderStats(): void {
    if (!this.state) return;
    const { correct, incorrect, startTime } = this.state;
    const total = correct + incorrect;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Calculate CPM (correct characters per minute)
    let cpm = 0;
    if (startTime && correct > 0) {
      const elapsedMin = (Date.now() - startTime) / 60000;
      if (elapsedMin > 0) {
        cpm = Math.round(correct / elapsedMin);
      }
    }

    const target = this.state.mode === 'random-char' ? this.statsEl : this.articleStatsEl;
    target.innerHTML = '';

    const correctBadge = document.createElement('fluent-badge');
    correctBadge.setAttribute('appearance', 'accent');
    correctBadge.textContent = `正確 ${correct}`;

    const incorrectBadge = document.createElement('fluent-badge');
    incorrectBadge.setAttribute('appearance', incorrect > 0 ? 'accent' : 'accent');
    incorrectBadge.className = incorrect > 0 ? 'badge-error' : '';
    incorrectBadge.textContent = `錯誤 ${incorrect}`;

    const accuracyBadge = document.createElement('fluent-badge');
    accuracyBadge.textContent = `正確率 ${accuracy}%`;

    const cpmBadge = document.createElement('fluent-badge');
    cpmBadge.textContent = `速度 ${cpm} 字/分`;

    target.appendChild(correctBadge);
    target.appendChild(incorrectBadge);
    target.appendChild(accuracyBadge);
    target.appendChild(cpmBadge);
  }

  private renderComplete(): void {
    this.articlePromptEl.innerHTML = '';

    const msg = document.createElement('div');
    msg.className = 'practice-complete';
    msg.textContent = '練習完成！';
    this.articlePromptEl.appendChild(msg);

    const restartBtn = document.createElement('fluent-button');
    restartBtn.setAttribute('appearance', 'accent');
    restartBtn.textContent = '再來一次';
    restartBtn.addEventListener('click', () => {
      this.start(this.state!.mode);
    });
    this.articlePromptEl.appendChild(restartBtn);
  }
}
