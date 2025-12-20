import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"
import Dashboard from "@/pages/dashboard"
import FunctionSetList from "@/pages/function-sets/list"
import FunctionSetEdit from "@/pages/function-sets/edit"
import RunnerList from "@/pages/runners/list"
import RunnerEdit from "@/pages/runners/edit"
import WorkerList from "@/pages/workers/list"
import WorkerEdit from "@/pages/workers/edit"
import JobEnqueue from "@/pages/jobs/enqueue"
import JobDetail from "@/pages/jobs/detail"
import JobResultDetail from "@/pages/results/detail"
import JobList from "@/pages/jobs/list"
import JobResultList from "@/pages/results/list"
import SystemAdmin from "@/pages/system"
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="runners" element={<RunnerList />} />
          <Route path="runners/new" element={<RunnerEdit />} />
          <Route path="runners/:id" element={<RunnerEdit />} />
          <Route path="workers" element={<WorkerList />} />
          <Route path="workers/new" element={<WorkerEdit />} />
          <Route path="workers/:id" element={<WorkerEdit />} />
          <Route path="jobs" element={<JobList />} />
          <Route path="jobs/new" element={<JobEnqueue />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="results" element={<JobResultList />} />
          <Route path="results/:id" element={<JobResultDetail />} />
          <Route path="function-sets" element={<FunctionSetList />} />
          <Route path="function-sets/new" element={<FunctionSetEdit />} />
          <Route path="function-sets/:id" element={<FunctionSetEdit />} />
          <Route path="system" element={<SystemAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App


