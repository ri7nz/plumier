import "@plumier/testing"

import { analyzeModel, domain, ellipsis, entity, entityHelper, printTable } from "@plumier/core"
import { meta } from "plumier"
import reflect, { noop } from "@plumier/reflect"

describe("PrintTable", () => {
    it("Should able to print table", () => {
        const mock = console.mock()
        printTable(["name", "age"], [
            { name: "John Subaru", age: 60 },
            { name: "John Subaru", age: 60 },
            { name: "John Subaru", age: 60 },
        ])
        expect(mock.mock.calls).toMatchSnapshot()
        console.mockClear()
    })

    it("Should able to print table with algin right", () => {
        const mock = console.mock()
        printTable(["name", { property: "age", align: "right" }], [
            { name: "John Subaru", age: 60 },
            { name: "John Subaru", age: 160 },
            { name: "John Subaru", age: 60 },
        ])
        expect(mock.mock.calls).toMatchSnapshot()
        console.mockClear()
    })

    it("Should not error when provided undefined value", () => {
        const mock = console.mock()
        printTable(["name", { property: "age", align: "right" }], [
            { name: "John Subaru", age: 60 },
            { name: "John Subaru" },
            { name: "John Subaru", age: 60 },
        ])
        expect(mock.mock.calls).toMatchSnapshot()
        console.mockClear()
    })
})

describe("Ellipsis", () => {
    it("Should trim long string", () => {
        const str = ellipsis("Lorem ipsum dolor sit amet lorem ipsum dolor", 20)
        expect(str.length).toBe(20)
        expect(str).toMatchSnapshot()
    })
    it("Should not trim string if shorter than expected", () => {
        const str = ellipsis("Lorem", 20)
        expect(str.length).toBe(str.length)
        expect(str).toMatchSnapshot()
    })
})

describe("Model Analyser", () => {
    it("Should analyze missing properties", () => {
        class MyModel {
            constructor(
                public name: string,
                public date: Date
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing property type", () => {
        @domain()
        class MyModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing array type", () => {
        @domain()
        class MyModel {
            constructor(
                public name: string,
                public dates: Date[]
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing property type in nested model", () => {
        @domain()
        class ParentModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        @domain()
        class MyModel {
            constructor(
                public parent: ParentModel
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should analyze missing property in array type", () => {
        @domain()
        class MyModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        expect(analyzeModel([MyModel])).toMatchSnapshot()
    })
    it("Should analyze missing property type in nested array model", () => {
        @domain()
        class ParentModel {
            constructor(
                public name: string,
                public date: Readonly<Date>
            ) { }
        }
        @domain()
        class MyModel {
            constructor(
                @reflect.type([ParentModel])
                public parent: ParentModel[]
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
    it("Should skip cross reference type", () => {
        @domain()
        class ParentModel {
            constructor(
                public name: string,
                public date: Readonly<Date>,
                @reflect.type(x => [MyModel])
                public children: MyModel[]
            ) { }
        }
        @domain()
        class MyModel {
            constructor(
                @reflect.type([ParentModel])
                public parent: ParentModel[]
            ) { }
        }
        expect(analyzeModel(MyModel)).toMatchSnapshot()
    })
})

describe("Entity Relation Info", () => {
    it("Should extract one to many entity relation info properly", () => {
        @domain()
        class User {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @reflect.type(x => [Animal])
            @entity.relation({ inverseProperty: "user" })
            public animals: Animal[]
        }
        @domain()
        class Animal {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @entity.relation()
            public user: User
        }
        expect(entityHelper.getRelationInfo([User, "animals"])).toMatchSnapshot()
    })
    it("Should extract many to one entity relation info properly", () => {
        @domain()
        class User {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @reflect.type(x => [Animal])
            @entity.relation({ inverseProperty: "user" })
            public animals: Animal[]
        }
        @domain()
        class Animal {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @entity.relation()
            public user: User
        }
        expect(entityHelper.getRelationInfo([Animal, "user"])).toMatchSnapshot()
    })
    it("Should extract many to one entity relation without parent inverse property", () => {
        @domain()
        class User {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @reflect.type(x => [Animal])
            @entity.relation()
            public animals: Animal[]
        }
        @domain()
        class Animal {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @entity.relation()
            public user: User
        }
        expect(entityHelper.getRelationInfo([Animal, "user"])).toMatchSnapshot()
    })
    it("Should throw error when provided non relation one to many property", () => {
        @domain()
        class User {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @reflect.type(x => [Animal])
            public animals: Animal[]
        }
        @domain()
        class Animal {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @entity.relation()
            public user: User
        }
        expect(() => entityHelper.getRelationInfo([User, "animals"])).toThrowErrorMatchingSnapshot()
    })
    it("Should throw error when provided invalid property name", () => {
        @domain()
        class User {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @reflect.type(x => [Animal])
            @entity.relation()
            public animals: Animal[]
        }
        @domain()
        class Animal {
            @entity.primaryId()
            public id: number
            @noop()
            public name: string
            @entity.relation()
            public user: User
        }
        expect(() => entityHelper.getRelationInfo([Animal, "users"])).toThrowErrorMatchingSnapshot()
    })
})

describe("Meta Decorator", () => {
    it("Should able to decorate method return type", () => {
        class Dummy {
            @meta.type(Number)
            method() { }
        }
        expect(reflect(Dummy)).toMatchSnapshot()
    })
    it("Should able to decorate property data type", () => {
        class Dummy {
            @meta.type(x => [Number])
            prop: number[]
        }
        expect(reflect(Dummy)).toMatchSnapshot()
    })
    it("Should able to decorate method parameter", () => {
        class Dummy {
            method(@meta.type(Number) par: number) { }
        }
        expect(reflect(Dummy)).toMatchSnapshot()
    })
    it("Should able to decorate property", () => {
        class Dummy {
            @meta.property()
            prop: number
        }
        expect(reflect(Dummy)).toMatchSnapshot()
    })
    it("Should able to decorate method", () => {
        class Dummy {
            @meta.method()
            method(): number { return 123 }
        }
        expect(reflect(Dummy)).toMatchSnapshot()
    })
    it("Should able to decorate parameter properties", () => {
        @meta.parameterProperties()
        class Dummy {
            constructor(
                public par1: string,
                public par2: number
            ) { }
        }
        expect(reflect(Dummy)).toMatchSnapshot()
    })
})
