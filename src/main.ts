import {
  provideFluentDesignSystem,
  fluentButton,
  fluentCard,
  fluentTabs,
  fluentTab,
  fluentTabPanel,
  fluentBadge,
  fluentDivider,
  fluentDesignSystemProvider,
} from '@fluentui/web-components';
import { parseCin } from './cin-parser';
import { ImeEngine } from './ime-engine';
import { ImeUI } from './ime-ui';
import { PracticeController } from './practice';
import './ime-style.css';

import mainCin from './data/array30-OpenVanilla-big-v2023-1.0-20230211.cin?raw';
import shortcodeCin from './data/array-shortcode-20210725.cin?raw';
import specialCin from './data/array-special-201509.cin?raw';

provideFluentDesignSystem().register(
  fluentButton(),
  fluentCard(),
  fluentTabs(),
  fluentTab(),
  fluentTabPanel(),
  fluentBadge(),
  fluentDivider(),
  fluentDesignSystemProvider(),
);

function init() {
  const mainTable = parseCin(mainCin);
  const shortcodeTable = parseCin(shortcodeCin);
  const specialTable = parseCin(specialCin);

  const engine = new ImeEngine();
  engine.setTables(mainTable, shortcodeTable, specialTable);

  const ime = new ImeUI(engine);
  const textarea = document.getElementById('input-area') as HTMLTextAreaElement;
  ime.attachTo(textarea);
  ime.mount(document.body);

  // Practice controller — mounts into both tab panels
  const practiceArea = document.getElementById('practice-area')!;
  const articleArea = document.getElementById('article-area')!;
  const practice = new PracticeController(practiceArea, articleArea);
  practice.initFromTable(mainTable, specialTable, shortcodeTable);
  practice.mount();

  // Tab switching
  const mainTabs = document.getElementById('main-tabs')!;
  mainTabs.addEventListener('change', () => {
    const activeTab = mainTabs.querySelector('fluent-tab[aria-selected="true"]');
    const id = activeTab?.id;
    if (id === 'tab-intro' || id === 'tab-free' || id === 'tab-about') {
      practice.stop();
    } else if (id === 'tab-random') {
      practice.start('random-char');
    } else if (id === 'tab-article') {
      practice.start('typing-article');
    }
  });

  // Wire IME commits to practice controller
  ime.setCommitCallback((char: string) => {
    practice.handleCommit(char);
  });
}

init();
