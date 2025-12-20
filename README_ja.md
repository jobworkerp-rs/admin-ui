# JobWorkerp 管理画面 (Admin UI)

[JobWorkerp](https://github.com/jobworkerp-rs/jobworkerp-rs) を管理するためのモダンな管理画面UIです。React, Vite, TypeScript で構築されています。

> **注意:** 本モジュールは coding agent が実装したアルファ版です。API や動作は予告なく変更される可能性があります。

## 概要

このダッシュボードを使用することで、管理者はバックグラウンドジョブの処理状況を効果的に管理できます。
- システムの健全性とジョブメトリクスの監視
- ワーカー (Workers) とランナー (Runners) の管理
- ジョブの登録 (Enqueue) と追跡
- ジョブ実行結果の確認と分析
- システムメンテナンス（クリーンアップ、リストア）

## 技術スタック

- **フレームワーク**: React 19, Vite
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
- **通信**: gRPC-Web (via `nice-grpc-web`), Protobuf
- **状態管理**: React Query (TanStack Query)
- **チャート**: Recharts

## 主な機能

- **ダッシュボード**: ジョブステータスやワーカーの稼働状況をリアルタイムで把握できます。
- **ワーカー管理**: ワーカー設定の作成、編集、管理が行えます。
- **ランナー管理**: ランナープラグインや設定の管理が行えます。
- **ジョブ管理**:
    - Protocol Buffers のスキーマに基づいた動的なフォームでジョブを登録できます。
    - ジョブの履歴や詳細を確認できます。
    - 実行中または待機中のジョブをキャンセルできます。
    - ステータスの整合性チェック（スタックしたジョブの検出と強制キャンセル）が可能です。
- **実行結果 (Results)**:
    - ジョブの実行結果（Protobuf でデコードされた出力）を詳細に確認できます。
    - 一括削除や再試行 (Retry) 機能があります。
- **関数セット (Function Sets)**: 再利用可能な関数定義を管理できます。
- **システム管理**:
    - データクリーンアップ（古いジョブステータスの削除）。
    - ジョブのリストア（RDBバックアップからRedisキューへの復旧）。

## はじめ方

### 前提条件

- Node.js (v18以上)
- pnpm (v9以上)
- gRPC-Web プロキシが有効な JobWorkerp バックエンドの実行インスタンス (Envoy または内部プロキシ)。

### インストール

```bash
pnpm install
```

### 開発

開発サーバーを起動します:

```bash
pnpm dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

### ビルド

本番用にビルドします:

```bash
pnpm build
```

出力ファイルは `dist` ディレクトリに生成されます。

### テスト

ユニットテスト (Vitest) を実行します:

```bash
pnpm test
```

E2Eテスト (Playwright) を実行します:

```bash
pnpm exec playwright test
```

## 設定

環境変数は `.env` ファイル（例: `.env.local`）で設定できます。

| 変数名 | 説明 | デフォルト値 |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | gRPC-Web API のベースURL | `http://localhost:8080` |

## ライセンス

[MIT](LICENSE)
