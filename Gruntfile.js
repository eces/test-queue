const queues = require('./lib/queue')

module.exports = (grunt) => {
  grunt.registerTask('stop', '...', async function (company_id = 0) {
    done = this.async()
    try {
      const queue = queues.get('queue_5m_bull')
      console.log('> JobCounts', await queue.getJobCounts())

      const ID = await queues.job('#find-reservation-'+company_id).data('original_id')

      console.log('FOUND?', ID)
      let job = await queue.getJob(ID)
      if(job){
        console.log('FOUND!!')
        await job.remove()
      }
      console.log('> JobCounts', await queue.getJobCounts())
      
      done()
    } catch (err) {
      done(err)
    }
  })

  grunt.registerTask('start', '...', async function (company_id = 0) {
    done = this.async()
    try {
      const queue = queues.get('queue_5m_bull')
      console.log('> JobCounts', await queue.getJobCounts())

      const ID = `#find-reservation-${company_id}`

      job = await queue.add('find reservation', {company_id: company_id}, {
        delay: 1000,
        attempts: 10,
        backoff: {
          // type: 'exponential',
          type: 'fixed',
          delay: 1000,
        },
        jobId: ID,
        repeat: {
          cron: '*/1 * * * *',
        },
        timeout: 5000,
        removeOnComplete: false,
        removeOnFail: false,
      })

      if(job){
        queues
          .job(ID)
          .data('original_id', job.id)
      }

      
      // console.log('>>>', (job && job.id))
      console.log('> JobCounts', await queue.getJobCounts())
      
      done()
    } catch (err) {
      done(err)
    }
    
    // queue.getJobCounts().then( r => {
    //   console.log('> JobCounts', r)
    // })
    // console.log(2)
    // // queue_5m.create('find reservation', {
    // //   company_id: company_id
    // // }).priority('high').save(err => {
    // //   console.log(err)
    // // })
    // queue.add('find reservation', {company_id: company_id}, {
    //   delay: 1000,
    //   attempts: 10,
    //   backoff: {
    //     // type: 'exponential',
    //     type: 'fixed',
    //     delay: 1000,
    //   },
    //   jobId: `#find-reservation-1`,
    //   // repeat: {
    //   //   cron: '*/1 * * * *',
    //   // },
    //   timeout: 5000,
    //   removeOnComplete: false,
    //   removeOnFail: false,
    // })
    // console.log(3)

    // console.log('> JobCounts', await queue.getJobCounts())
    // console.log(4)
    
    // done('dfgdfg')
  })
}