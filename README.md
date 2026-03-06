# 行列輸入法 Web CAI

行列輸入法 Web CAI 是一個完全在瀏覽器中運行的**行列 30 輸入法**電腦輔助教學系統。無需在作業系統安裝輸入法，即可直接學習與練習行列輸入法。

## 功能特色

- **純瀏覽器運行**：所有資料與運算皆在本機完成，不依賴遠端伺服器，可離線使用
- **內建虛擬鍵盤**：標示各鍵對應的行列碼，支援實體鍵盤與觸控操作
- **完整鍵碼表**：內建行列 30 鍵碼表（v2023-1.0）、特別碼表及簡碼表
- **教學說明**：涵蓋鍵盤配置、基本筆形、字根定位、取碼原則
- **自由輸入**：直接使用行列輸入法打字，熟悉鍵位與字根
- **隨機字元練習**：從常用字中隨機出題，可切換編碼提示
- **文章練習**：內建古典文學選文（古文觀止、儒林外史、千字文、唐詩等），亦可自訂文章
- **即時統計**：追蹤正確率與每分鐘輸入字數（CPM）

## 使用方式

### 直接開啟

建置後的 `dist/` 目錄僅包含 `index.html` 與 `app.js`，可直接以瀏覽器開啟 `dist/index.html` 使用，無需架設伺服器。

### 本機伺服器

```bash
npm run serve
```

以 Node.js 靜態伺服器於 `http://localhost:3000` 提供服務。

## 開發

### 環境需求

- Node.js 20+
- npm

### 安裝相依套件

```bash
npm install
```

### 開發指令

```bash
npm run dev          # 啟動 Vite 開發伺服器（HMR）
npm run build        # TypeScript 型別檢查 + Vite 建置
npm run dev-build    # 建置 + 監聽變更 + 自動重建 + http://localhost:3000 即時重載
npm run serve        # 以靜態伺服器提供 dist/ 目錄
npm run preview      # Vite 預覽模式
```

## 技術架構

- **TypeScript** + **Vite**，輸出為單一 IIFE 格式 JS 檔
- **Microsoft Fluent UI Web Components** 介面元件
- 鍵碼表以 Vite raw import 內嵌於程式碼中，支援 `file://` 協定直接開啟
- 鍵碼表來源：[gontera/array30](https://github.com/gontera/array30)（OpenVanilla 格式 .cin 檔）

## 致謝

- **廖明德**先生——行列輸入法發明人，以免費授權方式推廣
- **老刀（gontera）**先生——整理並維護行列 30 鍵碼表、特別碼表及簡碼表，以開放格式釋出於 GitHub
- 行列輸入法社群所有使用者與貢獻者

## 授權條款

本專案以 [GNU General Public License v3.0 或更新版本](LICENSE)（GPL-3.0-or-later）授權釋出。
