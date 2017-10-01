const config = require('config')
const kue = require('kue')

module.exports = {
  get: (name) => {
    // lookup backend
    if(name == 'queue_5m'){
      return kue.createQueue({
        jobEvents: true,
        prefix: 'queue_5m',
        redis: {
          port: config.get('redis.master.port'),
          host: config.get('redis.master.host'),
        }
      })
    }else{
      throw new Error('queue not found')
    }
  }
  
}