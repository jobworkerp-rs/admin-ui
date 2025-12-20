import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, MoreHorizontal, Pencil, Trash } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkers, useDeleteWorker } from "@/hooks/use-workers";
import { useRunners } from "@/hooks/use-runners";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function WorkerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch workers
  const { data: workers, isLoading: isLoadingWorkers, error, isError } = useWorkers({ runnerIds: [], runnerTypes: [] }); // default empty filter

  // Fetch runners for mapping names
  const { data: runners } = useRunners();

  const deleteWorker = useDeleteWorker();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteWorker.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("workers.fields.name")}</TableHead>
              <TableHead>{t("workers.fields.runner")}</TableHead>
              <TableHead>{t("workers.fields.description")}</TableHead>
              <TableHead>{t("workers.fields.periodic")}</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead className="w-[80px]"></TableHead>
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
                  <TableCell className="font-medium">{worker.data?.name}</TableCell>
                  <TableCell>
                      <Badge variant="outline">
                          {getRunnerName(worker.data?.runnerId?.value)}
                      </Badge>
                  </TableCell>
                  <TableCell>{worker.data?.description}</TableCell>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate(`/workers/${worker.id?.value}`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => setDeleteId(worker.id?.value || null)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
              onClick={handleDelete}
              disabled={deleteWorker.isPending}
            >
              {deleteWorker.isPending ? "Deleting..." : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
