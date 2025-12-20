import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDeleteFunctionSet, useFunctionSets } from "@/hooks/use-function-sets"
import { Box, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
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
} from "@/components/ui/alert-dialog"

export default function FunctionSetList() {
  const { t } = useTranslation()
  const { data: sets, isLoading } = useFunctionSets()
  const deleteMutation = useDeleteFunctionSet()

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
           <Box className="h-6 w-6" />
           {t('common.function_sets')}
        </h1>
        <Button asChild>
          <Link to="/function-sets/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center h-24">
                   Loading...
                 </TableCell>
               </TableRow>
            ) : sets?.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center h-24">
                   No function sets found.
                 </TableCell>
               </TableRow>
            ) : (
                sets?.map((set) => (
                  <TableRow key={set.id?.value}>
                    <TableCell className="font-mono text-xs">{set.id?.value}</TableCell>
                    <TableCell>
                      <Link to={`/function-sets/${set.id?.value}`} className="font-medium hover:underline text-primary">
                        {set.data?.name}
                      </Link>
                    </TableCell>
                    <TableCell>{set.data?.description}</TableCell>
                    <TableCell>{set.data?.category}</TableCell>
                    <TableCell className="text-right">
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
                                 This will permanently delete the function set "{set.data?.name}".
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction 
                                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                 onClick={() => set.id && handleDelete(set.id.value)}
                               >
                                 Delete
                               </AlertDialogAction>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
