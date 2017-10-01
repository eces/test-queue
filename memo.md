find_reservation -> [] -> push_reservation





Channel.pull_*, push_*

Master.push_*







grpc client !!

.subscribe('url')
.digest(obj)






Queue = require('queue')
Policy = ...


Queue.publish('find reservation', options)
    Queue.state('cid find-reservation agoda.com') == true
    channels.*.push_reservation.active

// Queue.subscribe('message', handler)
Queue.subscribe('find reservation', handler)
    
    for ...
        Queue.state(':cid push-reservation agoda.com') == true {
            Queue.publish('push reservation', {})
        }

Queue.publish('push reservation', handler)
Queue.publish('push rates', handler)