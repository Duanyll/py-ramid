import { createMatrix } from "utils";

export class SquareFinder {
    matrix: string[][];
    wlen: number[][];

    find(size: number, center: PointInRoom): { x: number, y: number, dis: number } {
        let resx = 0, resy = 0, resdis = 0x3f3f3f3f;
        for (let j = 0; j < 50; j++) {
            let curlen = 0;
            for (let i = 0; i < 50; i++) {
                if (this.wlen[i][j] >= size) {
                    curlen++;
                } else {
                    curlen = 0;
                }
                if (curlen >= size) {
                    const dis = Math.abs(i - size / 2 - center.x) + Math.abs(j - size / 2 - center.y);
                    if (dis < resdis) {
                        resdis = dis;
                        resx = i - size + 1;
                        resy = j - size + 1;
                    }
                }
            }
        }
        // console.log(`findSquare Result: ${[resx, resy, resdis]}`)
        return resdis == 0x3f3f3f3f ? undefined : { x: resx, y: resy, dis: resdis };
    }

    constructor(mat: string[][]) {
        this.matrix = mat;
        this.wlen = createMatrix(51, 51, 0);
        for (let i = 0; i < 50; i++) {
            for (let j = 0; j < 50; j++) {
                if (this.matrix[i][j] == ' ' || this.matrix[i][j] == '~') {
                    this.wlen[i][j] = (j == 0) ? 1 : (this.wlen[i][j - 1] + 1);
                } else {
                    this.wlen[i][j] = 0;
                }
            }
        }
    }
}
