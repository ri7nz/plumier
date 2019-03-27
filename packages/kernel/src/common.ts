import { existsSync, lstatSync } from "fs"
import glob from "glob"
import { extname } from "path"


// ##################################################################### //
// ############################## TESTING ############################## //
// ##################################################################### //

const log = console.log;

export namespace consoleLog {
    export function startMock() {
        console.log = jest.fn(message => { })
    }
    export function clearMock() {
        console.log = log
    }
}

// ##################################################################### //
// ######################## OBJECT MANIPULATION ######################## //
// ##################################################################### //



//some object can't simply convertible to string https://github.com/emberjs/ember.js/issues/14922#issuecomment-278986178
export function safeToString(value: any) {
    try {
        return value.toString()
    } catch (e) {
        return "[object Object]"
    }
}

export function createRoute(...args: string[]): string {
    return "/" + args
        .filter(x => !!x)
        .map(x => x.toLowerCase())
        .map(x => x.startsWith("/") ? x.slice(1) : x)
        .map(x => x.endsWith("/") ? x.slice(0, -1) : x)
        .filter(x => !!x)
        .join("/")
}

export function hasKeyOf<T>(opt: any, key: string): opt is T {
    return key in opt;
}

export function isCustomClass(type: Function | Function[]) {
    switch (Array.isArray(type) ? type[0] : type) {
        case undefined:
        case Boolean:
        case String:
        case Array:
        case Number:
        case Object:
        case Date:
            return false
        default:
            return true
    }
}


// ##################################################################### //
// ############################ FILE SYSTEM ############################ //
// ##################################################################### //


export function findFilesRecursive(path: string): string[] {
    const removeExtension = (x: string) => x.replace(/\.[^/.]+$/, "")
    if (existsSync(`${path}.js`)) return [removeExtension(path)]
    else if (existsSync(`${path}.ts`)) return [removeExtension(path)]
    //resolve provided path directory or file
    else if (lstatSync(path).isDirectory()) {
        const files = glob.sync(`${path}/**/*+(.js|.ts)`)
            //take only file in extension list
            .filter(x => [".js", ".ts"].some(ext => extname(x) == ext))
            //add root path + file name
            .map(x => removeExtension(x))
        return Array.from(new Set(files))
    }
    else return [path]
}