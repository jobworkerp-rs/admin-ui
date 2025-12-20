#!/bin/bash
mkdir -p src/lib/grpc

# Clean old
rm -rf src/lib/grpc/*

PROTOC_GEN_TS_PROTO="./node_modules/.bin/protoc-gen-ts_proto"

protoc \
  --plugin="protoc-gen-ts_proto=${PROTOC_GEN_TS_PROTO}" \
  --ts_proto_out=./src/lib/grpc \
  --ts_proto_opt=esModuleInterop=true \
  --ts_proto_opt=forceLong=string \
  --ts_proto_opt=outputServices=generic-definitions \
  --ts_proto_opt=outputClientImpl=false \
  --ts_proto_opt=outputJsonMethods=false \
  --ts_proto_opt=useExactTypes=false \
  --proto_path=../proto/protobuf \
  $(find ../proto/protobuf -name "*.proto")
