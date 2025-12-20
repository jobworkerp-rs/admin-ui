import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRunner, useCreateRunner } from "@/hooks/use-runners";
import { RunnerType } from "@/lib/grpc/jobworkerp/data/common";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  runnerType: z.number(),
  definition: z.string(),
});

type RunnerFormValues = z.infer<typeof formSchema>;

export default function RunnerEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const { data: runner, isLoading: isLoadingRunner } = useRunner(id);
  const createRunner = useCreateRunner();

  const form = useForm<RunnerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      runnerType: RunnerType.MCP_SERVER,
      definition: "",
    },
  });

  const onSubmit = async (data: RunnerFormValues) => {
    if (isEditMode) return; // Should not happen as form is hidden in edit mode

    try {
      await createRunner.mutateAsync({
        name: data.name,
        description: data.description,
        runnerType: data.runnerType,
        definition: data.definition,
      });
      navigate("/runners");
    } catch (error) {
      console.error("Failed to create runner:", error);
    }
  };

  if (isEditMode && isLoadingRunner) {
    return <div className="p-8 text-center">{t("common.loading")}</div>;
  }

  // Display details for existing runner
  if (isEditMode && runner) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="icon" onClick={() => navigate("/runners")}>
                    <ArrowLeft className="h-4 w-4" />
                 </Button>
                 <div>
                    <h2 className="text-3xl font-bold tracking-tight">Runner Details</h2>
                    <p className="text-muted-foreground">{runner.data?.name}</p>
                 </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Name</div>
                        <div>{runner.data?.name}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Type</div>
                        <div>{runner.data?.runnerType !== undefined ? `${RunnerType[runner.data.runnerType]} (${runner.data.runnerType})` : '-'}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Description</div>
                        <div>{runner.data?.description}</div>
                    </div>
                     <div>
                        <div className="text-sm font-medium text-muted-foreground">Definition</div>
                        <div className="font-mono text-sm bg-muted p-2 rounded break-all">{runner.data?.definition}</div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Settings Schema (Protobuf)</CardTitle>
                    <CardDescription>
                        Configuration schema used by Workers of this Runner.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <pre className="bg-muted p-4 rounded-md overflow-auto text-xs font-mono max-h-[300px]">
                        {runner.data?.runnerSettingsProto || "No settings schema defined."}
                     </pre>
                </CardContent>
            </Card>

             <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Methods</CardTitle>
                    <CardDescription>
                        Available methods and their argument/result schemas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {runner.data?.methodProtoMap && Object.entries(runner.data.methodProtoMap.schemas).length > 0 ? (
                        <div className="space-y-6">
                             {Object.entries(runner.data.methodProtoMap.schemas).map(([methodName, schema]) => (
                                 <div key={methodName} className="border rounded-md p-4">
                                     <h4 className="font-bold text-lg mb-2">{methodName}</h4>
                                     {schema.description && <p className="text-muted-foreground mb-4">{schema.description}</p>}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                             <div className="text-xs font-semibold mb-1">Arguments Proto</div>
                                             <pre className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-[200px]">{schema.argsProto}</pre>
                                         </div>
                                         <div>
                                             <div className="text-xs font-semibold mb-1">Result Proto</div>
                                             <pre className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-[200px]">{schema.resultProto}</pre>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    ) : (
                        <div className="text-muted-foreground">No methods defined.</div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  // Create Form
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("runners.new")}</h2>
        <p className="text-muted-foreground">Create a new runner instance.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("runners.fields.name")}</FormLabel>
                <FormControl>
                  <Input placeholder="my-runner" {...field} />
                </FormControl>
                <FormDescription>
                  Unique identifier for this runner.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("runners.fields.description")}</FormLabel>
                <FormControl>
                  <Textarea placeholder="Runner description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="runnerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("runners.fields.type")}</FormLabel>
                <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a runner type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={String(RunnerType.MCP_SERVER)}>MCP Server</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Currently, only MCP Server runners can be created via the Admin UI.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="definition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Definition</FormLabel>
                <FormControl>
                  <Input placeholder="/path/to/plugin or command" {...field} />
                </FormControl>
                <FormDescription>
                   For Plugin/MCP: Path to the file. For Command: The command to execute.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <Button variant="outline" type="button" onClick={() => navigate("/runners")}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createRunner.isPending}>
              {createRunner.isPending ? "Creating..." : t("common.create")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
