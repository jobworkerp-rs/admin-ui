import { createChannel, createClientFactory } from 'nice-grpc-web';
import { WorkerServiceDefinition } from './grpc/jobworkerp/service/worker';
import { RunnerServiceDefinition } from './grpc/jobworkerp/service/runner';
import { JobServiceDefinition, JobProcessingStatusServiceDefinition, JobRestoreServiceDefinition } from './grpc/jobworkerp/service/job';
import { JobResultServiceDefinition } from './grpc/jobworkerp/service/job_result';
import { FunctionSetServiceDefinition } from './grpc/jobworkerp/function/service/function_set';

// Environment variable or default (must match server config)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
const GRPC_ENDPOINT = runtimeConfig?.VITE_GRPC_ENDPOINT || import.meta.env.VITE_GRPC_ENDPOINT || 'http://localhost:9000';

console.log('gRPC Endpoint:', GRPC_ENDPOINT);

const channel = createChannel(GRPC_ENDPOINT);
const clientFactory = createClientFactory();

export const workerClient = clientFactory.create(WorkerServiceDefinition, channel);
export const runnerClient = clientFactory.create(RunnerServiceDefinition, channel);
export const jobClient = clientFactory.create(JobServiceDefinition, channel);
export const jobStatusClient = clientFactory.create(JobProcessingStatusServiceDefinition, channel);
export const jobRestoreClient = clientFactory.create(JobRestoreServiceDefinition, channel);
export const jobResultClient = clientFactory.create(JobResultServiceDefinition, channel);
export const functionSetClient = clientFactory.create(FunctionSetServiceDefinition, channel);
