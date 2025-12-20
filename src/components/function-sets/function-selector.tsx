import { useState, useMemo } from 'react';
import { useRunners } from '@/hooks/use-runners';
import { useWorkers } from '@/hooks/use-workers';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { FunctionUsing } from '@/lib/grpc/jobworkerp/function/data/function';

interface FunctionSelectorProps {
  targets: FunctionUsing[];
  onChange: (targets: FunctionUsing[]) => void;
}

export function FunctionSelector({ targets, onChange }: FunctionSelectorProps) {
  const { data: runners } = useRunners({ runnerTypes: [] });
  const { data: workers } = useWorkers({ runnerTypes: [], runnerIds: [] });
  const [selectedType, setSelectedType] = useState<'runner' | 'worker'>('runner');
  const [selectedValue, setSelectedValue] = useState<string>('');

  // Flattened options for Runners
  const runnerOptions = useMemo(() => {
    if (!runners) return [];
    return runners.flatMap(r => {
      const methods = r.data?.methodProtoMap?.schemas 
        ? Object.keys(r.data.methodProtoMap.schemas) 
        : [];
      
      if (methods.length > 0) {
        return methods.map(m => ({
          label: `${r.data?.name || r.id?.value} / ${m}`,
          value: JSON.stringify({ id: r.id?.value, using: m }),
          runnerName: r.data?.name,
          method: m
        }));
      } else {
        // Fallback for runners with no defined methods
        // allow selection without method (using="")
        return [{
            label: r.data?.name || r.id?.value || "Unknown",
            value: JSON.stringify({ id: r.id?.value, using: "" }),
            runnerName: r.data?.name,
            method: ""
        }];
      }
    });
  }, [runners]);

  const workerOptions = useMemo(() => {
    if (!workers) return [];
    return workers.map(w => ({
      label: w.data?.name || w.id?.value,
      value: JSON.stringify({ id: w.id?.value }),
      workerName: w.data?.name
    }));
  }, [workers]);

  const handleAdd = () => {
    if (!selectedValue) return;
    
    try {
        const parsed = JSON.parse(selectedValue);
        const newTargets = [...(targets || []), {
            functionId: selectedType === 'runner' 
                ? { runnerId: { value: parsed.id } } 
                : { workerId: { value: parsed.id } },
            using: selectedType === 'runner' ? parsed.using : undefined
        }];
        onChange(newTargets);
        setSelectedValue('');
    } catch (e) {
        console.error("Failed to parse selection", e);
    }
  };

  const handleRemove = (index: number) => {
    const newTargets = [...(targets || [])];
    newTargets.splice(index, 1);
    onChange(newTargets);
  };

  const getName = (target: FunctionUsing) => {
    if (target.functionId?.runnerId) {
      const runner = runners?.find(r => r.id?.value === target.functionId?.runnerId?.value);
      return runner ? `Runner: ${runner.data?.name}` : `Runner ID: ${target.functionId.runnerId.value}`;
    } else if (target.functionId?.workerId) {
      const worker = workers?.find(w => w.id?.value === target.functionId?.workerId?.value);
      return worker ? `Worker: ${worker.data?.name}` : `Worker ID: ${target.functionId.workerId.value}`;
    }
    return 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="w-[150px]">
             <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Type</label>
            <Select value={selectedType} onValueChange={(v: 'runner' | 'worker') => { setSelectedType(v); setSelectedValue(''); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="runner">Runner</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
              </SelectContent>
            </Select>
        </div>

        <div className="flex-1">
             <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {selectedType === 'runner' ? 'Runner / Method' : 'Worker'}
             </label>
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger data-testid="target-selector">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {selectedType === 'runner' ? (
                  <SelectGroup>
                    <SelectLabel>Runners</SelectLabel>
                    {runnerOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                  </SelectGroup>
                ) : (
                  <SelectGroup>
                     <SelectLabel>Workers</SelectLabel>
                     {workerOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                     ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
        </div>

        <Button onClick={handleAdd} type="button" disabled={!selectedValue}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>

      <div className="grid gap-2">
        {targets.map((target, index) => (
          <Card key={index}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{target.functionId?.runnerId ? 'Runner' : 'Worker'}</Badge>
                <span className="font-medium">{getName(target)}</span>
                {target.using && (
                    <Badge variant="secondary">using: {target.using}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleRemove(index)}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
