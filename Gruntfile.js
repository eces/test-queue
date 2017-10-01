const queues = require('./lib/queue')

module.exports = (grunt) => {
  grunt.registerTask('start_find_reservation', (company_id = 0) => {
    const queue_5m = queues.get('queue_5m')
    queue_5m.create('find reservation', {
      company_id: company_id
    }).priority('high').save(err => {
      console.log(err)
    })
  })
}