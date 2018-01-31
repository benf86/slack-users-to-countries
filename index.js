const iplocation = require('iplocation')
const request = require('request-promise')
const PromiseThrottle = require('promise-throttle')
const authorizationToken = require('./authorization')
const logs = `https://slack.com/api/team.accessLogs?token=${authorizationToken}`
const gMaps = require('./gmaps')


request(logs)
.then(JSON.parse)
.then(res => {
  const ipData = res || require('./sample')

  const promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 1,
    promiseImplementation: Promise,
  })

  var users = ipData.logins.slice(0, 5) // slice for testing so we don't spam
  .map(u => ({
      username: u.username,
      ip: u.ip,
      country: null,
    })
  )
  .reduce((prev, cur) => // remove duplicates
    Object.assign(prev, {
      [cur.username]: cur
    }), {})

  users = Object.keys(users).map(k => users[k])

  console.log(JSON.stringify(users, 0, 2))


  const locate = user =>
    iplocation(user.ip)
    .then(res => ({
      username: user.username,
      country: res.country_name
    }))

  var amountOfPromises = users.length;
  while (amountOfPromises-- > 0) {
    promiseThrottle.add(locate.bind(this, users[amountOfPromises]))
      .then(function(userData) {
        gMaps.add(userData)
      });
  }
})
.catch(e => JSON.stringify(e, 0, 2))