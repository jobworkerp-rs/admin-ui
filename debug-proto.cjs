
const protobuf = require("protobufjs");

const proto = `
syntax = "proto3";
package test;

message CommandArgs {
  string command = 1;
  repeated string args = 2;
  bool with_memory_monitoring = 3;
  optional string explicit_opt = 4;
}
`;

try {
    const parsed = protobuf.parse(proto);
    const CommandArgs = parsed.root.lookupType("test.CommandArgs");
    
    CommandArgs.fieldsArray.forEach(field => {
        console.log(`Field: ${field.name}`);
        console.log(`  Type: ${field.type}`);
        console.log(`  Optional: ${field.optional}`);
        console.log(`  Required: ${field.required}`);
        console.log(`  Repeated: ${field.repeated}`);
        console.log(`  Options:`, field.options);
        console.log("---");
    });

} catch (e) {
    console.error(e);
}
