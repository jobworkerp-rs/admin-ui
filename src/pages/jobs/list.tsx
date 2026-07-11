import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useJobStatusList, usePurgeStaleJobs } from '@/hooks/use-jobs';
import { useWorkers } from '@/hooks/use-workers';
import { JobProcessingStatus } from '@/lib/grpc/jobworkerp/data/common';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, RefreshCw, Trash2 } from 'lucide-react';
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
import { toast } from "@/hooks/use-toast";

export default function JobList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [filterStatus, setFilterStatus] = useState<JobProcessingStatus | undefined>(undefined);
  const [filterWorkerId, setFilterWorkerId] = useState<string | "all">("all");

  const [page, setPage] = useState(0);
  const LIMIT = 20;
  
  const [staleThresholdHours, setStaleThresholdHours] = useState<number>(24);
  const [orphanedOnly, setOrphanedOnly] = useState<boolean>(false);

  const { data: workers } = useWorkers({ runnerIds: [], runnerTypes: [] });

  const { data: jobs, isLoading, error, refetch, isFetching } = useJobStatusList({
    status: filterStatus,
    workerId: filterWorkerId === "all" ? undefined : filterWorkerId,
    limit: LIMIT,
    offset: page * LIMIT,
    descending: true,
  });

  const purgeMutation = usePurgeStaleJobs();

  const handlePurge = () => {
    if (purgeMutation.isPending) return;
    const minThresholdHours = orphanedOnly ? 0 : 1;
    if (!Number.isInteger(staleThresholdHours) || staleThresholdHours < minThresholdHours) {
      toast({ variant: "destructive", title: "Invalid Input", description: `Stale threshold must be an integer >= ${minThresholdHours}.` });
      return;
    }
    purgeMutation.mutate({
        staleThresholdHours: String(staleThresholdHours),
        orphanedOnly: orphanedOnly,
    }, {
        onSuccess: (res) => {
            toast({ title: "Purge completed", description: res.message || `Marked ${res.markedCount} records.` });
            refetch();
        },
        onError: (err) => {
            toast({ variant: "destructive", title: "Purge failed", description: String(err) });
        }
    });
  };

  const getWorkerName = (id: string) => {
    return workers?.find(w => w.id?.value === id)?.data?.name || id;
  };

  const statusMap: Record<number, { label: string, color: string }> = {
    [JobProcessingStatus.UNKNOWN]: { label: 'Unknown', color: 'bg-gray-500' },
    [JobProcessingStatus.PENDING]: { label: 'Pending', color: 'bg-yellow-500' },
    [JobProcessingStatus.RUNNING]: { label: 'Running', color: 'bg-blue-500' },
    [JobProcessingStatus.WAIT_RESULT]: { label: 'Wait Result', color: 'bg-indigo-500' },
    [JobProcessingStatus.CANCELLING]: { label: 'Cancelling', color: 'bg-red-400' },
  };

  const formatDate = (msStatsStr: string) => {
    const ms = parseInt(msStatsStr);
    if (isNaN(ms) || ms === 0) return '-';
    return new Date(ms).toLocaleString();
  };

  if (error) {
      return (
          <div className="p-4 text-red-500">
              Error loading jobs: {String(error)}
              <Button onClick={() => refetch()} variant="outline" className="ml-4">Retry</Button>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("common.jobs") || "Jobs"}</h2>
          <p className="text-muted-foreground">Monitor job execution status and history.</p>
        </div>
        <div className="flex gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Purge Stale Jobs
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Purge Stale Job Records?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will logically delete stale job_processing_status records older than the specified threshold.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="stale-threshold">Stale Threshold (Hours)</Label>
                            <Input
                                id="stale-threshold"
                                type="number"
                                min={orphanedOnly ? 0 : 1}
                                value={staleThresholdHours}
                                onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v)) setStaleThresholdHours(Math.max(orphanedOnly ? 0 : 1, Math.floor(v))); }}
                            />
                            <p className="text-sm text-muted-foreground">
                                Records not updated for {staleThresholdHours} hours will be candidates.
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="orphaned-only"
                                checked={orphanedOnly}
                                onCheckedChange={(c) => {
                                    const checked = !!c;
                                    setOrphanedOnly(checked);
                                    if (!checked && staleThresholdHours < 1) setStaleThresholdHours(1);
                                }}
                            />
                            <Label htmlFor="orphaned-only">Orphaned only (safer: only purge records whose jobs no longer exist)</Label>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurge} disabled={purgeMutation.isPending} className="bg-destructive hover:bg-destructive/90">
                            Confirm Purge
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={() => navigate("/jobs/new")}>
                <Play className="mr-2 h-4 w-4" /> Enqueue Job
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
            <div className="w-[200px]">
                <Select value={filterWorkerId} onValueChange={(v) => { setFilterWorkerId(v); setPage(0); }}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Workers" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Workers</SelectItem>
                        {workers?.map(w => (
                            <SelectItem key={w.id?.value} value={w.id?.value || "unknown"}>
                                {w.data?.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="w-[200px]">
                <Select 
                    value={filterStatus !== undefined ? String(filterStatus) : "all"} 
                    onValueChange={(v) => { setFilterStatus(v === "all" ? undefined : Number(v)); setPage(0); }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.entries(statusMap).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Enqueue Time</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : jobs && jobs.length > 0 ? (
                jobs.map((job) => (
                    <TableRow key={job.id?.value}>
                        <TableCell className="font-mono text-xs max-w-[150px] truncate" title={job.id?.value}>{job.id?.value}</TableCell>
                        <TableCell>
                            <Badge className={statusMap[job.status]?.color || 'bg-gray-500'}>
                                {statusMap[job.status]?.label || job.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{getWorkerName(job.workerId)}</TableCell>
                        <TableCell>{formatDate(job.enqueueTime)}</TableCell>
                        <TableCell>{formatDate(job.updatedAt)}</TableCell>
                        <TableCell>
                             <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${job.id?.value}`)}>
                                Details
                             </Button>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No jobs found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading || isFetching}
          >
              Previous
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => p + 1)}
            disabled={!jobs || jobs.length < LIMIT || isLoading || isFetching}
          >
              Next
          </Button>
      </div>
    </div>
  );
}
