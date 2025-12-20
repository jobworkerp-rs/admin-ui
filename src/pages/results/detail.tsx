import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useJobResult } from '@/hooks/use-jobs';
import { useWorker } from '@/hooks/use-workers';
import { useRunner } from '@/hooks/use-runners';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react';
import { ResultStatus, Priority } from '@/lib/grpc/jobworkerp/data/common';
import * as protobuf from 'protobufjs';
import { useMemo } from 'react';

export default function JobResultDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { data: jobResult, isLoading: isResultLoading, error, refetch } = useJobResult(id);
    const resultData = jobResult?.data?.data;
    
    // Dependent queries
    const workerId = resultData?.workerId?.value;
    const { data: worker } = useWorker(workerId);
    
    const runnerId = worker?.data?.runnerId?.value;
    // We only need runner to get methodProtoMap
    const { data: runner } = useRunner(runnerId);

    const formatBytes = (bytes?: Uint8Array, protoSchema?: string) => {
        if (!bytes || bytes.length === 0) return "Empty";

        if (protoSchema) {
            try {
                // Parse the schema
                const root = protobuf.parse(protoSchema).root;
                // Find the first type
                const findFirstType = (namespace: protobuf.NamespaceBase): protobuf.Type | null => {
                     for (const nested of namespace.nestedArray) {
                        if (nested instanceof protobuf.Type) return nested;
                        if (nested instanceof protobuf.Namespace) {
                            const found = findFirstType(nested);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                const type = findFirstType(root);

                if (type) {
                    const message = type.decode(bytes);
                    return JSON.stringify(message.toJSON(), null, 2);
                }
            } catch (e) {
                console.warn("Failed to decode using proto schema:", e);
            }
        }

        // Fallback to text decode
        try {
            const text = new TextDecoder().decode(bytes);
            try {
                // Try format as JSON if text
                return JSON.stringify(JSON.parse(text), null, 2);
            } catch {
                return text;
            }
        } catch {
            return `[Binary Data] ${bytes.length} bytes`;
        }
    };

    // Determine method used
    const method = resultData?.using || 'run'; // Default to 'run' if not specified (e.g. single method runners often imply 'run')
    const schema = useMemo(() => {
        if (!runner?.data?.methodProtoMap?.schemas) return undefined;
        return runner.data.methodProtoMap.schemas[method];
    }, [runner, method]);

    if (isResultLoading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">Error: {String(error)}</div>;
    if (!jobResult?.data?.data) return <div>Result not found</div>;

    const rData = jobResult.data.data;
    const statusMap: Record<number, { label: string, color: string }> = {
        [ResultStatus.SUCCESS]: { label: 'Success', color: 'bg-green-500' },
        [ResultStatus.ERROR_AND_RETRY]: { label: 'Error (Retrying)', color: 'bg-orange-500' },
        [ResultStatus.FATAL_ERROR]: { label: 'Fatal Error', color: 'bg-red-500' },
        [ResultStatus.ABORT]: { label: 'Aborted', color: 'bg-gray-500' },
        [ResultStatus.MAX_RETRY]: { label: 'Max Retry Exceeded', color: 'bg-red-700' },
        [ResultStatus.OTHER_ERROR]: { label: 'Other Error', color: 'bg-red-400' },
        [ResultStatus.CANCELLED]: { label: 'Cancelled', color: 'bg-gray-400' },
    };

    const s = statusMap[rData.status] || { label: ResultStatus[rData.status], color: 'bg-gray-500' };

    const formatDate = (msStatsStr?: string) => {
        if (!msStatsStr) return '-';
        const ms = parseInt(msStatsStr);
        if (isNaN(ms) || ms === 0) return '-';
        return new Date(ms).toLocaleString();
    };

    const handleRetry = () => {
        navigate("/jobs/new", { 
            state: { 
                retryJobData: {
                    workerId: rData.workerId?.value,
                    args: rData.args,
                    priority: rData.priority,
                    timeout: rData.timeout,
                    using: method,
                }
            } 
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/results")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("common.job_result_detail", "Job Result Details")}</h2>
                    <p className="text-muted-foreground">Job ID: {rData.jobId?.value}</p>
                </div>
                <div className="ml-auto flex gap-2">
                     <Button variant="outline" onClick={handleRetry}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Retry
                     </Button>
                     <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                             <span className="font-semibold">Status:</span>
                             <Badge className={s.color}>{s.label}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Worker:</span>
                            <span>{rData.workerName} <span className="text-xs text-muted-foreground">({rData.workerId?.value})</span></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Method:</span>
                            <span>{method}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Priority:</span>
                            <span>{Priority[rData.priority]}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Uniq Key:</span>
                            <span>{rData.uniqKey || '-'}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="font-semibold">Retried:</span>
                            <span>{rData.retried} / {rData.maxRetry}</span>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Timings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="font-semibold">Enqueued:</span>
                            <span>{formatDate(rData.enqueueTime)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="font-semibold">Run After:</span>
                            <span>{formatDate(rData.runAfterTime)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="font-semibold">Started:</span>
                            <span>{formatDate(rData.startTime)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Ended:</span>
                            <span>{formatDate(rData.endTime)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Arguments</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-slate-100 p-4 rounded-md overflow-auto border font-mono text-sm dark:bg-slate-900">
                        {formatBytes(rData.args, schema?.argsProto)}
                    </pre>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Result Output</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-slate-100 p-4 rounded-md overflow-auto border font-mono text-sm dark:bg-slate-900">
                         {formatBytes(rData.output?.items, schema?.resultProto)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
}
