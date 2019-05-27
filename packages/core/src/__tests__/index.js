const fetchq = require('../lib/index')

const {
    FetchQDuplicateClientError,
    FetchQDriverNotFoundError,
    FetchQDuplicateDriverError,
} = require('../lib/errors')

class CustomDriver {
    constructor (config) { this.config = config }
    connect () {}
    destroy () {}
}

describe(`@fetchq/core`, () => {
    beforeEach(async () => {
        await fetchq.destroyAll()
    })

    it(`should start an in-memory client`, async () => {
        expect.assertions(1)
        await fetchq.connect({ driver: { type: CustomDriver }})
        expect(fetchq.getStatus()).toBe(1)
    })

    it(`should NOT start the same client twice`, async () => {
        expect.assertions(1)
        try {
            await fetchq.connect({ driver: { type: CustomDriver }})
            await fetchq.connect({ driver: { type: CustomDriver }})
        } catch (err) {
            expect(err).toBeInstanceOf(FetchQDuplicateClientError)
        }
    })

    it(`should NOT start if the driver is unknown`, async () => {
        expect.assertions(1)
        try {
            await fetchq.connect({ driver: { type: 'I do not exists' }})
        } catch (err) {
            expect(err).toBeInstanceOf(FetchQDriverNotFoundError)
        }
    })

    it(`should start with a custom driver`, async () => {
        expect.assertions(1)
        const mock = jest.fn()

        class CustomDriver {
            constructor (config) { this.config = config }
            connect () { mock(this.config) }
            destroy () {}
        }

        await fetchq.connect({ driver: {
            type: CustomDriver,
            opt1: 1,
        }})

        expect(mock.mock.calls[0][0]).toEqual({ opt1: 1 })
    })

    it(`should register a new driver`, async () => {
        expect.assertions(1)
        fetchq.registerDriver('foo', CustomDriver)
        await fetchq.connect({ driver: { type: 'foo' }})
        expect(fetchq.getStatus()).toBe(1)
    })

    it(`should NOT register the same driver twice`, async () => {
        expect.assertions(1)
        try {
            fetchq.registerDriver('foo', CustomDriver)
            fetchq.registerDriver('foo', CustomDriver)
        } catch (err) {
            expect(err).toBeInstanceOf(FetchQDuplicateDriverError)
        }
    })
})
