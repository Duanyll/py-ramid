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
