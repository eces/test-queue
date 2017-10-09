const config = require('config')
const chalk = require('chalk')
const queues = require('./lib/queue')

/*
 * # Job Queue test
 * 큐 호스팅 만들기 전에 이것저것 테스트합니다.
 * 
 * #### 시작하기
 * `npm start`
 * 
 * #### 문서 빌드
 * `grunt nodocs`
 * 
 * ----------------------------
 */

const actions = {}

actions['kue.js 테스트'] = function () {
  /*
   * ### kue.js 테스트
   * - global events(enqueue)가 잘되어있어서 커스텀 하기 좋음
   * - .delay() 이런식 API도 좋음
   * - locked job이 상태가 변한다거나 이슈가 있는듯?
   * - schedule 기능이 없고, unique id 지원안해서그냥 쓰기엔 부족함.
   * - 기본기능은 의외로 잘만들어짐.
   */
  const queue_5m = queues.get('queue_5m')
  queue_5m
    .on('job enqueue', (id, type) => {
      console.log('enqueue', id)
    })
    .on('job complete', (id, result) => {
      console.log('complete', id)
    })
    .on('error', (err) => {
      console.error(err)
    })
    
  queue_5m.watchStuckJobs(1000)
  
  queue_5m.process('find reservation', (job, done) => {
    console.log('job.data', job.data)
    setTimeout( () => {
      // do something
      if(Math.random()*100 > 50){
        process.exit(-1)
      }
      queue_5m.create('find reservation', {
        company_id: job.data.company_id
      }).delay(1000).save()
      done()
    }, 2000)
  })
  //   queue_5m.create('find reservation', {
  //     company_id: 1
  //   }).delay(1000).save(err => {
  //     if(err) console.log(err)
  //     })
  // console.log(chalk`> {green NOW RUNNING}`)
}

actions['OptimalBits/bull 테스트'] = function () {
  /*
   * ### OptimalBits/bull 테스트
   * - global events(enqueue)가 거의없어서 커스텀 어려움
   * - 세세한 옵션이 있어서 개발할땐 쓰기 좋을듯
   * - lock 부분 잘됨
   * - schedule 기능이 있고, unique id 지원도 하지만
   * - scheduled job에 대해 id 검색이 안되는등 무언가 빠져있음
   * - processor 설정하면 아예 child_process fork로 가능 !!!
   * - SQS VisibilityTimeout은 backoff delay로 일단 해결?
   */

  const queue_5m_bull = queues.get('queue_5m_bull')
  // queue_5m_bull.clean(1, 'delayed')
  // queue_5m_bull.clean(1)
  queue_5m_bull.on('completed', (job, result) => {
    console.log('complete', job.id, result)
  })
  queue_5m_bull.on('error', error => {
    console.log('> error', error)
  })

  queue_5m_bull.process(async (job, done) => {
    console.log('>>>>skip')
    done()
  })
  queue_5m_bull.process('find reservation', 2, async (job, done) => {
    console.log('> JobCounts', await queue_5m_bull.getJobCounts())

    console.log('job.attemptsMade', job.attemptsMade)
    console.log('job.data', job.data)
    console.log('job.id', job.id)
    // return done(new Error('ssdf'))
    // throw new Error('skip')
    console.log('job.data ?')

    setTimeout( () => {
      // do something
      // return done(new Error('sdfsdfdsf'))
      if(Math.random()*100 > 50){
        // throw new Error('sdfdsf')
        return done(new Error('sdfsdfdsf'))
      }
      done(null, {status: 200})
    }, 2000)
  })

  queue_5m_bull.add('find reservation', {company_id: 1}, {
    delay: 1000,
    attempts: 20,
    backoff: {
      // type: 'exponential',
      type: 'fixed',
      delay: 1000,
    },
    jobId: `#find-reservation-1`,
    timeout: 5000,
    removeOnComplete: false,
    removeOnFail: false,
  })
}

