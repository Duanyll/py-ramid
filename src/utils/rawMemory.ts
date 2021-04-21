import { setTimeout, registerGlobalRoutine } from "./scheduler";

type SegmentRequest = {
    type: "r";
    func: (segment: any) => void;
} | {
    type: "w";
    func: () => any;
} | {
    type: "rw";
    func: (segment: any) => any;
} | {
    type: "raw";
    func: () => void;
};
let segmentRequests: {
    [setment: number]: {
        read: boolean,
        write: boolean,
        callbacks: SegmentRequest[]
    }
} = {};

Memory.rawMemoryIndex ||= {};

export function tickSegmentRequest() {
    for (const segmentId in RawMemory.segments) {
        let id = Number(segmentId);
        if (segmentRequests[id]) {
            let obj: any;
            if (segmentRequests[id].read) {
                obj = _.isEmpty(RawMemory.segments[id]) ? {} : JSON.parse(RawMemory.segments[id]);
            }
            segmentRequests[id].callbacks.forEach(i => {
                switch (i.type) {
                    case "raw":
                        i.func();
                        break;
                    case "r":
                        i.func(obj);
                        break;
                    case "w":
                        obj = i.func() ?? obj;
                        break;
                    case "rw":
                        let res = i.func(obj) ?? obj;
                        break;
                }
            });
            if (segmentRequests[id].write) {
                RawMemory.segments[id] = JSON.stringify(obj);
            }
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
    if (request.length > 0) setTimeout("rawMemory", 1);
}
registerGlobalRoutine("rawMemory", tickSegmentRequest);

export class RMManager {
    static onSegment(segment: number, callback: () => void) {
        segmentRequests[segment] ||= { write: false, read: false, callbacks: [] };
        segmentRequests[segment].callbacks.push({ type: "raw", func: callback });
        setTimeout("rawMemory", 1);
    }

    static read(segment: number, callback: (segment: any) => void) {
        segmentRequests[segment] ||= { write: false, read: false, callbacks: [] };
        segmentRequests[segment].callbacks.push({ type: "r", func: callback });
        segmentRequests[segment].read = true;
        setTimeout("rawMemory", 1);
    }

    static write(segment: number, callback: () => any) {
        segmentRequests[segment] ||= { write: false, read: false, callbacks: [] };
        segmentRequests[segment].callbacks.push({ type: "w", func: callback });
        segmentRequests[segment].write = true;
        setTimeout("rawMemory", 1);
    }

    static readWrite(segment: number, callback: (segment: any) => any) {
        segmentRequests[segment] ||= { write: false, read: false, callbacks: [] };
        segmentRequests[segment].callbacks.push({ type: "rw", func: callback });
        segmentRequests[segment].read = true;
        segmentRequests[segment].write = true;
        setTimeout("rawMemory", 1);
    }

}
export default RMManager;
