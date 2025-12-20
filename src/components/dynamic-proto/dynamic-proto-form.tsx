
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import * as protobuf from "protobufjs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface DynamicProtoFormProps {
  protoDefinition: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  className?: string;
}

export function DynamicProtoForm({
  protoDefinition,
  value,
  onChange,
  className,
}: DynamicProtoFormProps) {
  const [mainType, setMainType] = useState<protobuf.Type | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const parseProto = () => {
      if (!protoDefinition) {
        if (!isCancelled) {
          setMainType(null);
          setError(null);
        }
        return;
      }

      try {
        const parsed = protobuf.parse(protoDefinition);

        // Heuristic: Find the first Type (Message) in the root or nested namespaces
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
        
        if (!isCancelled) {
          if (type) {
            // Resolve all types upfront to ensure oneofs and nested messages work
            // This might fail if types are missing, but usually they are self-contained or in standard libs
            try {
                // Traverse and resolve. root.resolveAll() is theoretically what we want but basic resolve() on fields often works lazily.
                // For nested types to work immediately we verify logical correctness.
            } catch(e) {
                console.warn("Resolve warning", e);
            }
            setMainType(type);
            setError(null);
          } else {
            setMainType(null);
            setError("No message type found in proto definition.");
          }
        }
      } catch (e: unknown) {
        console.error("Proto parse error", e);
        if (!isCancelled) {
          setMainType(null);
          setError(`Failed to parse proto definition: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    };
    
    parseProto();
    
    return () => {
      isCancelled = true;
    };
  }, [protoDefinition]);


  if (error) {
    return <div className="text-red-500 text-sm p-4 border border-red-200 rounded">{error}</div>;
  }

  if (!mainType) {
    return <div className="text-muted-foreground text-sm">No definition loaded.</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
        <MessageFieldsInput 
            type={mainType} 
            value={value} 
            onChange={onChange} 
        />
    </div>
  );
}

// -- Components --

function MessageFieldsInput({ 
    type, 
    value, 
    onChange 
}: { 
    type: protobuf.Type, 
    value: Record<string, unknown>, 
    onChange: (v: Record<string, unknown>) => void 
}) {
    // 1. Identify real vs synthetic oneofs (proto3 optional creates synthetic oneofs)
    const isSyntheticOneOf = (oneof: protobuf.OneOf) => {
        return oneof.fieldsArray.length === 1 && oneof.name === `_${oneof.fieldsArray[0].name}`;
    };

    const realOneofs = type.oneofsArray.filter(o => !isSyntheticOneOf(o));
    
    // Standalone fields are those NOT in a oneof, OR in a synthetic oneof
    const standaloneFields = type.fieldsArray.filter(f => {
        if (!f.partOf) return true;
        // If it is part of a oneof, but that oneof is synthetic, treat as standalone
        return isSyntheticOneOf(f.partOf);
    });

    const handleFieldChange = (fieldName: string, fieldValue: unknown) => {
        onChange({
            ...value,
            [fieldName]: fieldValue,
        });
    };

    const handleOneOfChange = (oneOfName: string, fieldName: string, fieldValue: unknown) => {
        // When a OneOf field is set, we must clear other fields in the same OneOf
        // However, standard proto behavior implies setting one unsets others.
        // In our JS object representation, we should physically remove keys of other fields in this OneOf 
        // to avoid confusion, although keeping them might be valid in some loose JSON representations, 
        // strictly only one should be active.
        
        const oneof = type.oneofs[oneOfName];
        if (!oneof) return;

        const newObj = { ...value };
        // Remove all other fields belonging to this oneof
        for (const fName of oneof.fieldsArray.map(f => f.name)) {
            delete newObj[fName];
        }
        
        // Set the new field
        newObj[fieldName] = fieldValue;
        onChange(newObj);
    };

    return (
        <div className="space-y-4">
            {standaloneFields.map(field => (
                <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name} className="capitalize">
                        {field.name.replace(/_/g, " ")} {field.options?.["proto3_optional"] && <span className="text-muted-foreground text-xs font-normal ml-1">(Optional)</span>}
                    </Label>
                    <FieldInputWrapper 
                        field={field} 
                        value={value?.[field.name]} 
                        onChange={(v) => handleFieldChange(field.name, v)} 
                    />
                </div>
            ))}

            {realOneofs.map(oneof => (
                <div key={oneof.name} className="p-4 border rounded-md space-y-4 bg-muted/20">
                    <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider mb-2 block">
                        {oneof.name.replace(/_/g, " ")} (Select One)
                    </Label>
                    <OneOfInput 
                        oneof={oneof}
                        value={value}
                        onChange={(fieldName, val) => handleOneOfChange(oneof.name, fieldName, val)}
                    />
                </div>
            ))}
        </div>
    );
}

function OneOfInput({ 
    oneof, 
    value, 
    onChange 
}: { 
    oneof: protobuf.OneOf, 
    value: Record<string, unknown>, 
    onChange: (fieldName: string, value: unknown) => void 
}) {
    // Determine which field is currently active in the value object
    const activeFieldName = oneof.fieldsArray.find(f => value[f.name] !== undefined)?.name;
    const [selectedField, setSelectedField] = useState<string>(activeFieldName || "");

    // Update selection if external value changes to a valid field in this oneof
    if (activeFieldName && activeFieldName !== selectedField) {
        setSelectedField(activeFieldName);
    }

    const handleSelectionChange = (fieldName: string) => {
        setSelectedField(fieldName);
        
        const field = oneof.fieldsArray.find(f => f.name === fieldName);
        if (field) {
             onChange(fieldName, undefined); 
        }
    };


    return (
        <div className="space-y-4">
            <Select value={selectedField} onValueChange={handleSelectionChange}>
                <SelectTrigger>
                    <SelectValue placeholder={`Select ${oneof.name}...`} />
                </SelectTrigger>
                <SelectContent>
                    {oneof.fieldsArray.map(field => (
                        <SelectItem key={field.name} value={field.name}>
                            {field.name.replace(/_/g, " ")}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {selectedField && (
                <div className="pl-2 border-l-2 border-primary/20">
                     {(() => {
                         const field = oneof.fieldsArray.find(f => f.name === selectedField);
                         if (!field) return null;
                         return (
                            <div className="space-y-2">
                                <Label className="capitalize text-sm text-muted-foreground">
                                    {field.name.replace(/_/g, " ")} Details
                                </Label>
                                <FieldInputWrapper 
                                    field={field} 
                                    value={value[selectedField]} 
                                    onChange={(v) => onChange(field.name, v)} 
                                />
                            </div>
                         );
                     })()}
                </div>
            )}
        </div>
    );
}


function FieldInputWrapper({ field, value, onChange }: { field: protobuf.Field, value: unknown, onChange: (v: unknown) => void }) {
    if (field.repeated) {
        // Repeated field handling
        const values = Array.isArray(value) ? value : [];
        
        const handleAdd = () => {
            // Add default value based on type
            let defaultValue: unknown = "";
            if (["int32", "uint32", "double", "float"].includes(field.type)) defaultValue = 0;
            if (field.type === "bool") defaultValue = false;
            
            // If message, default object
             if (!field.resolvedType) {
                try { field.resolve(); } catch { /* ignore */ }
            }
            if (field.resolvedType && field.resolvedType instanceof protobuf.Type) {
                defaultValue = {};
            }

            onChange([...values, defaultValue]);
        };

        const handleRemove = (index: number) => {
            const newValues = [...values];
            newValues.splice(index, 1);
            onChange(newValues);
        };

        const handleItemChange = (index: number, val: unknown) => {
            const newValues = [...values];
            newValues[index] = val;
            onChange(newValues);
        };

        return (
            <div className="space-y-2">
                {values.map((v, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                        <div className="flex-1">
                            <SingleValueInput 
                                field={field} 
                                value={v} 
                                onChange={(val) => handleItemChange(idx, val)} 
                            />
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemove(idx)}
                            type="button"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAdd}
                    type="button"
                    className="mt-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </div>
        );
    }

    return <SingleValueInput field={field} value={value} onChange={onChange} />;
}

function SingleValueInput({ field, value, onChange }: { field: protobuf.Field, value: unknown, onChange: (v: unknown) => void }) {
    // 0. Resolve Type if needed
    if (!field.resolvedType) {
        try {
            field.resolve();
        } catch {
            // ignore resolution error
        }
    }

    // 1. Handle Nested Messages (Recursive)
    if (field.resolvedType && field.resolvedType instanceof protobuf.Type) {
        return (
            <div className="pl-4 border-l border-muted space-y-2">
                 <MessageFieldsInput 
                    type={field.resolvedType} 
                    value={(value as Record<string, unknown>) || {}} 
                    onChange={(v) => onChange(v)} 
                />
            </div>
        );
    }

    // 2. Handle specific types
    if (field.type === "bool") {
        return (
             <div className="flex items-center space-x-2">
                <Checkbox 
                    id={field.name} 
                    checked={!!value} 
                    onCheckedChange={(checked: boolean | 'indeterminate') => onChange(!!checked)} 
                />
             </div>
        )
    }

    // 3. Handle Enums
    if (field.resolvedType && field.resolvedType instanceof protobuf.Enum) {
         const enumType = field.resolvedType;
         return (
             <Select value={value?.toString()} onValueChange={(v) => onChange(parseInt(v, 10))}>
                 <SelectTrigger>
                     <SelectValue placeholder="Select..." />
                 </SelectTrigger>
                 <SelectContent>
                     {Object.keys(enumType.values).map((key) => (
                         <SelectItem key={key} value={enumType.values[key].toString()}>
                             {key}
                         </SelectItem>
                     ))}
                 </SelectContent>
             </Select>
         )
    }

    // 4. Integer types
    if (["int32", "uint32", "sint32", "fixed32", "sfixed32", "int64", "uint64", "sint64", "fixed64", "sfixed64"].includes(field.type)) {
         return (
             <Input 
                id={field.name}
                name={field.name}
                type="number"
                value={value !== undefined && value !== null ? String(value) : ""}
                onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChange(isNaN(val) ? undefined : val);
                }}
             />
         )
    }
    
    // 5. Float types
    if (["float", "double"].includes(field.type)) {
         return (
             <Input 
                id={field.name}
                name={field.name}
                type="number"
                step="any"
                value={value !== undefined && value !== null ? String(value) : ""}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChange(isNaN(val) ? undefined : val);
                }}
             />
         )
    }

    // 6. String/Bytes (Fallback)
    return (
        <Textarea 
            id={field.name}
            name={field.name}
            value={typeof value === 'string' ? value : ""}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            className="min-h-[80px]" // improved UX for potentially long text
        />
    )
}
