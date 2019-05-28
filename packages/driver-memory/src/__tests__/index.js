// const fetchq = require('../lib/fetchq')
// const { FetchQDuplicateClientError, FetchQDriverNotFoundError } = require('../lib/errors')

import fetchq from '../lib/index'

describe(`@fetchq/driver-memory`, () => {
    beforeEach(async () => {
        await fetchq.destroyAll()
    })

    it(`should start an in-memory client`, async () => {
        expect.assertions(1)
        await fetchq.connect({ driver: { type: 'memory' }})
        expect(fetchq.getStatus()).toBe(1)
    })

    it(`should push a document into a queue`, async () => {
        await fetchq.push('q1', [
            { id: 'd1' },
            { id: 'd2' },
        ])

        expect(fetchq.ref('q1').count()).toBe(2)
    })
})
