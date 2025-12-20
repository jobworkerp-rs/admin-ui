import { useState } from "react";
import { Link } from "react-router-dom";
import { useJobResults, useDeleteJobResultsBulk } from "@/hooks/use-jobs";
import { useWorkers } from "@/hooks/use-workers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Trash2 } from "lucide-react";
import { ResultStatus, Priority } from "@/lib/grpc/jobworkerp/data/common";
import { FindJobResultListRequest, DeleteJobResultBulkRequest } from "@/lib/grpc/jobworkerp/service/job_result";
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
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 20;

export default function JobResultList() {
  const [page, setPage] = useState(0);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [uniqKey, setUniqKey] = useState<string>("");
  
  // Bulk Delete State
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: workers } = useWorkers({ runnerTypes: [], runnerIds: [] });
  
  // Construct Request
  const request: FindJobResultListRequest = {
    limit: ITEMS_PER_PAGE,
    offset: (page * ITEMS_PER_PAGE).toString(),
    workerIds: selectedWorkerId !== "all" ? [{ value: selectedWorkerId }] : [],
    statuses: selectedStatus !== "all" ? [parseInt(selectedStatus)] : [],
    priorities: selectedPriority !== "all" ? [parseInt(selectedPriority)] : [],
    uniqKey: uniqKey || undefined,
  };

  const { data: results, isLoading, refetch } = useJobResults(request);
  const deleteBulkMutation = useDeleteJobResultsBulk();

  const handleBulkDelete = async () => {
    const deleteRequest: DeleteJobResultBulkRequest = {
      workerIds: request.workerIds,
      statuses: request.statuses,
    };

    try {
      const response = await deleteBulkMutation.mutateAsync(deleteRequest);
      toast({
        title: "Bulk Delete Successful",
        description: `Deleted ${response.deletedCount} job results.`,
      });
      setIsBulkDeleteDialogOpen(false);
      refetch();
    } catch {
      toast({
        title: "Bulk Delete Failed",
        description: "An error occurred while deleting job results.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: ResultStatus) => {
    switch (status) {
      case ResultStatus.SUCCESS:
        return <Badge className="bg-green-500">Success</Badge>;
      case ResultStatus.FATAL_ERROR:
      case ResultStatus.OTHER_ERROR:
      case ResultStatus.ABORT:
        return <Badge variant="destructive">Error</Badge>;
      case ResultStatus.ERROR_AND_RETRY:
      case ResultStatus.MAX_RETRY:
        return <Badge variant="destructive">Retry Failed</Badge>;
      case ResultStatus.CANCELLED:
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Job Results</h2>
          <p className="text-muted-foreground">
            View history and results of completed jobs.
          </p>
        </div>
        <div className="flex items-center space-x-2">
           <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          
          <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Bulk Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete job results matching your current 
                  <strong> Worker</strong> and <strong> Status</strong> filters.
                  <br/><br/>
                  Current Filters:
                  <ul className="list-disc pl-5 mt-2">
                    <li>Worker: {selectedWorkerId === "all" ? "All" : workers?.find(w => w.id?.value === selectedWorkerId)?.data?.name || selectedWorkerId}</li>
                    <li>Status: {selectedStatus === "all" ? "All" : ResultsStatusLabel(selectedStatus)}</li>
                  </ul>
                  <br/>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
          <CardDescription>Filter by worker, status, priority, or unique key.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
             <div className="space-y-2">
              <Label>Worker</Label>
              <Select value={selectedWorkerId} onValueChange={(v) => { setSelectedWorkerId(v); setPage(0); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {workers?.map((worker) => (
                    <SelectItem key={worker.id?.value} value={worker.id?.value || ""}>
                      {worker.data?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setPage(0); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={ResultStatus.SUCCESS.toString()}>Success</SelectItem>
                  <SelectItem value={ResultStatus.FATAL_ERROR.toString()}>Fatal Error</SelectItem>
                  <SelectItem value={ResultStatus.OTHER_ERROR.toString()}>Other Error</SelectItem>
                  <SelectItem value={ResultStatus.CANCELLED.toString()}>Cancelled</SelectItem>
                  <SelectItem value={ResultStatus.ERROR_AND_RETRY.toString()}>Error & Retry</SelectItem>
                  <SelectItem value={ResultStatus.MAX_RETRY.toString()}>Max Retry</SelectItem>
                </SelectContent>
              </Select>
            </div>

             <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={selectedPriority} onValueChange={(v) => { setSelectedPriority(v); setPage(0); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={Priority.PRIORITY_HIGH.toString()}>High</SelectItem>
                    <SelectItem value={Priority.PRIORITY_MEDIUM.toString()}>Medium</SelectItem>
                    <SelectItem value={Priority.PRIORITY_LOW.toString()}>Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                <Label>Unique Key</Label>
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input 
                        placeholder="Search key..." 
                        value={uniqKey} 
                        onChange={(e) => { setUniqKey(e.target.value); setPage(0); }}
                    />
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Loading results...
                  </TableCell>
                </TableRow>
              ) : results?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                results?.map((result) => (
                  <TableRow key={result.id?.value}>
                     <TableCell className="font-mono text-xs">
                        <Link to={`/results/${result.id?.value}`} className="hover:underline text-primary">
                            {result.data?.jobId?.value}
                        </Link>
                    </TableCell>
                    <TableCell>
                         {workers?.find(w => w.id?.value === result.data?.workerId?.value)?.data?.name || result.data?.workerId?.value}
                    </TableCell>
                    <TableCell>
                      {result.data?.status !== undefined && getStatusBadge(result.data.status)}
                    </TableCell>
                     <TableCell>
                        <Badge variant="outline">{result.data?.priority !== undefined ? Priority[result.data.priority] : 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell>
                       {result.data?.endTime && result.data.endTime !== "0" ? new Date(parseInt(result.data.endTime)).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" asChild>
                         <Link to={`/results/${result.id?.value}`}>
                            Details
                         </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <div className="text-sm font-medium">Page {page + 1}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={!results || results.length < ITEMS_PER_PAGE}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function ResultsStatusLabel(status: string) {
    // Helper to display status text in alert dialog
    // Implementation can be simple
    return status;
}
