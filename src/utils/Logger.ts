Memory.logLevel = Memory.logLevel || "info";

const LOG_LEVEL: { [level in LogLevel]: number } = {
    prompt: 0,
    assert: 1,
    error: 1,
    report: 2,
    info: 3,
    debug: 4,
    silly: 5
}

const LOG_COLOR: { [level in LogLevel]?: string } = {
    prompt: "yellow",
    assert: "red",
    error: "red",
    report: "white"
}

let origLogFunc = console.log;
function logConsole(level: LogLevel, message: string) {
    if (LOG_LEVEL[level] <= LOG_LEVEL[Memory.logLevel]) {
        if (LOG_COLOR[level]) {
            message = `<span style='color:${LOG_COLOR[level]}'>${message}</span>`;
        }
        origLogFunc(message);
    }
}

export class Logger {
    static prompt(message: string) {
        logConsole("prompt", message);
    }

    static assert(expr: boolean, message: string) {
        if (!expr) {
            logConsole("assert", "Assertion Fail: " + message);
        }
    }

    static error(message: string) {
        logConsole("error", "Error: " + message);
    }


    static report(message: string) {
        logConsole("report", message);
    }

    static info(message: string) {
        logConsole("info", "[info ] " + message);
    }

    static debug(message: string) {
        logConsole("debug", "[debug] " + message);
    }

    static silly(message: string) {
        logConsole("silly", "[silly] " + message);
    }
}

console.log = Logger.info;
global.logLevel = (level: LogLevel) => Memory.logLevel = level;

export default Logger;
