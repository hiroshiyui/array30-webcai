import { provideFluentDesignSystem, fluentButton } from '@fluentui/web-components';
import { parseCin } from './cin-parser';
import { ImeEngine } from './ime-engine';
import { ImeUI } from './ime-ui';
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
}

init();
