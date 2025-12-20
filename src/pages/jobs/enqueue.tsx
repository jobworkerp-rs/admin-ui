import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWorkers } from "@/hooks/use-workers";
import { useRunner } from "@/hooks/use-runners";
import { useMutation } from "@tanstack/react-query";
import { jobClient } from "@/lib/client";
import { JobRequest } from "@/lib/grpc/jobworkerp/service/job";
import { Priority, ResponseType, ResultStatus } from "@/lib/grpc/jobworkerp/data/common";
import { JobResult } from "@/lib/grpc/jobworkerp/data/job_result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicProtoForm } from "@/components/dynamic-proto/dynamic-proto-form";
import { Loader2, ArrowLeft } from "lucide-react";
import * as protobuf from "protobufjs";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";

// Helper to find first type in proto definition
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

// Helper to format bytes
const formatBytes = (bytes?: Uint8Array, protoSchema?: string) => {
    if (!bytes || bytes.length === 0) return "Empty";
    if (protoSchema) {
        try {
            const root = protobuf.parse(protoSchema).root;
            const type = findFirstType(root);
            if (type) {
                const message = type.decode(bytes);
                return JSON.stringify(message.toJSON(), null, 2);
            }
        } catch (e) { console.warn(e); }
    }
    try {
        const text = new TextDecoder().decode(bytes);
        try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
    } catch { return `[Binary] ${bytes.length} bytes`; }
};

