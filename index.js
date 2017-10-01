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
  console.log('job.data', job.data )
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

console.log(chalk`> {green NOW RUNNING}`)

queue_5m.create('find reservation', {
  company_id: 1
}).delay(1000).save(err => {
  if(err) console.log(err)
})