'use strict'

const debug = require('debug')
const log = debug('libp2p:websocket-star:multi')
const once = require('once')

const EE = require('events').EventEmitter
const map = require('async/map')
const parallel = require('async/parallel')
const multiaddr = require('multiaddr')
const mafmt = require('mafmt')

const WSStar = require('libp2p-websocket-star')
class WebsocketStarMulti { // listen on multiple websocket star servers without having to worry about one being down.
  // NOTE: if no servers are reachable or provided an error is thrown
  constructor (opt) {
    this.opt = opt || {}
    this.servers = opt.servers || []
    this.ws = new WSStar(this.opt)
    this.discovery = this.ws.discovery
  }
  dial (ma, opt, cb) {
    log('dial', ma)
    return this.ws.dial(ma, opt, cb)
  }
  createListener (options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    const listener = new EE()
    listener.servers = {}
    listener.online = []
    this.servers.forEach(ser => {
      const s = this.ws.createListener(options, handler)
      s.once('error', () => {})
      s.url = ser
      listener.servers[ser] = s
    })

    listener.listen = (ma, cb) => {
      const id = ma.toString().split('ipfs/').pop()
      log('listen on %s server(s) with id %s', this.servers.length, id)
      parallel(this.servers.map(url => listener.servers[url]).map(server =>
        cb => {
          log('listen %s', server.url)
          const next = once(err => {
            log('listen %s ok %s', server.url, !err)
            if (err) return cb(log(err))
            listener.online.push(server)
            return cb()
          })
          setTimeout(next, this.opt.timeout || 5000, new Error('Timeout'))
          server.listen(multiaddr(server.url).encapsulate('/ipfs/' + id), next)
        }), () => {
        if (!listener.online.length && !this.opt.ignore_no_online) {
          const e = new Error("Couldn't listen on any of the servers")
          listener.emit('error', e)
          cb(e)
        } else {
          listener.emit('listening')
          cb()
        }
      })
    }

    listener.close = cb =>
      parallel(listener.online.map(s => cb => s.close(cb)), err => cb(err, (listener.online = [])))

    listener.getAddrs = cb => map(listener.online, (s, n) => s.getAddrs(n), (err, res) => {
      if (err) return cb(err)
      return cb(null, res.reduce((a, b) => a.concat(b), []))
    })

    return listener
  }

  filter (ma) {
    if (!Array.isArray(ma)) ma = [ma]
    return ma.filter(ma => ma.toString().startsWith('/p2p-websocket-star') || mafmt.WebSocketStar.matches(ma))
  }
}

module.exports = WebsocketStarMulti
