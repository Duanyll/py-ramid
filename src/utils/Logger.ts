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

let operationToConfirm: {
    ok: () => void;
    cancel?: () => void;
    description: string;
    expire: number;
    key: number
};

export class Logger {
    static prompt(message: string) {
        logConsole("prompt", message);
    }

    static assert(message: string) {
        logConsole("assert", "Assertion Fail: " + message);
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

    static confirm(message: string, description: string, ok: () => void, cancel?: () => void) {
        if (operationToConfirm?.expire <= Game.time) {
            this.prompt(`Last operation (${operationToConfirm.description}) cancaled.`);
            if (operationToConfirm.cancel) operationToConfirm.cancel();
        }
        this.prompt(message);
        const key = _.random(1, 1000);
        this.prompt(`Type yes(${key}) to confirm operation ${description}.`);
        operationToConfirm = {
            description,
            ok,
            cancel,
            expire: Game.time + 30,
            key
        }
    }
}

console.log = Logger.info;
global.logLevel = (level: LogLevel) => Memory.logLevel = level;
global.yes = (key: number) => {
    if (!operationToConfirm) {
        Logger.prompt("Nothing to confirm.");
    } else if (operationToConfirm.expire < Game.time) {
        Logger.prompt(`Can't confirm operation ${operationToConfirm.description}. Expired.`);
    } else if (key !== operationToConfirm.key) {
        Logger.prompt(`Can't confirm operation ${operationToConfirm.description}. Wrong key.`);
    } else {
        Logger.prompt(`Operation ${operationToConfirm.description} confirmed`);
        operationToConfirm.ok();
        operationToConfirm = undefined;
    }
}

export default Logger;
