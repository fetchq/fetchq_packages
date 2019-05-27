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
})
