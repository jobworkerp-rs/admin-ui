#!/bin/sh
cat <<EOF > /usr/share/nginx/html/config.js
window.__RUNTIME_CONFIG__ = {
  VITE_GRPC_ENDPOINT: "${VITE_GRPC_ENDPOINT:-http://localhost:9000}"
};
EOF
