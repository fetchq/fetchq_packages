import { registerDriver, unregisterDriver, createDriver } from '../lib/drivers'
import { FetchQDriver } from '../lib/interfaces'

describe('FetchQ - drivers factory', () => {
    
    test('It should register a custom driver', () => {
        class MyDriver extends FetchQDriver {}
        registerDriver('foo', MyDriver)
        expect(createDriver({ type: 'foo' })).toBeInstanceOf(MyDriver)
        unregisterDriver('foo')
    })

    // test('It should not register the same driver twice', () => {})
    // test('It should check that the base class of a driver is being extended', () => {})
})