export default function JobEnqueue() {
  const navigate = useNavigate();
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const retryData = (location.state as any)?.retryJobData;

  // Form States
  const [workerId, setWorkerId] = useState<string>(() => retryData?.workerId || "");
  const [using, setUsing] = useState<string>("");
  const [jobArgs, setJobArgs] = useState<Record<string, unknown>>({});
  const [priority, setPriority] = useState<string>(() => retryData?.priority !== undefined ? String(retryData.priority) : String(Priority.PRIORITY_MEDIUM));
  const [runAfterTime, setRunAfterTime] = useState<string>("");
  const [timeout, setTimeout] = useState<string>(() => retryData?.timeout ? String(retryData.timeout) : "0");
  const [uniqKey, setUniqKey] = useState<string>("");

  // Execution Dialog State
  const [isExecutionOpen, setIsExecutionOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState<JobResult | undefined>(undefined);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const { data: workers } = useWorkers({ runnerIds: [], runnerTypes: [] });

  const selectedWorker = workers?.find(w => w.id?.value === workerId);
  const runnerId = selectedWorker?.data?.runnerId?.value;

  const { data: runner } = useRunner(runnerId);

  // Auto-select method if only one exists
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = runner as any;
    if (r?.data?.methodProtoMap?.schemas) {
      const methods = Object.keys(r.data.methodProtoMap.schemas);
      if (methods.length === 1 && using !== methods[0]) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUsing(methods[0]);
      }
    }
  }, [runner, using]);

  useEffect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = runner as any;
      if (retryData && r?.data?.methodProtoMap?.schemas) {
          let targetUsing = retryData.using;
          if (!targetUsing && using) targetUsing = using;
          
          if (targetUsing && using !== targetUsing) {
            
              // eslint-disable-next-line react-hooks/set-state-in-effect
              setUsing(targetUsing);
              return;
          }
           
           if (targetUsing && using === targetUsing) {
               if (Object.keys(jobArgs).length === 0 && retryData.args) {
                   const schemaKey = targetUsing;
                   const schema = r.data.methodProtoMap.schemas[schemaKey];
                   if (schema) {
                      try {
                          const root = protobuf.parse(schema.argsProto).root;
                          const type = findFirstType(root);
                          if (type) {
                             const decoded = type.decode(retryData.args);
                             const obj = type.toObject(decoded, { defaults: true, enums: String, longs: String });
                             setJobArgs(obj);
                             // Clear retry data
                             navigate(location.pathname, { replace: true, state: {} });
                          }
                      } catch(e) { console.error(e); }
                   }
               }
           }
      }
  }, [retryData, runner, using, jobArgs, navigate, location.pathname]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methodSchema = using && (runner as any)?.data?.methodProtoMap?.schemas ? (runner as any).data.methodProtoMap.schemas[using] : null;

  const enqueueMutation = useMutation({
    mutationFn: async () => {
      // Encode args
      let encodedArgs = new Uint8Array(0);
      if (methodSchema?.argsProto) {
        const root = protobuf.parse(methodSchema.argsProto).root;
        const type = findFirstType(root);
        if (type) {
            const errMsg = type.verify(jobArgs);
            if (errMsg) throw new Error(`Invalid arguments: ${errMsg}`);
            const message = type.create(jobArgs);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            encodedArgs = type.encode(message).finish() as any;
        }
      }

      let runAfterMs = "0";
      if (runAfterTime) {
          const d = new Date(runAfterTime);
          if (!isNaN(d.getTime())) {
              runAfterMs = d.getTime().toString();
          }
      }

      const req = JobRequest.create({
        workerId: { value: workerId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: encodedArgs as any,
        uniqKey: uniqKey || undefined,
        priority: Number(priority),
        timeout: timeout ? String(Number(timeout)) : undefined,
        runAfterTime: runAfterMs !== "0" ? runAfterMs : undefined,
        using: using || undefined,
      });

      return await jobClient.enqueue(req);
    },
    onError: (err) => {
      if (!isExecutionOpen) {
          toast({ variant: "destructive", title: "Failed to enqueue job", description: String(err) });
      }
    }
  });

  const handleEnqueue = () => {
    if (!workerId) {
        toast({ variant: "destructive", title: "Worker is required" });
        return;
    }
    
    if (selectedWorker?.data?.responseType === ResponseType.DIRECT) {
        setIsExecutionOpen(true);
        setExecutionResult(undefined);
        setExecutionError(null);
        
        enqueueMutation.mutateAsync()
        .then((res) => {
            if (res.result) {
                setExecutionResult(res.result);
            } else {
                setExecutionError("Job finished but no result returned in response.");
            }
        })
        .catch((err) => {
            setExecutionError(String(err));
        });
    } else {
        enqueueMutation.mutate(undefined, {
            onSuccess: () => {
                toast({ title: "Job enqueued successfully" });
                navigate("/jobs");
            }
        });
    }
  };

  const statusColors: Record<number, string> = {
      [ResultStatus.SUCCESS]: "bg-green-500",
      [ResultStatus.ERROR_AND_RETRY]: "bg-orange-500",
      [ResultStatus.FATAL_ERROR]: "bg-red-500",
      [ResultStatus.ABORT]: "bg-gray-500",
      [ResultStatus.MAX_RETRY]: "bg-red-700",
      [ResultStatus.OTHER_ERROR]: "bg-red-400",
      [ResultStatus.CANCELLED]: "bg-gray-400",
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Enqueue New Job</h2>
            <p className="text-muted-foreground">Create and schedule a new job.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Job Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Worker</Label>
                    <Select value={workerId} onValueChange={(val) => {
                        setWorkerId(val);
                        setUsing("");
                        setJobArgs({});
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a worker" />
                        </SelectTrigger>
                        <SelectContent>
                            {workers?.map(w => (
                                <SelectItem key={w.id?.value} value={w.id?.value || ""}>
                                    {w.data?.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(runner as any)?.data?.methodProtoMap?.schemas && Object.keys((runner as any).data.methodProtoMap.schemas).length > 0 && (
                    <div className="space-y-2">
                        <Label>Method (Using)</Label>
                        <Select value={using} onValueChange={setUsing}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a method" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {Object.keys((runner as any).data.methodProtoMap.schemas).map((key: string) => (
                                    <SelectItem key={key} value={key}>{key}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {methodSchema && (
                    <div className="space-y-2 border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
                        <Label className="mb-2 block font-semibold">Arguments</Label>
                        <DynamicProtoForm 
                            protoDefinition={methodSchema.argsProto} 
                            value={jobArgs} 
                            onChange={setJobArgs} 
                        />
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={String(Priority.PRIORITY_MEDIUM)}>Normal ({Priority.PRIORITY_MEDIUM})</SelectItem>
                            <SelectItem value={String(Priority.PRIORITY_HIGH)}>High ({Priority.PRIORITY_HIGH})</SelectItem>
                            <SelectItem value={String(Priority.PRIORITY_LOW)}>Low ({Priority.PRIORITY_LOW})</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Run After (Optional)</Label>
                    <Input 
                        type="datetime-local" 
                        value={runAfterTime}
                        onChange={(e) => setRunAfterTime(e.target.value)}
                    />
                </div>

                 <div className="space-y-2">
                    <Label>Timeout (ms)</Label>
                    <Input 
                        type="number"
                        value={timeout}
                        onChange={(e) => setTimeout(e.target.value)}
                    />
                </div>

                 <div className="space-y-2">
                    <Label>Unique Key (Optional)</Label>
                    <Input 
                        value={uniqKey}
                        onChange={(e) => setUniqKey(e.target.value)}
                        placeholder="Deduplication key"
                    />
                </div>

                <Button className="w-full mt-4" onClick={handleEnqueue} disabled={enqueueMutation.isPending}>
                    {enqueueMutation.isPending && !isExecutionOpen && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedWorker?.data?.responseType === ResponseType.DIRECT ? "Run Direct Job" : "Enqueue Job"}
                </Button>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isExecutionOpen} onOpenChange={(open) => {
          if (!open && !enqueueMutation.isPending) setIsExecutionOpen(false);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Executing Job</DialogTitle>
                <DialogDescription>
                    {enqueueMutation.isPending ? "Waiting for direct response..." : "Execution completed."}
                </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto py-4">
                {enqueueMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Running on worker...</p>
                    </div>
                ) : executionResult ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Status:</span>
                            <Badge className={statusColors[executionResult.data?.status || 0]} >
                                {ResultStatus[executionResult.data?.status || 0]}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <Label>Output:</Label>
                            <div className="h-[300px] w-full rounded-md border p-4 bg-muted/50 font-mono text-sm overflow-auto">
                                <pre>{formatBytes(executionResult.data?.output?.items, methodSchema?.resultProto)}</pre>
                            </div>
                        </div>
                    </div>
                ) : executionError ? (
                     <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                        <p className="font-semibold">Execution Failed</p>
                        <p>{executionError}</p>
                    </div>
                ) : null}
            </div>

            <DialogFooter>
                <Button 
                    onClick={() => setIsExecutionOpen(false)} 
                    disabled={enqueueMutation.isPending}
                >
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
