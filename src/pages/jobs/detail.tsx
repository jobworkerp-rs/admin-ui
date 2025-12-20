import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import * as protobuf from 'protobufjs';
import { useJob, useCancelJob } from '@/hooks/use-jobs';
import { useWorker } from '@/hooks/use-workers';
import { useRunner } from '@/hooks/use-runners';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, XCircle, RotateCcw } from 'lucide-react';
import { JobProcessingStatus, ResultStatus } from '@/lib/grpc/jobworkerp/data/common';
import { toast } from '@/hooks/use-toast';

export default function JobDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const cancelMutation = useCancelJob();

    const { data, isLoading, error, refetch } = useJob(id);

    // Dependent queries (Safe to call even if data is loading - pass undefined)
    const jobData = data?.job?.data;
    const workerId = jobData?.workerId?.value;
    const { data: worker } = useWorker(workerId);
    
    const runnerId = worker?.data?.runnerId?.value;
    const { data: runner } = useRunner(runnerId);

    // Determine method used
    const method = jobData?.using || 'run';
    const schema = useMemo(() => {
        if (!runner?.data?.methodProtoMap?.schemas) return undefined;
        return runner.data.methodProtoMap.schemas[method];
    }, [runner, method]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">Error: {String(error)}</div>;
    if (!data || !data.job || !data.job.data || !jobData) return <div>Job not found</div>;

    const { status, result } = data;
    // jobData is already defined above

    const formatBytes = (bytes?: Uint8Array, protoSchema?: string) => {
        if (!bytes || bytes.length === 0) return "Empty";

        if (protoSchema) {
            try {
                const root = protobuf.parse(protoSchema).root;
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

        try {
            const text = new TextDecoder().decode(bytes);
            try {
                return JSON.stringify(JSON.parse(text), null, 2);
            } catch {
                return text;
            }
        } catch {
            return `[Binary Data] ${bytes.length} bytes`;
        }
    };

    const statusMap: Record<number, { label: string, color: string }> = {
        [JobProcessingStatus.UNKNOWN]: { label: 'Unknown', color: 'bg-gray-500' },
        [JobProcessingStatus.PENDING]: { label: 'Pending', color: 'bg-yellow-500' },
        [JobProcessingStatus.RUNNING]: { label: 'Running', color: 'bg-blue-500' },
        [JobProcessingStatus.WAIT_RESULT]: { label: 'Wait Result', color: 'bg-indigo-500' },
        [JobProcessingStatus.CANCELLING]: { label: 'Cancelling', color: 'bg-red-400' },
    };
    
    let displayStatus = <Badge className="bg-gray-400">Finished / Unknown</Badge>;
    if (status !== undefined && status !== JobProcessingStatus.UNKNOWN) {
        const s = statusMap[status];
        displayStatus = <Badge className={s?.color}>{s?.label || status}</Badge>;
    } else if (result && result.data) {
        const rStatus = result.data.status;
        const color = rStatus === ResultStatus.SUCCESS ? 'bg-green-500' : 'bg-red-500';
        displayStatus = <Badge className={color}>{ResultStatus[rStatus]}</Badge>;
    }

    const formatDate = (msStatsStr?: string) => {
        if (!msStatsStr) return '-';
        const ms = parseInt(msStatsStr);
        if (isNaN(ms) || ms === 0) return '-';
        return new Date(ms).toLocaleString();
    };
    
    const workerName = result?.data?.workerName || worker?.data?.name || jobData.workerId?.value || "Unknown";

    const handleCancel = () => {
        if (!id) return;
        if (confirm("Are you sure you want to cancel/delete this job?")) {
            cancelMutation.mutate(id, {
                onSuccess: () => {
                    toast({ title: "Job cancellation requested" });
                    navigate("/jobs");
                },
                onError: (err) => {
                    toast({ variant: "destructive", title: "Failed to cancel job", description: String(err) });
                }
            });
        }
    };

    const handleRetry = () => {
        navigate("/jobs/new", { 
            state: { 
                retryJobData: {
                    workerId: jobData.workerId?.value,
                    args: jobData.args,
                    priority: jobData.priority,
                    timeout: jobData.timeout,
                    using: jobData.using,
                }
            } 
        });
    };

    const isFinished = !!result?.data;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("common.job_detail") || "Job Details"}</h2>
                    <p className="text-muted-foreground">ID: {id}</p>
                </div>
                <div className="ml-auto flex gap-2">
                     {!isFinished && (
                        <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
                            <XCircle className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                     )}
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
                            <span className="font-semibold">Worker:</span>
                            <span>{workerName} <span className="text-xs text-muted-foreground">({jobData.workerId?.value})</span></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Status:</span>
                            <span>{displayStatus}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Method:</span>
                            <span>{method}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Scheduled:</span>
                            <span>{formatDate(jobData.runAfterTime)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="font-semibold">Timeout:</span>
                            <span>{jobData.timeout ? `${jobData.timeout}ms` : '-'}</span>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Timings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                         {result?.data ? (
                             <>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Enqueued:</span>
                                    <span>{formatDate(result.data.enqueueTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Started:</span>
                                    <span>{formatDate(result.data.startTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold">Ended:</span>
                                    <span>{formatDate(result.data.endTime)}</span>
                                </div>
                             </>
                         ) : (
                             <div className="flex justify-between">
                                <span className="font-semibold">Enqueued:</span>
                                <span>{formatDate(jobData.enqueueTime)}</span>
                            </div>
                         )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Arguments</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="bg-slate-100 p-4 rounded-md overflow-auto border font-mono text-sm dark:bg-slate-900">
                        {formatBytes(jobData.args, schema?.argsProto)}
                    </pre>
                </CardContent>
            </Card>

            {result?.data && (
                <Card>
                    <CardHeader>
                        <CardTitle>Result Output</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-slate-100 p-4 rounded-md overflow-auto border font-mono text-sm dark:bg-slate-900">
                             {/* ResultOutput.items is Uint8Array */}
                             {formatBytes(result.data.output?.items, schema?.resultProto)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
