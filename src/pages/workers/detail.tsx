import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import * as protobuf from "protobufjs";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorker } from "@/hooks/use-workers";
import { useRunners } from "@/hooks/use-runners";
import { QueueType, ResponseType } from "@/lib/grpc/jobworkerp/data/common";
import { useToast } from "@/hooks/use-toast";

export default function WorkerDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const { data: worker, isLoading: isLoadingWorker, error } = useWorker(id);
  const { data: runners } = useRunners();

  const [runnerSettingsJson, setRunnerSettingsJson] = useState<Record<string, unknown> | null>(null);
  const [isProtoDecoding, setIsProtoDecoding] = useState(false);

  // Decode runner settings
  useEffect(() => {
    if (worker && runners && worker.data?.runnerId?.value) {
      const runner = runners.find(r => r.id?.value === worker.data?.runnerId?.value);
      if (runner?.data?.runnerSettingsProto && worker.data?.runnerSettings && worker.data.runnerSettings.length > 0) {
        try {
          setIsProtoDecoding(true);
          const parsed = protobuf.parse(runner.data.runnerSettingsProto);
          
          // Helper to find first type
          const findFirstType = (namespace: protobuf.NamespaceBase): protobuf.Type | null => {
             for (const nested of namespace.nestedArray) {
               if (nested instanceof protobuf.Type) {
                 return nested;
               }
               if (nested instanceof protobuf.Namespace) {
                 const found = findFirstType(nested);
                 if (found) return found;
               }
             }
             return null;
           };

           const type = findFirstType(parsed.root);
           if (type) {
               const decoded = type.decode(worker.data!.runnerSettings);
               setRunnerSettingsJson(type.toObject(decoded, { enums: String, defaults: true }));
           }
        } catch (e: unknown) {
             console.error("Failed to decode runner settings", e);
             toast({
                 variant: "destructive",
                 title: "Error decoding settings",
                 description: e instanceof Error ? e.message : String(e)
             });
        } finally {
             setIsProtoDecoding(false);
        }
      }
    }
  }, [worker, runners, toast]);

  if (isLoadingWorker) return <div>{t("common.loading")}</div>;
  if (error || !worker) return <div className="text-red-500">Error: {String(error || "Worker not found")}</div>;

  const runnerName = runners?.find(r => r.id?.value === worker.data?.runnerId?.value)?.data?.name || worker.data?.runnerId?.value;

  const getQueueType = (type: number) => {
      switch(type) {
          case QueueType.NORMAL: return "Normal (Memory)";
          case QueueType.WITH_BACKUP: return "With Backup (Redis)";
          case QueueType.DB_ONLY: return "DB Only";
          default: return type;
      }
  };

  const getResponseType = (type: number) => {
      switch(type) {
          case ResponseType.NO_RESULT: return "No Result";
          case ResponseType.DIRECT: return "Direct";
          default: return type;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/workers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{worker.data?.name}</h2>
        <Button onClick={() => navigate(`/workers/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="text-sm font-medium text-muted-foreground">{t("workers.fields.description")}</div>
                    <div>{worker.data?.description || "-"}</div>
                </div>
                <div>
                    <div className="text-sm font-medium text-muted-foreground">{t("workers.fields.runner")}</div>
                    <div className="text-lg">{runnerName}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <div className="text-sm font-medium text-muted-foreground">Queue Type</div>
                         <Badge variant="secondary">{getQueueType(worker.data?.queueType ?? 0)}</Badge>
                    </div>
                    <div>
                         <div className="text-sm font-medium text-muted-foreground">Response Type</div>
                         <Badge variant="outline">{getResponseType(worker.data?.responseType ?? 0)}</Badge>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                         <div className="text-sm font-medium text-muted-foreground">Channel</div>
                         <div>{worker.data?.channel || "-"}</div>
                    </div>
                    <div>
                         <div className="text-sm font-medium text-muted-foreground">{t("workers.fields.periodic")}</div>
                         <div>{worker.data?.periodicInterval ? `${worker.data.periodicInterval}ms` : "No"}</div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
             <CardHeader>
                <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                    <span>Store Success</span>
                    <Badge variant={worker.data?.storeSuccess ? "default" : "outline"}>{worker.data?.storeSuccess ? "Yes" : "No"}</Badge>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span>Store Failure</span>
                     <Badge variant={worker.data?.storeFailure ? "default" : "outline"}>{worker.data?.storeFailure ? "Yes" : "No"}</Badge>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span>Use Static</span>
                     <Badge variant={worker.data?.useStatic ? "default" : "outline"}>{worker.data?.useStatic ? "Yes" : "No"}</Badge>
                </div>
                 <div className="flex justify-between pb-2">
                    <span>Broadcast Results</span>
                     <Badge variant={worker.data?.broadcastResults ? "default" : "outline"}>{worker.data?.broadcastResults ? "Yes" : "No"}</Badge>
                </div>
            </CardContent>
        </Card>
      </div>

      {runnerSettingsJson && (
          <Card>
              <CardHeader>
                  <CardTitle>Runner Settings</CardTitle>
              </CardHeader>
              <CardContent>
                  <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                      {JSON.stringify(runnerSettingsJson, null, 2)}
                  </pre>
              </CardContent>
          </Card>
      )}
       {isProtoDecoding && <div>Decoding settings...</div>}
    </div>
  );
}
