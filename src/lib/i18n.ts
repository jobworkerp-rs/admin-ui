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
                        worker_instances: "Worker Instances",
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
                        release: "Release",
                        release_confirm_title: "Release Runner Pool",
                        release_confirm_desc: "Release the runner pool for \"{{name}}\"? The pool will be discarded and lazily re-created on the next job execution.",
                        fields: {
                            name: "Name",
                            description: "Description",
                            runner: "Runner",
                            periodic: "Interval",
                            channel: "Channel",
                            status: "Status"
                        }
                    }
                    ,
                    worker_instances: {
                        title: "Worker Instances",
                        description: "Monitor registered worker processes and their channel capacity.",
                        refresh: "Refresh",
                        retry: "Retry",
                        reconnecting: "Reconnecting…",
                        load_error: "Failed to load worker instances.",
                        total_instances: "Worker Instances",
                        active_of_total: "Active / total registered instances",
                        channel_capacity: "Channel Capacity",
                        include_inactive: "Include inactive instances",
                        channel: "Channel",
                        all_channels: "All channels",
                        instance: "Instance",
                        instance_id: "Instance ID",
                        host: "Host / IP",
                        status: "Status",
                        activity: "Activity",
                        registered_at: "Registered At",
                        last_heartbeat: "Last Heartbeat",
                        channels: "Channels (Concurrency)",
                        recovery: "Recovery",
                        active: "Active",
                        inactive: "Inactive",
                        participating: "Participating",
                        not_participating: "Not participating",
                        empty: "No worker instances found.",
                        previous: "Previous",
                        next: "Next"
                    }
                }
            },
            ja: {
                translation: {
                    common: {
                        welcome: "JobWorkerp 管理画面へようこそ",
                        dashboard: "ダッシュボード",
                        workers: "ワーカー",
                        worker_instances: "ワーカーインスタンス",
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
                        release: "解放",
                        release_confirm_title: "ランナープールの解放",
                        release_confirm_desc: "「{{name}}」のランナープールを解放しますか？プールは破棄され、次回ジョブ実行時に再作成されます。",
                        fields: {
                            name: "名前",
                            description: "説明",
                            runner: "ランナー",
                            periodic: "間隔",
                            channel: "チャンネル",
                            status: "ステータス"
                        }
                    }
                    ,
                    worker_instances: {
                        title: "ワーカーインスタンス",
                        description: "登録済みワーカープロセスとチャンネル処理能力を監視します。",
                        refresh: "更新",
                        retry: "再試行",
                        reconnecting: "再接続中…",
                        load_error: "ワーカーインスタンスの取得に失敗しました。",
                        total_instances: "ワーカーインスタンス",
                        active_of_total: "アクティブ数 / 登録総数",
                        channel_capacity: "チャンネル処理能力",
                        include_inactive: "非アクティブなインスタンスを含める",
                        channel: "チャンネル",
                        all_channels: "すべてのチャンネル",
                        instance: "インスタンス",
                        instance_id: "インスタンス ID",
                        host: "ホスト / IP",
                        status: "状態",
                        activity: "活動状況",
                        registered_at: "登録日時",
                        last_heartbeat: "最終ハートビート",
                        channels: "チャンネル（並行数）",
                        recovery: "復旧",
                        active: "アクティブ",
                        inactive: "非アクティブ",
                        participating: "参加中",
                        not_participating: "非参加",
                        empty: "ワーカーインスタンスはありません。",
                        previous: "前へ",
                        next: "次へ"
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
