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

export default class Logger {
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

let commandHelpStore: Map<any, { name: string, fullText: string, shortText: string }> = new Map();
type CommandParam = {
    name: string,
    type: "myRoom" | "room" | "number" | "string" | "boolean" | "resource" | "coord" | "any" | string[],
    description?: string
}
export function registerCommand(name: string, description: string, paramInfo: CommandParam[], func: (...param: any[]) => any) {
    if (name in global) {
        Logger.error(`Can't register command ${name}: name already exists!`);
        return;
    }
    const shortText =
        `${name}(${_.join(_.map(paramInfo, p => `${p.name}: ${(p.type instanceof Array) ? _.join(_.map(p.type, s => `"${s}"`), ' | ') : p.type}`), ', ')})`;
    const helpText = _.join([
        shortText,
        description,
        ..._.compact(_.map(paramInfo, p => p.description ? `${p.name}: ${p.description}`: undefined))
    ], '\n');
    const wrapperFunc = function (...param: any[]) {
        if (param.length != paramInfo.length) {
            Logger.error(`Wrong parameter length!`);
            console.log(helpText);
            return;
        }
        function check(x: unknown, type: CommandParam['type']) {
            switch (type) {
                case 'boolean':
                    return typeof x == 'boolean';
                case 'myRoom':
                    return typeof x == 'string' && x in global.myRooms;
                case 'room':
                    return typeof x == 'string' && /(E|W)\d{1,3}(N|S)\d{1,3}/.test(x);
                case 'number':
                    return typeof x == 'number';
                case 'resource':
                    return typeof x == 'string' && RESOURCES_ALL.includes(x as ResourceConstant);
                case 'string':
                    return typeof x == 'string';
                case 'coord':
                    return typeof x == 'number' && x >= 0 && x <= 49;
                case 'any':
                    return true;
                default:
                    return typeof x == 'string' && type.includes(x);
            }
        }
        for (let i = 0; i < param.length; i++) {
            if (!check(param[i], paramInfo[i].type)) {
                Logger.error(`Wrong parameter ${paramInfo[i].name}!`);
                console.log(helpText);
                return;
            }
        }
        func.apply(null, param);
    };
    (global as any)[name] = wrapperFunc;
    commandHelpStore.set(wrapperFunc, { name, fullText: helpText, shortText: shortText });
}

global.help = (func?: any) => {
    if (func) {
        if (commandHelpStore.has(func)) {
            console.log(commandHelpStore.get(func).fullText);
        } else {
            Logger.error(`Unknown command! Type help() to view all commands. `);
        }
    } else {
        console.log(`All commands:`);
        console.log();
        for (const command of commandHelpStore) {
            console.log(command[1].shortText);
        }
        console.log();
        console.log(`To get help of command 'x', type help(x) (no quotes)`);
    }
}
