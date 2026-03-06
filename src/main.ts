import { provideFluentDesignSystem, fluentButton } from '@fluentui/web-components';
import { parseCin } from './cin-parser';
import { ImeEngine } from './ime-engine';
import { ImeUI } from './ime-ui';
import { PracticeController } from './practice';
import './ime-style.css';

provideFluentDesignSystem().register(fluentButton());

async function loadCinTable(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  return parseCin(text);
}

async function init() {
  const [mainTable, shortcodeTable, specialTable] = await Promise.all([
    loadCinTable('data/array30-OpenVanilla-big-v2023-1.0-20230211.cin'),
    loadCinTable('data/array-shortcode-20210725.cin'),
    loadCinTable('data/array-special-201509.cin'),
  ]);

  const engine = new ImeEngine();
  engine.setTables(mainTable, shortcodeTable, specialTable);

  const ime = new ImeUI(engine);
  const textarea = document.getElementById('input-area') as HTMLTextAreaElement;
  ime.attachTo(textarea);
  ime.mount(document.body);

  // Practice modes
  const practiceArea = document.getElementById('practice-area')!;
  const practice = new PracticeController(practiceArea);
  practice.initFromTable(mainTable, specialTable, shortcodeTable);
  practice.mount();

  // Mode toggle buttons
  const modeFree = document.getElementById('mode-free')!;
  const modeRandom = document.getElementById('mode-random')!;
  const modeArticle = document.getElementById('mode-article')!;
  const modeButtons = [modeFree, modeRandom, modeArticle];

  function setActiveButton(active: HTMLElement) {
    for (const btn of modeButtons) btn.classList.remove('active');
    active.classList.add('active');
  }

  modeFree.addEventListener('click', () => {
    practice.stop();
    textarea.style.display = '';
    setActiveButton(modeFree);
  });

  modeRandom.addEventListener('click', () => {
    textarea.style.display = 'none';
    practice.start('random-char');
    setActiveButton(modeRandom);
  });

  modeArticle.addEventListener('click', () => {
    textarea.style.display = 'none';
    practice.start('typing-article');
    setActiveButton(modeArticle);
  });

  // Wire IME commits to practice controller
  ime.setCommitCallback((char: string) => {
    practice.handleCommit(char);
  });
}

init();
