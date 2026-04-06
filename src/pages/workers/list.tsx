import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useWorkers, useDeleteWorker, useReleaseStaticWorker } from "@/hooks/use-workers";
import { useRunners } from "@/hooks/use-runners";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function WorkerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // const [deleteId, setDeleteId] = useState<string | null>(null); // Removed unused state
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  // Fetch workers
  const { data: workers, isLoading: isLoadingWorkers, error, isError } = useWorkers({ 
    runnerIds: [], 
    runnerTypes: [],
    limit: LIMIT,
    offset: (page * LIMIT).toString(),
  });


  // Fetch runners for mapping names
  const { data: runners } = useRunners();

  const deleteWorker = useDeleteWorker();
  const releaseWorker = useReleaseStaticWorker();

  // const handleDelete = async () => { ... } // Removed unused function

  const getRunnerName = (runnerId?: string) => {
      if (!runnerId) return "N/A";
      const runner = runners?.find(r => r.id?.value === runnerId);
      return runner?.data?.name || `ID: ${runnerId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("workers.title")}</h2>
          <p className="text-muted-foreground">Manage your background workers.</p>
        </div>
        <Button onClick={() => navigate("/workers/new")}>
          <Plus className="mr-2 h-4 w-4" /> {t("common.create")}
        </Button>
      </div>

      <div className="border rounded-md">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[15%]">{t("workers.fields.name")}</TableHead>
              <TableHead className="w-[12%]">{t("workers.fields.runner")}</TableHead>
              <TableHead className="w-[43%]">{t("workers.fields.description")}</TableHead>
              <TableHead className="w-[10%]">{t("workers.fields.periodic")}</TableHead>
              <TableHead className="w-[10%]">Queue</TableHead>
              <TableHead className="w-[10%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingWorkers ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : isError ? (
                <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-red-500">
                  Error loading workers: {String(error)}
                </TableCell>
              </TableRow>
            ) : (!workers || workers.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No workers found.
                </TableCell>
              </TableRow>
            ) : (
                workers?.map((worker) => (
                <TableRow key={worker.id?.value}>
                  <TableCell className="font-medium truncate">
                      <Link to={`/workers/${worker.id?.value}`} className="hover:underline text-primary">
                          {worker.data?.name}
                      </Link>
                  </TableCell>
                  <TableCell className="truncate">
                      <Badge variant="outline">
                          {getRunnerName(worker.data?.runnerId?.value)}
                      </Badge>
                  </TableCell>
                  <TableCell className="break-words whitespace-normal">{worker.data?.description}</TableCell>
                  <TableCell>
                      {worker.data?.periodicInterval && worker.data.periodicInterval > 0 
                        ? `${worker.data.periodicInterval}ms`
                        : "No"}
                  </TableCell>
                   <TableCell>
                      {/* Using simple text for raw enum value for now, could be mapped */}
                      {worker.data?.queueType}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {worker.data?.useStatic && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-orange-600 hover:text-orange-700 hover:bg-orange-100" aria-label="Release static worker pool">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("workers.release_confirm_title")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("workers.release_confirm_desc", { name: worker.data?.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={() => {
                                  if (worker.id?.value) {
                                    releaseWorker.mutate(worker.id.value);
                                  }
                                }}
                                disabled={releaseWorker.isPending}
                              >
                                {releaseWorker.isPending ? "Releasing..." : t("workers.release")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete worker">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("common.delete_confirm_title")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("common.delete_confirm_desc")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                if (worker.id?.value) {
                                  deleteWorker.mutate(worker.id.value);
                                }
                              }}
                              disabled={deleteWorker.isPending}
                            >
                              {deleteWorker.isPending ? "Deleting..." : t("common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

      </div>

      <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || isLoadingWorkers}
          >
              Previous
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => p + 1)}
            disabled={!workers || workers.length < LIMIT || isLoadingWorkers}
          >
              Next
          </Button>
      </div>
    </div>
  );
}
