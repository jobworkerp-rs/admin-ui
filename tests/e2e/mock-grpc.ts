import { Page, Route } from '@playwright/test';
import { Buffer } from 'node:buffer';

// gRPC-Web framing
// 1 byte: 0 = data, 128 = trailers
// 4 bytes: length (big endian)
// N bytes: payload

export function encodeGrpcWebResponse(payload: Uint8Array): Uint8Array {
    const lengthBuffer = new Uint8Array(4);
    const view = new DataView(lengthBuffer.buffer);
    view.setUint32(0, payload.length, false); // Big Endian

    // Data frame: 0x00 + length + payload
    // Concatenation helper
    const dataFrame = new Uint8Array(1 + 4 + payload.length);
    dataFrame.set([0x00], 0);
    dataFrame.set(lengthBuffer, 1);
    dataFrame.set(payload, 5);

    // Trailer frame: 0x80 + length(0) + trailers
    const trailers = "grpc-status: 0\r\ngrpc-message: OK";
    const trailerBytes = Buffer.from(trailers); // Use Buffer for string encoding

    const trailerLengthBuffer = new Uint8Array(4);
    new DataView(trailerLengthBuffer.buffer).setUint32(0, trailerBytes.length, false);

    const trailerFrame = new Uint8Array(1 + 4 + trailerBytes.length);
    trailerFrame.set([0x80], 0);
    trailerFrame.set(trailerLengthBuffer, 1);
    trailerFrame.set(trailerBytes, 5);

    const matchBuffer = new Uint8Array(dataFrame.length + trailerFrame.length);
    matchBuffer.set(dataFrame, 0);
    matchBuffer.set(trailerFrame, dataFrame.length);

    return matchBuffer;
}

 
export async function routeGrpc(
    page: Page,
    serviceName: string,
    methodName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseMessage: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageType: { encode: (m: any) => { finish: () => Uint8Array } }
) {
    await page.route(`**/${serviceName}/${methodName}`, async (route: Route) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message = (messageType as any).fromPartial ? (messageType as any).fromPartial(responseMessage) : responseMessage;
        const encoded = messageType.encode(message).finish();
        const body = encodeGrpcWebResponse(encoded);

        await route.fulfill({
            body: Buffer.from(body), // Playwright route.fulfill expects Buffer or string/bytes? Buffer is safest for binary
            contentType: 'application/grpc-web+proto',
            headers: {
                'grpc-status': '0',
                'grpc-message': 'OK',
            }
        });
    });
}

// For streaming responses (like FindListBy), we need to send multiple frames
 
export async function routeGrpcStream(
    page: Page,
    serviceName: string,
    methodName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseMessages: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageType: { encode: (m: any) => { finish: () => Uint8Array } }
) {
    await page.route(`**/${serviceName}/${methodName}`, async (route: Route) => {
        const frames: Uint8Array[] = [];

        for (const msg of responseMessages) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const message = (messageType as any).fromPartial ? (messageType as any).fromPartial(msg) : msg;
                const encoded = messageType.encode(message).finish();

                const lengthBuffer = new Uint8Array(4);
                new DataView(lengthBuffer.buffer).setUint32(0, encoded.length, false);

                const frame = new Uint8Array(1 + 4 + encoded.length);
                frame.set([0x00], 0);
                frame.set(lengthBuffer, 1);
                frame.set(encoded, 5);
                frames.push(frame);
            } catch (e) {
                console.error("Mock gRPC Encoding Error:", e);
                console.error("Message Type:", messageType);
                console.error("Input Message:", msg);
                throw e;
            }
        }

        // Trailers
        const trailers = "grpc-status: 0\r\ngrpc-message: OK";
        const trailerBytes = Buffer.from(trailers); // Use Buffer

        const trailerLengthBuffer = new Uint8Array(4);
        new DataView(trailerLengthBuffer.buffer).setUint32(0, trailerBytes.length, false);

        const trailerFrame = new Uint8Array(1 + 4 + trailerBytes.length);
        trailerFrame.set([0x80], 0);
        trailerFrame.set(trailerLengthBuffer, 1);
        trailerFrame.set(trailerBytes, 5);
        frames.push(trailerFrame);

        // Concat all frames
        let totalLength = 0;
        frames.forEach(f => totalLength += f.length);
        const body = new Uint8Array(totalLength);
        let offset = 0;
        frames.forEach(f => {
            body.set(f, offset);
            offset += f.length;
        });

        await route.fulfill({
            body: Buffer.from(body),
            contentType: 'application/grpc-web+proto',
            headers: {
                'grpc-status': '0',
                'grpc-message': 'OK',
            }
        });
    });
}
