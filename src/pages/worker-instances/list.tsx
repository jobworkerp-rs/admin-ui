import { useMemo, useState } from 'react';
import { Activity, RefreshCw, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWorkerInstanceOverview } from '@/hooks/use-worker-instances';

const PAGE_SIZE = 20;
const ALL_CHANNELS = '__all_worker_instance_channels__';
const DEFAULT_CHANNEL = '__default_worker_instance_channel__';

function formatTimestamp(value: string | undefined): string {
  if (!value) return '-';
  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return '-';
  return new Date(timestamp).toLocaleString();
}

function formatChannels(channels: { name: string; concurrency: number }[]): string {
  if (channels.length === 0) return '-';
  return channels
    .map((channel) => `${channel.name || '[default]'} (${channel.concurrency})`)
    .join(', ');
}

export default function WorkerInstanceList() {
  const { t } = useTranslation();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [channel, setChannel] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const overview = useWorkerInstanceOverview({ includeInactive, channel });

  const instances = useMemo(
    () => overview.data?.instances.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [],
    [overview.data?.instances, page],
  );
  const hasNextPage = (overview.data?.instances.length ?? 0) > (page + 1) * PAGE_SIZE;

  const handleChannelChange = (value: string) => {
    setChannel(value === ALL_CHANNELS ? undefined : value === DEFAULT_CHANNEL ? '' : value);
    setPage(0);
  };

  const handleIncludeInactive = (checked: boolean) => {
    setIncludeInactive(checked);
    setPage(0);
  };

  if (overview.isLoading || (overview.isFetching && !overview.data)) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>{overview.failureCount > 0 ? t('worker_instances.reconnecting') : t('common.loading')}</span>
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="space-y-4 p-4 text-destructive">
        <p>{t('worker_instances.load_error')}</p>
        <Button variant="outline" onClick={() => overview.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('worker_instances.retry')}
        </Button>
      </div>
    );
  }

  const data = overview.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('worker_instances.title')}</h2>
          <p className="text-muted-foreground">{t('worker_instances.description')}</p>
        </div>
        <Button variant="outline" onClick={() => overview.refetch()} disabled={overview.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${overview.isFetching ? 'animate-spin' : ''}`} />
          {t('worker_instances.refresh')}
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-0">
            <CardTitle className="text-sm font-medium">{t('worker_instances.total_instances')}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.active} / {data.total}</div>
            <p className="text-xs text-muted-foreground">{t('worker_instances.active_of_total')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('worker_instances.channel_capacity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.channels.length === 0 ? <span className="text-muted-foreground">-</span> : data.channels.map((item) => (
              <div key={item.name} className="flex justify-between gap-2">
                <span>{item.name || '[default]'}</span>
                <span>{item.totalConcurrency} / {item.activeInstances}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-inactive"
            checked={includeInactive}
            onCheckedChange={(checked) => handleIncludeInactive(checked === true)}
          />
          <Label htmlFor="include-inactive">{t('worker_instances.include_inactive')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="instance-channel">{t('worker_instances.channel')}</Label>
          <Select value={channel === '' ? DEFAULT_CHANNEL : channel ?? ALL_CHANNELS} onValueChange={handleChannelChange}>
            <SelectTrigger id="instance-channel" aria-label="Channel" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CHANNELS}>{t('worker_instances.all_channels')}</SelectItem>
              {data.channels.map((item) => (
                <SelectItem key={item.name} value={item.name === '[default]' ? DEFAULT_CHANNEL : item.name}>
                  {item.name || '[default]'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] whitespace-normal">{t('worker_instances.instance')}</TableHead>
              <TableHead className="w-[20%] whitespace-normal">{t('worker_instances.status')}</TableHead>
              <TableHead className="w-[25%] whitespace-normal">{t('worker_instances.activity')}</TableHead>
              <TableHead className="w-[25%] whitespace-normal">{t('worker_instances.channels')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{t('worker_instances.empty')}</TableCell></TableRow>
            ) : instances.map((instance) => {
              const instanceData = instance.data;
              const isActive = instance.id ? data.activeInstanceIds.has(instance.id.value) : false;
              return (
                <TableRow key={instance.id?.value}>
                  <TableCell className="min-w-0 whitespace-normal">
                    <div className="font-mono break-all">{instance.id?.value ?? '-'}</div>
                    <div className="mt-1 break-words">{instanceData?.hostname ?? '-'}</div>
                    <div className="break-all text-muted-foreground">{instanceData?.ipAddress ?? '-'}</div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-col items-start gap-2">
                      <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? t('worker_instances.active') : t('worker_instances.inactive')}</Badge>
                      <span className="text-muted-foreground">{instanceData?.rdbStatusIndexRecoveryVersion ? t('worker_instances.participating') : t('worker_instances.not_participating')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div>{formatTimestamp(instanceData?.registeredAt)}</div>
                    <div className="mt-1 text-muted-foreground">{formatTimestamp(instanceData?.lastHeartbeat)}</div>
                  </TableCell>
                  <TableCell className="min-w-0 break-all whitespace-normal">{formatChannels(instanceData?.channels ?? [])}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>{t('worker_instances.previous')}</Button>
        <Button variant="outline" onClick={() => setPage((current) => current + 1)} disabled={!hasNextPage}>{t('worker_instances.next')}</Button>
      </div>
      {overview.isFetching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4 animate-pulse" />{t('worker_instances.reconnecting')}</div>}
    </div>
  );
}
