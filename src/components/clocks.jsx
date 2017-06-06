import React from 'react'

export default class Clocks extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 'peers': {}, 'clocks': {} }
  }

  // The constructor is not necessarily called on
  // re-renders, so set our webrtc listeners here
  componentWillReceiveProps(nextProps) {
    if(!nextProps.network) return

    this.setState({
      peers: Object.assign({},nextProps.network.peers),
      clocks: Object.assign({},nextProps.network.clocks)
    })

    nextProps.network.on('peer',() => {
      this.setState({
        peers: Object.assign({},nextProps.network.peers),
        clocks: Object.assign({},nextProps.network.clocks)
      })
    })
  }

  formatUUID(uuid) {
    return uuid.toLowerCase().substring(0,4)
  }

  formatVectorClock(id, clock, allKnownWriters) {
    let key = "vclock-" + id

    if (!clock)
      return <tr key={key}></tr>

    let tails = allKnownWriters.map( (peer_id, index) => {
      let key = "peer-vclock-td-" + index + "-" + peer_id
      return <td className="clockPosition" key={key}> { clock[peer_id] } </td>
    })
    return <tr key={key}><th>{this.formatUUID(id)}</th>{tails}</tr>
  }

  render() {
    let peers = this.state.peers

    let allKnownWriters = []
    Object.keys(peers).forEach((peerId) => {
      let clock = this.state.clocks[peerId]
      if (clock) {
        let thisPeerWriters = Object.keys(clock)
        allKnownWriters = allKnownWriters.concat(thisPeerWriters)
      }
    })
    allKnownWriters = Array.from(new Set(allKnownWriters))

    let clockHeaders = allKnownWriters.map((peerId, index) => {
      let key = "peer-vclock-th-" + index + "-" + peerId
      return <th className="peerID" key={key}>{ this.formatUUID(peerId) }</th>
    })

    let clockRows = Object.keys(peers).map((id, index) => {
      return this.formatVectorClock(id, this.state.clocks[id], allKnownWriters)
    })

    return <div className="Clocks">
      <h2>Clocks <img src="assets/images/clock.svg" /></h2>
      <table>
        <thead><tr><th></th>{clockHeaders}</tr></thead>
        <tbody>{clockRows}</tbody>
      </table>
    </div>
  }
}