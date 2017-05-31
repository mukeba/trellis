import ss from '../slack-signaler'
import webrtc from '../webrtc'
import Tesseract from 'tesseract'
import EventEmitter from 'events'


export default class Network extends EventEmitter {
  constructor() {
    super()

    this.token  = process.env.SLACK_BOT_TOKEN
    this.name   = process.env.NAME
    this.webrtc = webrtc
    this.connected = false
  }

  connect(config) {
    if (this.connected) throw "network already connected - disconnect first"
    console.log("NETWORK CONNECT",config)
    this.config = config || this.config
    this.peers  = {}
    this.clocks = {}
    window.PEERS = []

    this.doc_id = this.config.docId
    this.store  = this.config.store

    this.connected = true

    this.store.on('change', (action,state) => {
      window.PEERS.forEach((peer) => {
        if (action == "APPLY_DELTAS") {
          console.log("SENDING VECTOR CLOCK", Tesseract.getVClock(state))
          peer.send({vectorClock: Tesseract.getVClock(state), docId: this.doc_id})
          this.peers[peer.id].messagesSent += 1
          this.emit('peer')
        } else {
          this.updatePeer(peer, state, this.clocks[peer.id])
        }
      })
    })

    if (this.token && this.doc_id) {
      let bot = ss.init({doc_id: this.doc_id, name: this.name, bot_token: this.token })

      webrtc.on('peer', (peer) => {
        window.PEERS.push(peer)
        console.log("NEW PEER:", peer.id, peer.name)
        this.peers[peer.id] = {
          connected: false,
          name: peer.name,
          lastActivity: Date.now(),
          messagesSent: 0,
          messagesReceived: 0
        }
        this.emit('peer')

        peer.on('disconnect', () => {
          window.PEERS.splice(window.PEERS.indexOf(peer))
          console.log("PEER: disconnected",peer.id)
          this.peers[peer.id].connected = false
          this.emit('peer')
        })

        peer.on('connect', () => {
          this.peers[peer.id].connected = true
          this.peers[peer.id].lastActivity = Date.now()
          this.peers[peer.id].messagesSent += 1
          this.emit('peer')
          if (peer.self == false) {
            peer.send({vectorClock: Tesseract.getVClock(this.store.getState())})
          }
        })

        peer.on('message', (m) => {
          let store = this.store

          if (m.deltas && m.deltas.length > 0) {
            console.log("GOT DELTAS",m.deltas)
/*
            console.log("BEFORE DISPATCH")
            console.log("m.deltas", m.deltas)
            console.log("m.vectorClock", m.vectorClock)
            console.log("Tesseract.getVClock(store.getState()", Tesseract.getVClock(store.getState()))
            console.log("Tesseract.getDeltasAfter(store.getState(), m.vectorClock", Tesseract.getDeltasAfter(store.getState(), m.vectorClock))
*/

            this.store.dispatch({
              type: "APPLY_DELTAS",
              deltas: m.deltas
            })

/*
            console.log("AFTER DISPATCH")
            console.log("m.deltas", m.deltas)
            console.log("m.vectorClock", m.vectorClock)
            console.log("Tesseract.getVClock(store.getState()", Tesseract.getVClock(store.getState()))
            console.log("Tesseract.getDeltasAfter(store.getState(), m.vectorClock", Tesseract.getDeltasAfter(store.getState(), m.vectorClock))
*/
          }

          if (m.vectorClock) {
            console.log("GOT VECTOR CLOCK",m.vectorClock)
            this.clocks[peer.id] = m.vectorClock
            this.updatePeer(peer,this.store.getState(), m.vectorClock)
          }
          this.peers[peer.id].lastActivity = Date.now()
          this.peers[peer.id].messagesReceived += 1
          this.emit('peer')
        })

      })

      webrtc.join(bot)
    } else {
      console.log("Network disabled")
      console.log("TRELLIS_DOC_ID:", this.doc_id)
      console.log("SLACK_BOT_TOKEN:", this.token)
    }
  }

  updatePeer(peer, state, clock) {
    if (peer == undefined) return
    if (clock == undefined) return
    console.log("Checking to send deltas vs clock",clock)
    process.nextTick(() => {
      let deltas = Tesseract.getDeltasAfter(state, clock)
      if (deltas.length > 0) {
        console.log("SENDING DELTAS:", deltas.length)
        peer.send({deltas: deltas})
        this.peers[peer.id].messagesSent += 1
        this.emit('peer')
      }
    })
  }

  // FIXME
  //    - close peerGroup connection so we stop receiving messages
  //    - stop any subscriptions to the store
  //    - stop any modifications/dispatches to the store
  //    - reset window.PEERS
  disconnect() {
    if (this.connected == false) throw "network already disconnected - connect first"
    console.log("NETWORK DISCONNECT")
    this.store.removeAllListeners('change')
    delete this.store
    webrtc.close()
    this.connected = false
  }
}