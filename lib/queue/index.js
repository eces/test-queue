const config = require('config')
const kue = require('kue')
const Queue = require('bull')
const Redis = require('ioredis')
const redis = new Redis({
  port: config.get('redis.master.port'),
  host: config.get('redis.master.host'),
})

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
    }
    if(name == 'queue_5m_bull'){
      return new Queue('find reservation', {
        redis: {
          port: config.get('redis.master.port'),
          host: config.get('redis.master.host'),
        }
      })
    }
    throw new Error('queue not found')
  },

  job: (id) => {
    return {
      data: function (key, value) {
        return module.exports.data(id, key, value)
      },
    }
  },

  data: (id, key, value) => {
    if(!id)
      throw new Error('id undefined')
    
    // null value can be saved
    if(id && key && value === undefined){
      return redis.get(`ids:${id}:${key}`)
    }
    if(id && key && value){
      return redis.set(`ids:${id}:${key}`, value)
    }
    throw new Error('data parameters invalid')
  },    
  
}