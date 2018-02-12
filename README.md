# libp2p-websocket-star

[![](https://img.shields.io/badge/made%20by-mkg20001-blue.svg?style=flat-square)](http://ipn.io)
[![Build Status](https://travis-ci.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-websocket-star)

![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)
![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)

> Allows to listen on multiple websocket-star-rendezvous servers while ignoring offline ones

## Description

`libp2p-websocket-star-multi` allows to listen on multiple websocket-star-rendezvous servers while ignoring offline ones

**Note:** This module uses [pull-streams](https://pull-stream.github.io) for all stream based interfaces.

## Usage

### Installation

```bash
> npm install libp2p-websocket-star
```

### API

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Example

```js
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
```

Outputs:
```
hello
hello from the other side
```

### This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about why we did this, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

#### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to a Node.js stream using the module [`pull-stream-to-stream`](https://github.com/pull-stream/pull-stream-to-stream), giving you an instance of a Node.js stream that is linked to the pull-stream. For example:

```js
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about this utility, visit https://pull-stream.github.io/#pull-stream-to-stream.

LICENSE MIT
