import {
    Class,
    DefaultFacility,
    entity,
    entityHelper,
    findFilesRecursive,
    globAsync,
    PlumierApplication,
    RelationDecorator,
} from "@plumier/core"
import { FilterQueryAuthorizeMiddleware, OrderQueryAuthorizeMiddleware, SelectQueryAuthorizeMiddleware } from "@plumier/query-parser"
import { RequestHookMiddleware } from "@plumier/generic-controller"
import { Result, ResultMessages, VisitorInvocation } from "@plumier/validator"
import { lstat } from "fs"
import pluralize from "pluralize"
import { ConnectionOptions, createConnection, getConnectionOptions, getMetadataArgsStorage } from "typeorm"
import { promisify } from "util"
import validator from "validator"
import { filterConverter, orderConverter, selectConverter } from "./converters"

import { normalizeEntity, TypeORMControllerGeneric, TypeORMNestedControllerGeneric } from "./generic-controller"

const lstatAsync = promisify(lstat)


interface TypeORMFacilityOption {
    connection?: ConnectionOptions
}

function convertValue(value: any, path: string, type: Class): Result {
    if (Array.isArray(value)) {
        const messages: ResultMessages[] = []
        const values = []
        for (const [i, item] of value.entries()) {
            const converted = convertValue(item, `${path}[${i}]`, type)
            values.push(converted.value)
            if (converted.issues)
                messages.push(...converted.issues)
        }
        return { value: values, issues: messages.length > 0 ? messages : undefined }
    }
    else {
        const prop = entityHelper.getIdProp(type)!
        // usually ID will be of type Number and String (UUID)
        if (prop.type === Number) {
            const result = Number(value + "")
            if (isNaN(result)) return Result.error(value, path, "Value must be a number")
        }
        if (prop.type === String) {
            const valid = validator.isUUID(value + "")
            if (!valid) return Result.error(value, path, "Value must be an UUID")
        }
        // return { id: <id> } to make TypeOrm able to convert it into proper relation
        return Result.create({ [prop.name]: value })
    }
}

function relationConverter(i: VisitorInvocation): Result {
    if (i.value && i.decorators.find((x: RelationDecorator) => x.kind === "plumier-meta:relation"))
        return convertValue(i.value, i.path, i.type)
    else
        return i.proceed()
}

// load all entities to be able to take the metadata storage
async function loadEntities(connection?: ConnectionOptions) {
    try {
        const { entities } = connection ?? await getConnectionOptions()
        if (!entities) return
        for (const entity of entities) {
            if (typeof entity !== "string") continue
            const files = await globAsync(entity, { absolute: true })
            for (const file of files) {
                const stat = await lstatAsync(file)
                if (stat.isDirectory()) {
                    const files = await findFilesRecursive(file)
                    for (const f of files) {
                        require(f)
                    }
                }
                else
                    require(file)
            }
        }
    }
    // just skip error in setup method 
    // it will caught properly during db connect on initialize
    catch { }
}

class TypeORMFacility extends DefaultFacility {
    private option: TypeORMFacilityOption;
    constructor(opt?: TypeORMFacilityOption) {
        super()
        this.option = { ...opt }
    }

    async preInitialize(app: Readonly<PlumierApplication>) {
        // set type converter module to allow updating relation by id
        app.set({
            typeConverterVisitors: [
                ...app.config.typeConverterVisitors,
                relationConverter,
                filterConverter,
                selectConverter,
                orderConverter,
            ]
        })
        // load all entities to be able to take the metadata storage
        await loadEntities(this.option.connection)
        // assign tinspector decorators, so Plumier can understand the entity metadata
        const storage = getMetadataArgsStorage();
        if (storage.tables.length === 0) {
            throw new Error("No TypeORM entity found, check your connection configuration")
        }
        for (const table of storage.tables) {
            normalizeEntity(table.target as Class)
        }
    }

    setup(app: Readonly<PlumierApplication>) {
        app.set({ genericController: [TypeORMControllerGeneric, TypeORMNestedControllerGeneric] })
        app.set({ genericControllerNameConversion: (x: string) => pluralize(x) })
        app.use(new RequestHookMiddleware(), "Action")
        app.use(new FilterQueryAuthorizeMiddleware(), "Action")
        app.use(new SelectQueryAuthorizeMiddleware(), "Action")
        app.use(new OrderQueryAuthorizeMiddleware(), "Action")
    }

    async initialize(app: Readonly<PlumierApplication>) {
        if (this.option.connection)
            await createConnection(this.option.connection)
        else
            await createConnection()
    }
}

export { TypeORMFacility }


