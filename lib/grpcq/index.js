const grpc = require('grpc')
const debug = require('debug')('grpcq')
const verbose_message = require('debug')('grpcq:verbose')

const default_listener_on_error = (error) => {
  console.log('[grpcq] Uncaught, unspecified "error" event: ', error)  
}

class gRPCQueue {
  constructor (opt = {}) {
    this.type = opt.type
    this.access_key_id = opt.access_key_id
    this.secret_access_key = opt.secret_access_key
    this.version = 1
    this.endpoint = 'localhost:50051'
    this._services = {}
  }

  api (version) {
    if(!isFinite(+version))
      throw new Error('version invalid')
    const descriptor = grpc.load(`./lib/grpcq/queue_service.proto`)
    const api = descriptor.grpcq
    return api
  }
  service_key (version, endpoint) {
    return version + endpoint
  }

  // get client () {
  //   return this._services[this.service_key]
  // }

  // set client (v) {
  //   // warn if override
  //   this._services[this.service_key] = v
  // }

  createServer (opt = {}) {
    const api = this.api(opt.version)
    const server = new grpc.Server()
    server.addService(api.QueueService.service, {
      subscribe: (call) => {
        debug('[server received] subscribe > %o', call.request)
        setInterval(() => {
          call.write({
            id: '-1',
            body: JSON.stringify({
              message: 'Not Implemented',
            })
          })
        }, 3000)
        // call.end()
      },
      publish: (call, callback) => {
        debug('[server received] publish > %o', call.request)
        callback(new Error('Not Implemented'))
      },
    })
    server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
    return server
  }

  subscribe (opt = {}) {
    opt.type = opt.type || this.type
    opt.version = opt.version || this.version
    opt.endpoint = opt.endpoint || this.endpoint
    opt.access_key_id = opt.access_key_id || this.access_key_id
    opt.secret_access_key = opt.secret_access_key || this.secret_access_key
    opt.timeout = opt.timeout || this.timeout
    opt.max_retry = opt.max_retry || this.max_retry
    opt.deadletter = opt.deadletter || this.deadletter

    if (!opt.type) 
      throw new Error('options.type undefined')
    
    const key = this.service_key(opt.version, opt.endpoint)
    debug('service key %s', key)
    if(!this._services[key]){
      const api = this.api(opt.version)
      this._services[key] = new api.QueueService(opt.endpoint, grpc.credentials.createInsecure())
    }
    debug('client %O', opt)
    
    const stream = this._services[key].subscribe({
      version: '1',
      option: JSON.stringify(opt),
    })
    stream.on('data', (message) => {
      verbose_message('stream:data %O', message)
      const json = JSON.parse(message.body || '{"message":"empty body"}')
      if(!message.id || message.id == '-1'){
        // check error
        if(stream.listeners('error').length === 0){
          // set default if no error handler
          stream.on('error', default_listener_on_error)
        }
        return stream.emit('error', json)
      }
      stream.emit('message', json)
    })
    return stream
  }
}



// const EventEmitter = require('events')
// class gRPCQueueEmitter extends EventEmitter {}

// const e = new gRPCQueueEmitter()
// module.exports = e


// instance = new gRPCQueue()
module.exports = new gRPCQueue()

module.exports.defaults = opt => {
  return new gRPCQueue(opt)
}