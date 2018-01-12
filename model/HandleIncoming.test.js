const expect = require('expect');
const HandleIncoming = require('./HandleIncoming')
const { MESSAGE_TYPE_BANK_RATE, MESSAGE_TYPE_BEST_RATE, MESSAGE_TYPE_PASS, MESSAGE_TYPE_WORNG_COMMAND, MESSAGE_TYPE_NO_MATCH} = require('../util/constant')

describe('HandleIncoming Test',() => {
    
    it('expect string ERROR ', () => {
        // HandleIncoming.switchIncomingType('/best ')
        const result = HandleIncoming.switchIncomingType('/best bffs')
        expect(result.type).toBe(MESSAGE_TYPE_WORNG_COMMAND)
        expect(result.value).toBe('bffs')
        
    })
    
    it('expect Object.type = BEST_RATE', () => {
        
        const result = HandleIncoming.switchIncomingType('/best usd')
        expect(result.type).toBe(MESSAGE_TYPE_BEST_RATE)
        expect(result.value).toBe('USD')
    })
    
    it('expect Object.type = MESSAGE_TYPE_BANKRATE ', () => {
        
        const result = HandleIncoming.switchIncomingType('/006')
        expect(result.type).toBe(MESSAGE_TYPE_BANK_RATE)
        expect(result.value).toBe('006')
    })
    
    it('expect Object.type = MESSAGE_TYPE_PASS ', () => {
        const result3 = HandleIncoming.switchIncomingType('測試測試')
        expect(result3.type).toBe(MESSAGE_TYPE_PASS)
        expect(result3.value).toBe('測試測試')
        
    })
    
    //不該來
    it('expect Object.type = MESSAGE_TYPE_NO_MATCH ', () => {
        const result = HandleIncoming.switchIncomingType('/1d3cs')
        expect(result.type).toBe(MESSAGE_TYPE_NO_MATCH)
        expect(result.value).toBe('1d3cs')
        
    })
})