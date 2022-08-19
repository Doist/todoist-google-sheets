import { getExportOptions } from './input-helpers'

describe('Input helpers', () => {
    describe('getExportOptions', () => {
        it('should return an empty object if no inputs are provided', () => {
            const options = getExportOptions()
            expect(options).toEqual({})
        })

        it('should get the right values when provided', () => {
            const options = getExportOptions({
                'Input.description': 'true',
                'Input.due': 'true',
                'Input.priority': 'false',
            })

            expect(options['description']).toBe(true)
            expect(options['due']).toBe(true)
            expect(options['priority']).toBe(false)
        })
    })
})
