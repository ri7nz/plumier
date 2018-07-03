import { basename } from "path";
import Supertest from "supertest";

import { Plumier, route } from "../../src";
import { RestfulApiFacility } from "../../src/framework";



function fixture() {
    return new Plumier()
        .set(new RestfulApiFacility())
        .set({ mode: "production" })
}

describe("Restful API", () => {
    describe("Basic Restful API", () => {
        class ClientModel {
            constructor(
                public id: number,
                public name: string,
                public email: string
            ) { }
        }

        //restful style controller
        class ClientController {
            @route.get(":id")
            get(id: number) {
                return new ClientModel(id, "John Doe", "mimi@gmail.com")
            }

            @route.post("")
            save(model: ClientModel) {
                expect(model).toBeInstanceOf(ClientModel)
                //return the created ID 
                return { newId: 474747 }
            }

            @route.put(":id")
            modify(id: number, model: ClientModel) {
                expect(model).toBeInstanceOf(ClientModel)
                expect(typeof id).toBe("number")
                //return nothing
            }

            @route.delete(":id")
            delete(id: number) {
                expect(typeof id).toBe("number")
                //return nothing
            }
        }

        it("Should able to get resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .get("/client/474747")
                .expect(200, { id: 474747, name: 'John Doe', email: "mimi@gmail.com" })
        })

        it("Should able to post resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .post("/client")
                .send({ name: 'John Doe', email: "mimi@gmail.com" })
                .expect(201, { newId: 474747 })
        })

        it("Should able to put resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .put("/client/474747")
                .send({ name: 'John Doe', email: "mimi@gmail.com" })
                .expect(204)
        })

        it("Should able to delete resource", async () => {
            const koa = await fixture()
                .set({ controller: [ClientController] })
                .initialize()
            await Supertest(koa.callback())
                .delete("/client/474747")
                .expect(204)
        })
    })

    describe("Nested Restful API", () => {
        class PetModel {
            constructor(
                public id: number,
                public clientId: number,
                public name: string,
                public age: number
            ) { }
        }

        //nested restful style controller
        @route.root("/client/:clientid/pet")
        class PetController {
            @route.get(":id")
            get(clientId: number, id: number) {
                return new PetModel(id, clientId, "Mimi", 5)
            }

            @route.post("")
            save(clientId: number, model: PetModel) {
                expect(model).toBeInstanceOf(PetModel)
                expect(typeof clientId).toBe("number")
                //return the created ID 
                return { newId: 474747 }
            }

            @route.put(":id")
            modify(clientId: number, id: number, model: PetModel) {
                expect(model).toBeInstanceOf(PetModel)
                expect(typeof clientId).toBe("number")
                expect(typeof id).toBe("number")
                //return nothing
            }

            @route.delete(":id")
            delete(clientId: number, id: number) {
                expect(typeof clientId).toBe("number")
                expect(typeof id).toBe("number")
                //return nothing
            }
        }

        it("Should able to get resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .get("/client/474747/pet/252525")
                .expect(200, { id: 252525, clientId: 474747, name: 'Mimi', age: 5 })
        })

        it("Should able to post resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .post("/client/474747/pet")
                .send({ name: 'Mimi', age: 5 })
                .expect(201, { newId: 474747 })
        })

        it("Should able to put resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .put("/client/474747/pet/252525")
                .send({ name: 'Mimi', age: 5 })
                .expect(204)
        })

        it("Should able to delete resource", async () => {
            const koa = await fixture()
                .set({ controller: [PetController] })
                .initialize()
            await Supertest(koa.callback())
                .delete("/client/474747/pet/252525")
                .expect(204)
        })
    })
})