actions['bull + grpc.io 테스트'] = function () {
  /*
   * ### bull + grpc.io 테스트
   * - 상세한 client API는 고민 더 필요함. Proof of Concept으로 한다.
   * - 당연히 pub/sub은 잘됨
   * - 클라이언트 코드가 간결함
   * - Visibility 처리가 문제임 ... 
   *   > MessageReceipt ID로 EventEmitter callback하여서
   *   > 해당 job process done(null, 정상처리) 끝내는게 좋을듯.
   *   > 단 VisibilityTimeout만큼 timeout이 필요함 + 해당 ReceiptID invalidate.
   */

  const queue_5m_bull = queues.get('queue_5m_bull')
  // queue_5m_bull.clean(1, 'delayed')
  // queue_5m_bull.clean(1)
  queue_5m_bull.on('completed', (job, result) => {
    console.log('complete', job.id, result)
  })
  queue_5m_bull.on('error', error => {
    console.log('> error', error)
  })

  const grpc = require('grpc')
  const descriptor = grpc.load('./queue_service.proto')
  const api = descriptor.queue_service

  // const Server = grpc.buildServer([api.QueueService.service])
  const server = new grpc.Server()
  server.addService(api.QueueService.service, {
    subscribe: (call) => {
      console.log('subscribe > topic.name', call.request.name)
      // setInterval(function(){
      //   call.write({
      //     id: String(Date.now()),
      //     body: 'find-reservation',
      //   })
      // }, 1000)
      queue_5m_bull.process(call.request.name, (job, done) => {
        console.log('queue > ', job.id)
        call.write({
          id: String(job.id),
          body: JSON.stringify(job.data),
        })
        // stay active
        // await job.progress(10)
        // await job.retry()
        return done(new Error('sdf'))
      })
    },
    publish: async (call, callback) => {
      // return callback(new Error('topic not created'))
      console.log('[server] publish message ', call.request)
      // call.write({id:11111})
      let r = await queue_5m_bull.add(
        call.request.name, 
        JSON.parse(call.request.data), 
        JSON.parse(call.request.option)
      )
      return callback(null, {id: r.id})
    },
  })
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
  server.start()

  const client = new api.QueueService('localhost:50051', grpc.credentials.createInsecure())
  client.publish({
    name: 'find-reservation-1', 
    data: JSON.stringify({company_id: 5}),
    option: JSON.stringify({
      delay: 1000,
      attempts: 10,
      backoff: {
        // type: 'exponential',
        type: 'fixed',
        delay: 5000,
      },
      // jobId: ID,
      // repeat: {
      //   cron: '*/1 * * * *',
      // },
      timeout: 5000,
      removeOnComplete: true,
      removeOnFail: true,
    })
  }, (err, message_receipt) => {
    if(err){
      return console.log('err ', err)
    }
    console.log('[client] message reciept', message_receipt)
  })
  client
    .subscribe({name: 'find-reservation-1'})
    .on('data', (message) => {
      console.log('[client] got message', message)
    })
    .on('status', (status) => {
      console.log('[client] status ', status)
    })
  // client.subscribe()
}

actions['grpcq.io 테스트'] = function () {
  /*
   * ### grpcq.io 테스트
   * - grpc queue라는 느낌을 살리자. 괜히 새롭게 할 필요없음.
   * 
   * #### 사용하기
   * ```js
   * const grpcq = require('grpcq')
   * grpcq
   *  .subscribe({})
   *  .on('message', handler)
   *  .on('error', error)
   * ```
   * 
   * #### 개발하기
   * 
   * `DEBUG=grpcq* nodemon index.js`
   */

  // const Queue = require('lemongrass')
  // const queue = grpcq.defaults({
  // const queue1 = grpcq.configure({  
  // grpcq.setDefault({})
  // backend: {
  //   type: 'sqs',
  // },
  
  try {
    // const grpcq = require('grpcq')
    // const grpcq = require('./lib/grpcq')
    // const grpcq = require('./lib/grpcq').defaults({
    //   type: 'sqs',
    //   access_key_id: config.get('aws.ACCESS_KEY_ID'),
    //   secret_access_key: config.get('aws.SECRET_ACCESS_KEY'),
    // })
    const grpcq = require('./lib/grpcq')
    
    grpcq.createServer({version:1}).start()
  
    grpcq.subscribe({
      name: 'dev find reservation 5m',
      timeout: 5000,
      max_retry: 20,
      deadletter: 'dev find reservation failed',
      type: 'sqs',
      access_key_id: config.get('aws.ACCESS_KEY_ID'),
      secret_access_key: config.get('aws.SECRET_ACCESS_KEY'),
    })
    .on('message', (message) => {
      console.log('[client] got message', message)
    })
    .on('error', (error) => {
      console.log('[client] got error', error)
    })
  } catch (error) {
    console.error(error)
  }
}

actions['grpcq.io backend 테스트'] = function () {
  /*
   * ### grpcq backend 테스트
   * 
   */

  try {
    const grpcq = require('./lib/grpcq')
    
    grpcq.createServer({version:1, backend:'memory'}).start()
  
    grpcq.subscribe({
      name: 'dev find reservation 5m',
      type: 'sqs',
    })
    .on('message', (message) => {
      console.log('[client] got message', message)
    })
    .on('error', (error) => {
      console.log('[client] got error', error)
    })
    
    setInterval(async function(){
      try {
        let receipt = await grpcq.publish({
          name: 'dev find reservation 5m',
          type: 'sqs',
          data: 'any data ' + Date.now(),
        })
        console.log('[client] published ', receipt)
      } catch (error) {
        console.log('[client] publish error ', error)
      }
    }, 1000)
  } catch (error) {
    console.error(error)
  }
}

async function main() {
  // actions['bull + grpc.io 테스트']()
  // actions['grpcq.io 테스트']()
  actions['grpcq.io backend 테스트']()
  console.log(chalk`> {green NOW RUNNING}`)
  // console.log('> JobCounts', await queue_5m_bull.getJobCounts())

  // setInterval( async function() {
  //   const queue = queues.get('queue_5m_bull')

  //   // let ID = 'repeat:find reservation:#find-reservation-3:1506840960000'
  //   console.log(await queues.job('#find-reservation-5').data('original_id'))
  //   return 
  //   let job = await queue.getJob(ID)
  //   // console.log(job)
  //   if(job){
  //     console.log(chalk`> ${ID}: `, job.data)
  //   }else{      
  //     console.log(chalk`> ${ID}: {blue null}`)
  //   }
  // }, 1000)
}
main()