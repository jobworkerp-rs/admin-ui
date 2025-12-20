import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCreateFunctionSet, useFunctionSet, useUpdateFunctionSet } from "@/hooks/use-function-sets"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod"
import { useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { FunctionSelector } from "@/components/function-sets/function-selector"
import { FunctionUsing } from "@/lib/grpc/jobworkerp/function/data/function"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  category: z.number().int(),
  targets: z.array(z.custom<FunctionUsing>()),
})

type FunctionSetFormValues = z.infer<typeof formSchema>

export default function FunctionSetEdit() {
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()

  const { data: functionSet, isLoading } = useFunctionSet(isEdit ? id : undefined)
  const createMutation = useCreateFunctionSet()
  const updateMutation = useUpdateFunctionSet()

  const form = useForm<FunctionSetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: 0,
      targets: [],
    },
  })

  useEffect(() => {
    if (functionSet && functionSet.data) {
      form.reset({
        name: functionSet.data.name,
        description: functionSet.data.description ?? "",
        category: functionSet.data.category ?? 0,
        targets: functionSet.data.targets || [],
      })
    }
  }, [functionSet, form])

  const onSubmit = (values: FunctionSetFormValues) => {
    const data = {
        name: values.name,
        description: values.description || "",
        category: values.category,
        targets: values.targets || [] 
    }

    if (isEdit && id) {
        updateMutation.mutate({ id, data }, {
            onSuccess: () => navigate("/function-sets")
        })
    } else {
        createMutation.mutate(data, {
            onSuccess: () => navigate("/function-sets")
        })
    }
  }

  if (isEdit && isLoading) {
      return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <Button variant="ghost" className="w-fit pl-0" onClick={() => navigate("/function-sets")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to List
      </Button>

      <h1 className="text-2xl font-bold">
        {isEdit ? "Edit Function Set" : "Create Function Set"}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="my-function-set" {...field} />
                </FormControl>
                <FormDescription>
                  Unique name for the function set.
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (Int)</FormLabel>
                <FormControl>
                  <Input type="number" 
                    placeholder="0" 
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="targets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Functions</FormLabel>
                <FormControl>
                  <FunctionSelector 
                    targets={field.value} 
                    onChange={field.onChange} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
