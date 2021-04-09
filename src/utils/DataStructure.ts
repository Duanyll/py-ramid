export class Queue<T> {
    private elements: Array<T>;
    private _size: number | undefined;

    public constructor(capacity?: number) {
        this.elements = new Array<T>();
        this._size = capacity;
    }

    public push(o: T) {
        if (o == null) {
            return false;
        }
        // 如果传递了size参数就设置了队列的大小
        if (this._size != undefined && !isNaN(this._size)) {
            if (this.elements.length == this._size) {
                this.pop();
            }
        }
        this.elements.unshift(o);
        return true;
    }

    public pop(): T {
        return this.elements.pop() as T;
    }

    public size(): number {
        return this.elements.length;
    }

    public empty(): boolean {
        return this.size() == 0;
    }

    public clear() {
        delete this.elements;
        this.elements = new Array<T>();
    }
}

export class Pair<T1, T2> {
    public x: T1;
    public y: T2;
    public constructor(a: T1, b: T2) {
        this.x = a;
        this.y = b;
    }
}

export type Point = Pair<number, number>;

export function createMatrix<T>(h: number, w: number, val: T): T[][] {
    let res = new Array<Array<T>>(h);
    for (let i = 0; i < h; i++) {
        res[i] = new Array<T>(w);
        for (let j = 0; j < w; j++) {
            res[i][j] = val;
        }
    }
    return res;
}

export function printMatrix(mat: number[][]) {
    for (let i = 0; i < mat.length; i++) {
        let line = "";
        for (let j = 0; j < mat.length; j++) {
            line += (mat[i][j] == 0x3f3f3f3f) ? '.' : _.last(mat[i][j].toString())
        }
        console.log(line);
    }
}


/**
 * Simple open-closed list
 */
export class OpenClosed {
    private list: Uint8Array;
    private marker: number;


    constructor(size: number) {
        this.list = new Uint8Array(size);
        this.marker = 1;
    }

    clear() {
        if (this.marker >= 253) {
            this.list = new Uint8Array(this.list.length);
            this.marker = 1;
        } else {
            this.marker += 2;
        }
    }

    isOpen(index: number) {
        return this.list[index] === this.marker;
    }

    isClosed(index: number) {
        return this.list[index] === this.marker + 1;
    }

    open(index: number) {
        this.list[index] = this.marker;
    }

    close(index: number) {
        this.list[index] = this.marker + 1;
    }
}

/**
 * Priority queue implementation w/ support for updating priorities
 */
export class Heap {
    private priorities: Uint16Array;
    private heap: Uint16Array;
    private size_: number;
    constructor(size: number) {
        this.priorities = new Uint16Array(size + 1);
        this.heap = new Uint16Array(size + 1);
        this.size_ = 0;

    }

    minPriority() {
        return this.priorities[this.heap[1]];
    }

    min() {
        return this.heap[1];
    }

    size() {
        return this.size_;
    }

    priority(index: number) {
        return this.priorities[index];
    }

    pop() {
        this.heap[1] = this.heap[this.size_];
        --this.size_;
        let vv = 1;
        do {
            let uu = vv;
            if ((uu << 1) + 1 <= this.size_) {
                if (this.priorities[this.heap[uu]] >= this.priorities[this.heap[uu << 1]]) {
                    vv = uu << 1;
                }
                if (this.priorities[this.heap[vv]] >= this.priorities[this.heap[(uu << 1) + 1]]) {
                    vv = (uu << 1) + 1;
                }
            } else if (uu << 1 <= this.size_) {
                if (this.priorities[this.heap[uu]] >= this.priorities[this.heap[uu << 1]]) {
                    vv = uu << 1;
                }
            }
            if (uu !== vv) {
                let tmp = this.heap[uu];
                this.heap[uu] = this.heap[vv];
                this.heap[vv] = tmp;
            } else {
                return;
            }
        } while (true);
    }

    push(index: number, priority: number) {
        this.priorities[index] = priority;
        let ii = ++this.size_;
        this.heap[ii] = index;
        this.bubbleUp(ii);
    }

    update(index: number, priority: number) {
        for (let ii = this.size_; ii > 0; --ii) {
            if (this.heap[ii] === index) {
                this.priorities[index] = priority;
                this.bubbleUp(ii);
                return;
            }
        }
    }

    protected bubbleUp(ii: number) {
        while (ii !== 1) {
            if (this.priorities[this.heap[ii]] <= this.priorities[this.heap[ii >>> 1]]) {
                let tmp = this.heap[ii];
                this.heap[ii] = this.heap[ii >>> 1];
                this.heap[ii = ii >>> 1] = tmp;
            } else {
                return;
            }
        }
    }

    clear() {
        this.size_ = 0;
    }
}

