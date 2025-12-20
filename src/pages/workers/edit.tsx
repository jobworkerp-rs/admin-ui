
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as protobuf from "protobufjs";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { DynamicProtoForm } from "@/components/dynamic-proto/dynamic-proto-form";

import { useWorker, useCreateWorker, useUpdateWorker, useChannelList } from "@/hooks/use-workers";
import { useRunners } from "@/hooks/use-runners";
import { WorkerData } from "@/lib/grpc/jobworkerp/data/worker";
import { RunnerId } from "@/lib/grpc/jobworkerp/data/runner";
import { QueueType, ResponseType } from "@/lib/grpc/jobworkerp/data/common";

// Form Schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  runnerId: z.string().min(1, "Runner is required"),
  periodicInterval: z.number().min(0),
  channel: z.string().optional(),
  queueType: z.number(), // Enum as number
  responseType: z.number(), // Enum as number
  storeSuccess: z.boolean(),
  storeFailure: z.boolean(),
  useStatic: z.boolean(),
  broadcastResults: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export default function WorkerEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const { id } = params;
  const isEditMode = !!id;
  const { toast } = useToast(); 

  // Fetch data
  const { data: worker, isLoading: isLoadingWorker } = useWorker(id);
  const { data: runners, isLoading: isLoadingRunners } = useRunners();
  const { data: channelList } = useChannelList();
  
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();

  const [runnerSettingsJson, setRunnerSettingsJson] = useState<Record<string, unknown>>({});
  const [isProtoDecoding, setIsProtoDecoding] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      runnerId: "",
      periodicInterval: 0,
      channel: "",
      queueType: QueueType.NORMAL,
      responseType: ResponseType.NO_RESULT,
      storeSuccess: false,
      storeFailure: false,
      useStatic: false,
      broadcastResults: false,
    },
  });

  const selectedRunnerId = form.watch("runnerId");
  const selectedRunner = runners?.find((r) => r.id?.value === selectedRunnerId);
  
  const watchedResponseType = form.watch("responseType");
  const watchedQueueType = form.watch("queueType");
  const isDirectResponse = watchedResponseType === ResponseType.DIRECT;
  
  // Auto-reset queueType to NORMAL if DB_ONLY queue selected with Direct Response
  // Note: WITH_BACKUP is allowed because it uses Redis, not DB
  useEffect(() => {
    if (isDirectResponse && watchedQueueType === QueueType.DB_ONLY) {
      form.setValue("queueType", QueueType.NORMAL);
    }
  }, [isDirectResponse, watchedQueueType, form]);

  // Load existing worker data
  useEffect(() => {
    if (worker && isEditMode && runners) {
      form.reset({
        name: worker.data?.name ?? '',
        description: worker.data?.description ?? '',
        runnerId: String(worker.data?.runnerId?.value ?? ''),
        periodicInterval: worker.data?.periodicInterval ?? 0,
        channel: worker.data?.channel ?? '',
        queueType: worker.data?.queueType ?? 0,
        responseType: worker.data?.responseType ?? 0,
        storeSuccess: worker.data?.storeSuccess ?? false,
        storeFailure: worker.data?.storeFailure ?? false,
        useStatic: worker.data?.useStatic ?? false,
        broadcastResults: worker.data?.broadcastResults ?? false,
      });

      // Decode runner settings
      if (worker.data?.runnerId?.value) {
        const runner = runners.find(r => r.id?.value === worker.data?.runnerId?.value);
        if (runner?.data?.runnerSettingsProto && worker.data?.runnerSettings && worker.data.runnerSettings.length > 0) {
           try {
               setIsProtoDecoding(true);
               const parsed = protobuf.parse(runner.data.runnerSettingsProto);
               // Heuristic to find message type (same as DynamicProtoForm)
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
    }
  }, [worker, isEditMode, runners, form, toast]);

  // Reset settings when runner changes in create mode (or edit mode if user changes runner, which is risky but possible)
  useEffect(() => {
      // Only reset if user explicitly changes runner and it doesn't match loaded worker
      if (selectedRunnerId && worker?.data?.runnerId?.value !== selectedRunnerId) {
          setRunnerSettingsJson({});
      }
  }, [selectedRunnerId, worker]);


  const onSubmit = async (values: FormValues) => {
     let encodedSettings = new Uint8Array();

     // Encode runner settings
     if (selectedRunner?.data?.runnerSettingsProto && Object.keys(runnerSettingsJson).length > 0) {
         try {
             const parsed = protobuf.parse(selectedRunner.data.runnerSettingsProto);
             // Logic to find type (duplicated, could be util)
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
                  const message = type.fromObject(runnerSettingsJson);
                  const encoded = type.encode(message).finish();
                  encodedSettings = new Uint8Array(encoded);
              }
         } catch(e: unknown) {
             console.error("Encoding error", e);
             toast({
                 variant: "destructive",
                 title: "Error encoding settings",
                 description: e instanceof Error ? e.message : String(e)
             });
             return;
         }
     }

     const workerData = WorkerData.create({
         name: values.name,
         description: values.description,
         runnerId: RunnerId.create({ value: values.runnerId }),
         periodicInterval: values.periodicInterval,
         channel: values.channel || undefined, // undefined if empty string
         queueType: values.queueType,
         responseType: values.responseType,
         storeSuccess: values.storeSuccess,
         storeFailure: values.storeFailure,
         useStatic: values.useStatic,
         broadcastResults: values.broadcastResults,
         runnerSettings: encodedSettings,
         retryPolicy: undefined // TODO: implement retry policy form
     });

     try {
         if (isEditMode && id) {
             await updateWorker.mutateAsync({ id, data: workerData });
             toast({ title: t("common.updated") });
         } else {
             await createWorker.mutateAsync(workerData);
             toast({ title: t("common.created") });
         }
         navigate("/workers");
     } catch (e: unknown) {
         console.error(e);
         toast({
             variant: "destructive",
             title: "Error",
             description: e instanceof Error ? e.message : "Something went wrong"
         })
     }
  };

  if (isLoadingWorker || isLoadingRunners || isProtoDecoding) {
      return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">
        {isEditMode ? t("workers.edit") : t("workers.new")}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t("workers.fields.name")}</FormLabel>
                        <FormControl>
                        <Input placeholder="My Worker" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="runnerId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t("workers.fields.runner")}</FormLabel>
                        <Select 
                            key={`runner-select-${field.value}`} 
                            onValueChange={field.onChange} 
                            value={field.value} 
                            disabled={isEditMode}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a runner" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {runners?.map((runner) => (
                            <SelectItem key={runner.id?.value} value={runner.id?.value || ""}>
                                {runner.data?.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t("workers.fields.description")}</FormLabel>
                    <FormControl>
                    <Textarea placeholder="Calculates things..." {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            {/* Runner Settings Dynamic Form */}
            {selectedRunner?.data?.runnerSettingsProto && (
                <div className="border p-4 rounded-md bg-muted/20">
                    <h3 className="font-semibold mb-3">Runner Settings</h3>
                    <DynamicProtoForm 
                        protoDefinition={selectedRunner.data.runnerSettingsProto}
                        value={runnerSettingsJson}
                        onChange={setRunnerSettingsJson}
                    />
                </div>
            )}

            {/* Execution Options */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="periodicInterval"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t("workers.fields.periodic")} (ms)</FormLabel>
                        <FormControl>
                        <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                        </FormControl>
                        <FormDescription>0 for non-periodic</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Channel</FormLabel>
                        <FormControl>
                            <Select 
                                key={`channel-select-${field.value}`}
                                value={field.value || ""} 
                                onValueChange={field.onChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a channel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Add currently selected value if not in list to avoid hidden state */}
                                    {field.value && !channelList?.includes(field.value) && (
                                        <SelectItem value={field.value}>{field.value}</SelectItem>
                                    )}
                                    {channelList?.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="queueType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Queue Type</FormLabel>
                        <Select key={`queueType-${field.value}`} onValueChange={(v) => field.onChange(parseInt(v))} value={(field.value ?? 0).toString()}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                             <SelectItem value={QueueType.NORMAL.toString()}>Normal (Memory)</SelectItem>
                             <SelectItem value={QueueType.WITH_BACKUP.toString()}>With Backup (Redis)</SelectItem>
                             <SelectItem value={QueueType.DB_ONLY.toString()} disabled={isDirectResponse}>DB Only {isDirectResponse && "(Not available with Direct Response)"}</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="responseType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Response Type</FormLabel>
                         <Select key={`responseType-${field.value}`} onValueChange={(v) => field.onChange(parseInt(v))} value={(field.value ?? 0).toString()}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                             <SelectItem value={ResponseType.NO_RESULT.toString()}>No Result</SelectItem>
                             <SelectItem value={ResponseType.DIRECT.toString()}>Direct Response</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
             </div>
             
             {/* Booleans */}
             <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="storeSuccess"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Store Success</FormLabel>
                        </div>
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="storeFailure"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Store Failure</FormLabel>
                        </div>
                        </FormItem>
                    )}
                    />
             </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => navigate("/workers")}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createWorker.isPending || updateWorker.isPending}>
              {isEditMode ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
