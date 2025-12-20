import { useRunners, useDeleteRunner } from "@/hooks/use-runners";
import { useCountWorkersByRunner } from "@/hooks/use-workers";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { RunnerType } from "@/lib/grpc/jobworkerp/data/common";

const WorkerCountBadge = ({ runnerId }: { runnerId: string }) => {
  const { data: count, isLoading } = useCountWorkersByRunner(runnerId);
  
  if (isLoading) return <span className="text-muted-foreground animate-pulse">...</span>;
  return <span className="font-medium">{count ?? 0}</span>;
};

const RunnerTypeBadge = ({ type }: { type: RunnerType }) => {
  const labels: Record<number, string> = {
    [RunnerType.PLUGIN]: "Plugin",
    [RunnerType.COMMAND]: "Command",
    [RunnerType.HTTP_REQUEST]: "HTTP",
    [RunnerType.GRPC_UNARY]: "gRPC",
    [RunnerType.DOCKER]: "Docker",
    [RunnerType.SLACK_POST_MESSAGE]: "Slack",
    [RunnerType.PYTHON_COMMAND]: "Python",
    [RunnerType.MCP_SERVER]: "MCP Server",
    [RunnerType.LLM_CHAT]: "LLM Chat",
    [RunnerType.LLM_COMPLETION]: "LLM Completion",
    [RunnerType.INLINE_WORKFLOW]: "Inline Workflow",
    [RunnerType.REUSABLE_WORKFLOW]: "Reusable Workflow",
    [RunnerType.CREATE_WORKFLOW]: "Create Workflow",
  };

  return (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      {labels[type] || "Unknown"}
    </div>
  );
};

export default function RunnerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: runners, isLoading, error } = useRunners();
  const deleteRunner = useDeleteRunner();

  if (isLoading) {
    return <div className="p-8 text-center">{t("common.loading")}</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error loading runners</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("runners.title")}</h2>
          <p className="text-muted-foreground">
            Manage runners and their configurations.
          </p>
        </div>
        <Button onClick={() => navigate("/runners/new")}>
          <Plus className="mr-2 h-4 w-4" /> {t("common.create")}
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Workers</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runners?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No runners found.
                </TableCell>
              </TableRow>
            ) : (
              runners?.map((runner) => (
                <TableRow key={runner.id?.value}>
                  <TableCell className="font-medium">
                    <Button variant="link" className="p-0 h-auto font-medium" onClick={() => navigate(`/runners/${runner.id?.value}`)}>
                        {runner.data?.name}
                    </Button>
                  </TableCell>
                  <TableCell>
                     {runner.data?.runnerType !== undefined && (
                        <RunnerTypeBadge type={runner.data.runnerType} />
                     )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate" title={runner.data?.description}>
                    {runner.data?.description}
                  </TableCell>
                  <TableCell>
                    {runner.id?.value && <WorkerCountBadge runnerId={runner.id.value} />}
                  </TableCell>
                  <TableCell>
                    {runner.id?.value && BigInt(runner.id.value) > 65536n ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the runner
                              "{runner.data?.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                if (runner.id?.value) {
                                  deleteRunner.mutate(runner.id.value);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <div title="Built-in runners cannot be deleted">
                         <Button variant="ghost" size="icon" disabled>
                           <Trash2 className="h-4 w-4 opacity-50" />
                         </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
