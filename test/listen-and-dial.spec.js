/* eslint-env mocha */
/* eslint-disable max-nested-callbacks */

'use strict'

const servers = ['/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star', '/ip4/127.0.0.1/tcp/15002/ws/p2p-websocket-star'].concat(!process.env.TRAVIS ? ['/ip6/::1/tcp/15003/ws/p2p-websocket-star'] : [])
const offlineServer = '/ip4/127.0.0.1/tcp/16000/ws/p2p-websocket-star'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
const multiaddr = require('multiaddr')
const getMa = id => multiaddr('/p2p-websocket-star/ipfs/' + id.toB58String())
const pull = require('pull-stream')
const pullTestData = [Buffer.from('hello world!')]
const pullTest = (conn, cb) => pull(pull.values(pullTestData.slice(0)), conn, pull.collect((err, res) => {
  expect(err).to.not.exist()
  expect(res).to.eql(pullTestData)
  cb()
}))
chai.use(dirtyChai)

const Id = require('peer-id')
const {
  each,
  map
} = require('async')
const WSMulti = require('..')

describe('websocket-star-multi', () => {
  let ids
  before(cb => map(require('./ids.json'), Id.createFromJSON, (err, _) => err ? cb(err) : cb(null, (ids = _))))
  let l = []
  describe('listen', () => {
    let id
    before(() => {
      id = ids[0]
    })
    it('should listen on 1 address', cb => {
      const listener = new WSMulti({
        id,
        servers: [servers[0]]
      }).createListener()
      l.push(listener)
      listener.listen(getMa(id), err => {
        expect(err).to.not.exist()
        expect(listener.online).to.have.lengthOf(1)
        cb()
      })
    })

    it('should listen on 3 addresses', cb => {
      const listener = new WSMulti({
        id,
        servers: servers
      }).createListener()
      l.push(listener)
      listener.listen(getMa(id), err => {
        expect(err).to.not.exist()
        expect(listener.online).to.have.lengthOf(!process.env.TRAVIS ? 3 : 2)
        cb()
      })
    })

    it('listen on offline server should fail', cb => {
      const listener = new WSMulti({
        id,
        servers: [offlineServer]
      }).createListener()
      l.push(listener)
      listener.once('error', () => {})
      listener.listen(getMa(id), err => {
        expect(err).to.exist()
        expect(listener.online).to.have.lengthOf(0)
        cb()
      })
    })

    it('listen on offline server and up server should not fail', cb => {
      const listener = new WSMulti({
        id,
        servers: [servers[0], offlineServer]
      }).createListener()
      l.push(listener)
      listener.listen(getMa(id), err => {
        expect(err).to.not.exist()
        expect(listener.online).to.have.lengthOf(1)
        cb()
      })
    })

    it('listen on offline server with ignore_no_online should not fail', cb => {
      const listener = new WSMulti({
        id,
        servers: [offlineServer],
        ignore_no_online: true
      }).createListener()
      l.push(listener)
      listener.listen(getMa(id), err => {
        expect(err).to.not.exist()
        expect(listener.online).to.have.lengthOf(0)
        cb()
      })
    })
  })
  describe('dial', () => {
    let c1, c2, c3
    before(cb => {
      map(ids, (id, cb) => {
        const m = new WSMulti({
          id,
          servers: servers
        })
        const l = m.createListener(conn => pull(conn, conn))
        l.id = id
        l.dial = m.dial.bind(m)
        l.listen(getMa(id), err => err ? cb(err) : cb(null, l))
      }, (err, c) => {
        expect(err).to.not.exist()
        c1 = c.shift()
        c2 = c.shift()
        c3 = c.shift()
        cb()
      })
    })

    it('c1 should dial to c2 over server 2', cb => {
      const toDial = multiaddr(servers[1] + '/ipfs/' + c2.id.toB58String())
      c1.dial(toDial, (err, conn) => {
        expect(err).to.not.exist()
        pullTest(conn, cb)
      })
    })

    it('c1 dial c3 over non-existent server should fail', cb => {
      const toDial = multiaddr(offlineServer + '/ipfs/' + c2.id.toB58String())
      c1.dial(toDial, (err, conn) => {
        expect(err).to.exist()
        expect(conn).to.not.exist()
        cb()
      })
    })

    after(() => l.push(c1, c2, c3))
  })
  afterEach(cb => each(l, (l, cb) => l.close(cb), err => err ? cb(err) : cb(null, (l = []))))
})
