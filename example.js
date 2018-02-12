'use strict'

const Libp2p = require('libp2p')
const Id = require('peer-id')
const Info = require('peer-info')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const WSStarMulti = require('libp2p-websocket-star-multi')

Id.create((err, id) => {
  if (err) throw err

  const peerInfo = new Info(id)
  peerInfo.multiaddrs.add(multiaddr('/p2p-websocket-star')) // will get replaced to the multiaddr of the individual servers
  const ws = new WSStarMulti({
    servers: [ // servers are Multiaddr[]
      '/dnsaddr/ws-star-signal-1.servep2p.com/tcp/443/wss/p2p-websocket-star',
      '/dnsaddr/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star',
      '/dnsaddr/ws-star-signal-3.servep2p.com/tcp/443/wss/p2p-websocket-star',
      '/dnsaddr/ws-star-signal-4.servep2p.com/tcp/443/wss/p2p-websocket-star',
      '/dnsaddr/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
      '/dns4/localhost/tcp/80/ws/p2p-websocket-star'
    ],
    // ignore_no_online: true, // enable this to prevent wstar-multi from returning a listen error if no servers are online
    id // the id is required for the crypto challenge
  })

  const modules = {
    transport: [
      ws
    ],
    discovery: [
      ws.discovery
    ]
  }

  const node = new Libp2p(modules, peerInfo)

  node.handle('/test/1.0.0', (protocol, conn) => {
    pull(
      pull.values(['hello']),
      conn,
      pull.map((s) => s.toString()),
      pull.log()
    )
  })

  node.start((err) => {
    if (err) {
      throw err
    }

    node.dial(peerInfo, '/test/1.0.0', (err, conn) => {
      if (err) {
        throw err
      }

      pull(
        pull.values(['hello from the other side']),
        conn,
        pull.map((s) => s.toString()),
        pull.log()
      )
    })
  })
})
