const config = require('config')
const chalk = require('chalk')
const queues = require('./lib/queue')

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

// queue_5m_bull.add('find reservation', {company_id: 1}, {
//   delay: 1000,
//   attempts: 20,
//   backoff: {
//     // type: 'exponential',
//     type: 'fixed',
//     delay: 1000,
//   },
//   jobId: `#find-reservation-1`,
//   timeout: 5000,
//   removeOnComplete: false,
//   removeOnFail: false,
// })

async function main() {
  console.log(chalk`> {green NOW RUNNING}`)
  console.log('> JobCounts', await queue_5m_bull.getJobCounts())

  setInterval( async function() {
    const queue = queues.get('queue_5m_bull')

    // let ID = 'repeat:find reservation:#find-reservation-3:1506840960000'
    console.log(await queues.job('#find-reservation-5').data('original_id'))
    return 
    let job = await queue.getJob(ID)
    // console.log(job)
    if(job){
      console.log(chalk`> ${ID}: `, job.data)
    }else{      
      console.log(chalk`> ${ID}: {blue null}`)
    }
  }, 1000)
}
main()