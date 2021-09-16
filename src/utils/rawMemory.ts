import cfg from "config";

Memory.rawMemoryIndex ||= {};

type StorageClass = keyof typeof cfg.SEGMENTS;
class DataStorage {
    private cache: Record<number, any> = {};
    private reqs: {
        [id: number]: {
            load?: boolean,
            save?: boolean,
            callbacks?: ((obj: any) => boolean)[];
        }
    } = {}

    tick() {
        for (const id in RawMemory.segments) {
            let req = this.reqs[id];
            if (!req) continue;
            delete this.reqs[id];
            if (req.load) {
                if (_.isEmpty(RawMemory.segments[id])) {
                    this.cache[id] = {};
                } else {
                    try {
                        this.cache[id] = JSON.parse(RawMemory.segments[id]);
                    } catch (e: any) {
                        console.log(`Segment #${id} croupted: ${e.message}`)
                        this.cache[id] = {};
                    }
                }
            }
            if (req.callbacks) {
                for (const f of req.callbacks) {
                    req.save ||= f(this.cache[id]);
                }
            }
            if (req.save) {
                RawMemory.segments[id] = JSON.stringify(this.cache[id])
            }
        }

        let requests = [] as number[];
        for (const id in this.reqs) {
            let req = this.reqs[id];
            if (!_.some(req)) {
                delete this.reqs[id];
            }
            requests.push(Number(id));
            if (requests.length >= 10) break;
        }

        if (requests.length) {
            RawMemory.setActiveSegments(requests);
        }
    }

    getSegment(segment: number, callback: (obj: any) => boolean): boolean {
        if (this.cache[segment]) {
            let save = callback(this.cache[segment]);
            if (save) {
                this.save(segment);
            }
            return true;
        } else {
            this.reqs[segment] ||= {};
            this.reqs[segment].load = true;
            this.reqs[segment].callbacks ||= [];
            this.reqs[segment].callbacks.push(callback);
            return false;
        }
    }

    setSegment(segment: number, val: any): boolean {
        this.cache[segment] = val;
        return this.save(segment);
    }

    ready(segment: number) {
        return segment in RawMemory.segments;
    }

    save(segment: number): boolean {
        this.reqs[segment] ||= {};
        this.reqs[segment].save = true;
        return this.ready(segment);
    }

    where(group: StorageClass, key: string): number {
        const info = cfg.SEGMENTS[group];
        if (typeof info == "number") {
            return info;
        }
        const existSegment = _.find(info, id => _.includes(Memory.rawMemoryIndex[id], key));
        if (existSegment) return existSegment;
        const newSegment = _.find(info, id => (_.size(Memory.rawMemoryIndex[id]) < (cfg.SEGMENT_SIZE[group] ?? 5)));
        if (typeof newSegment != "number") throw new Error(`Storage class ${group} out of space!`);
        Memory.rawMemoryIndex[newSegment] ||= [];
        Memory.rawMemoryIndex[newSegment].push(key);
        return newSegment;
    }

    getKey(group: StorageClass, key: string, callback: (obj: any) => boolean): boolean {
        return this.getSegment(this.where(group, key), (segment) => {
            return callback(segment[key]);
        })
    }

    setKey(group: StorageClass, key: string, val: any): boolean {
        return this.getSegment(this.where(group, key), (segment) => {
            segment[key] = val;
            return true;
        })
    }
}

const Storage = new DataStorage();
global.Storage = Storage;
export default Storage;
