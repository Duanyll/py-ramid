import { globalDelay, registerGlobalRoutine } from "scheduler";

let segmentRequests: { [setment: number]: (() => void)[] } = {};

export function tickSegmentRequest() {
    for (const segmentId in RawMemory.segments) {
        let id = Number(segmentId);
        if (segmentRequests[id]) {
            segmentRequests[id].forEach(f => f());
            delete segmentRequests[id];
        }
    }

    let request: number[] = [];
    for (const segmentId in segmentRequests) {
        let id = Number(segmentId);
        request.push(id);
        if (request.length >= 10) break;
    }
    RawMemory.setActiveSegments(request);
    if (request.length > 0) globalDelay("rawMemory", 1);
}
registerGlobalRoutine("rawMemory", tickSegmentRequest);

export function onSegment(segment: number, callback: () => void) {
    segmentRequests[segment] = segmentRequests[segment] || [];
    segmentRequests[segment].push(callback);
    globalDelay("rawMemory", 1);
}

