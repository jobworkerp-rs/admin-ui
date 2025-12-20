import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: {
                    common: {
                        welcome: "Welcome to JobWorkerp Admin",
                        dashboard: "Dashboard",
                        workers: "Workers",
                        runners: "Runners",
                        jobs: "Jobs",
                        results: "Results",
                        function_sets: "Function Sets",
                        system: "System",
                        settings: "Settings",
                        loading: "Loading...",
                        create: "Create",
                        save: "Save",
                        cancel: "Cancel",
                        delete: "Delete",
                        actions: "Actions",
                        edit: "Edit",
                        update: "Update",
                        job_detail: "Job Detail",
                    },
                    jobs: {
                        enqueue: "Enqueue Job",
                        detail: "Job Detail",
                    },
                    runners: {
                        title: "Runners",
                        new: "New Runner",
                        edit: "Edit Runner",
                        fields: {
                            name: "Name",
                            description: "Description",
                            type: "Type",
                            settings: "Settings",
                            worker_count: "Worker Count"
                        }
                    },
                    workers: {
                        title: "Workers",
                        new: "New Worker",
                        edit: "Edit Worker",
                        fields: {
                            name: "Name",
                            description: "Description",
                            runner: "Runner",
                            periodic: "Interval",
                            channel: "Channel",
                            status: "Status"
                        }
                    }
                }
            },
            ja: {
                translation: {
                    common: {
                        welcome: "JobWorkerp 管理画面へようこそ",
                        dashboard: "ダッシュボード",
                        workers: "ワーカー",
                        runners: "ランナー",
                        jobs: "ジョブ",
                        results: "実行結果",
                        function_sets: "関数セット",
                        system: "システム",
                        settings: "設定",
                        loading: "読み込み中...",
                        create: "作成",
                        save: "保存",
                        cancel: "キャンセル",
                        delete: "削除",
                        actions: "操作",
                        edit: "編集",
                        update: "更新",
                        job_detail: "ジョブ詳細",
                    },
                    jobs: {
                        enqueue: "ジョブ登録",
                        detail: "ジョブ詳細",
                    },
                    runners: {
                        title: "ランナー",
                        new: "新規ランナー",
                        edit: "ランナー編集",
                        fields: {
                            name: "名前",
                            description: "説明",
                            type: "タイプ",
                            settings: "設定",
                            worker_count: "ワーカー数"
                        }
                    },
                    workers: {
                        title: "ワーカー",
                        new: "新規ワーカー",
                        edit: "ワーカー編集",
                        fields: {
                            name: "名前",
                            description: "説明",
                            runner: "ランナー",
                            periodic: "間隔",
                            channel: "チャンネル",
                            status: "ステータス"
                        }
                    }
                }
            }
        },
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
