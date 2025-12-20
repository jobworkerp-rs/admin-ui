import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStuckJobs, useCleanupSystem, useRestoreJobs } from '@/hooks/use-system';
import { useCancelJob } from '@/hooks/use-jobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Trash2, RefreshCw, DatabaseBackup, Activity } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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

export default function SystemAdmin() {
  // Status Consistency State
  const [stuckTimeThreshold, setStuckTimeThreshold] = useState<number>(600000); // 10 mins
  const { data: stuckJobs, isLoading: isStuckLoading, refetch: refetchStuck } = useStuckJobs(stuckTimeThreshold);
  const deleteJobMutation = useCancelJob(); // For cancelling stuck jobs

  // Cleanup State
  const [retentionHours, setRetentionHours] = useState<number>(24);
  const cleanupMutation = useCleanupSystem();

  // Restore State
  const [includeGrabbed, setIncludeGrabbed] = useState<boolean>(false);
  const restoreMutation = useRestoreJobs();

  const handleCancelJob = (id: string) => {
    deleteJobMutation.mutate(id, {
        onSuccess: () => {
            toast({ title: "Job Cancelled", description: `Job ${id} has been cancelled.` });
            refetchStuck();
        },
        onError: (err: unknown) => {
            toast({ variant: "destructive", title: "Failed to cancel job", description: String(err) });
        }
    });
  };

  const handleCleanup = () => {
    cleanupMutation.mutate(retentionHours, {
        onSuccess: (res) => {
            toast({ 
                title: "Cleanup Completed", 
                description: `Deleted ${res.deletedCount} records. Cutoff: ${res.cutoffTime}` 
            });
        },
        onError: (err: unknown) => {
            toast({ variant: "destructive", title: "Cleanup Failed", description: String(err) });
        }
    });
  };

  const handleRestore = () => {
    restoreMutation.mutate({ includeGrabbed }, {
        onSuccess: () => {
            toast({ title: "Restore Triggered", description: "Job restoration process has been initiated." });
        },
        onError: (err: unknown) => {
            toast({ variant: "destructive", title: "Restore Failed", description: String(err) });
        }
    });
  };

  const formatDuration = (ms: string | undefined) => {
    if (!ms) return '-';
    const seconds = Math.floor(parseInt(ms) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Administration</h2>
        <p className="text-muted-foreground">Manage system health, cleanup, and data restoration.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cleanup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Data Cleanup
            </CardTitle>
            <CardDescription>Remove old job status records to free up database space.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Retention Period (Hours)</Label>
                <Input 
                    type="number" 
                    min={1} 
                    value={retentionHours} 
                    onChange={(e) => setRetentionHours(Number(e.target.value))} 
                />
            </div>
            
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={cleanupMutation.isPending}>
                        {cleanupMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Run Cleanup
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Cleanup</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete job status records older than {retentionHours} hours.
                            Existing job results (logs) will NOT be affected by this operation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanup} className="bg-destructive hover:bg-destructive/90">
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Restore Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <DatabaseBackup className="h-5 w-5" />
                Job Restoration
            </CardTitle>
            <CardDescription>Restore jobs from RDB to Redis queue (e.g., after Redis data loss).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center space-x-2 border p-4 rounded-md">
                <Checkbox 
                    id="include-grabbed" 
                    checked={includeGrabbed} 
                    onCheckedChange={(c) => setIncludeGrabbed(!!c)} 
                />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="include-grabbed" className="font-medium">
                        Include Grabbed Jobs
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Restore jobs that are currently marked as running. CAUTION: May cause double execution.
                    </p>
                </div>
            </div>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="default" className="w-full" disabled={restoreMutation.isPending}>
                        {restoreMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
                        Run Restore
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Restoration</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will re-enqueue jobs found in RDB into Redis.
                            {includeGrabbed && " You have chosen to include currently running (grabbed) jobs, which carries a risk of double execution."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore}>
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Status Consistency (Stuck Jobs) */}
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Status Consistency (Stuck Jobs)
              </CardTitle>
              <CardDescription>Identify and manage jobs that have been running for an extended period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                  <div className="w-[200px]">
                      <Label>Time Threshold</Label>
                      <Select 
                          value={String(stuckTimeThreshold)} 
                          onValueChange={(v) => setStuckTimeThreshold(Number(v))}
                      >
                          <SelectTrigger>
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="60000">Running &gt; 1 Minute</SelectItem>
                              <SelectItem value="300000">Running &gt; 5 Minutes</SelectItem>
                              <SelectItem value="600000">Running &gt; 10 Minutes</SelectItem>
                              <SelectItem value="3600000">Running &gt; 1 Hour</SelectItem>
                              <SelectItem value="86400000">Running &gt; 24 Hours</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <Button variant="outline" onClick={() => refetchStuck()} className="mt-6">
                      <RefreshCw className={`mr-2 h-4 w-4 ${isStuckLoading ? 'animate-spin' : ''}`} />
                      Refresh List
                  </Button>
              </div>

              {/* Jobs List */}
              <div className="border rounded-md">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Job ID</TableHead>
                              <TableHead>Worker</TableHead>
                              <TableHead>Processing Time</TableHead>
                              <TableHead>Updated At</TableHead>
                              <TableHead>Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isStuckLoading ? (
                               <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                              </TableRow>
                          ) : stuckJobs && stuckJobs.length > 0 ? (
                                stuckJobs.map(job => {
                                    const now = new Date().getTime();
                                    const start = job.startTime ? parseInt(job.startTime) : 0;
                                    const elapsed = start > 0 ? now - start : 0;
                                    
                                    return (
                                        <TableRow key={job.id?.value}>
                                            <TableCell className="font-mono max-w-[200px] truncate" title={job.id?.value}>
                                                <Link to={`/jobs/${job.id?.value}`} className="hover:underline text-primary">
                                                    {job.id?.value}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{job.workerId}</TableCell>
                                            <TableCell className="text-yellow-600 font-medium">
                                                <AlertTriangle className="inline h-3 w-3 mr-1" />
                                                {formatDuration(String(elapsed))}
                                            </TableCell>
                                            <TableCell>{job.updatedAt ? new Date(parseInt(job.updatedAt)).toLocaleString() : '-'}</TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        const id = job.id?.value;
                                                        if (id && confirm(`Are you sure you want to force cancel job ${id}?`)) {
                                                            handleCancelJob(id);
                                                        }
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                          ) : (
                              <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                      No stuck jobs found matching the criteria.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
