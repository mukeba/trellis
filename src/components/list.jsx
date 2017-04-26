import React from 'react'
import ListCard from './list_card'
import AddCard from './add_card'

export default class List extends React.Component {
  constructor(props) {
    super(props)
    this.onDrop = this.onDrop.bind(this)
  }

  onDrop(event) {
    let cardId  = parseInt(event.dataTransfer.getData("text"))
    let card    = this.props.store.findCard(cardId)
    card.listId = this.props.listId

    this.props.store.updateCard(card)
  }

  preventDefault(event) {
    event.preventDefault()
  }

  render() {
    let listCards = this.props.cards.map((card) => {
      return <ListCard cardId={ card.id } key={ card.id } title={ card.title }/>
    })

    return (
      <div className="List" onDrop={ this.onDrop } onDragOver={ this.preventDefault } >
        <div className="List__title">{ this.props.title }</div>
        { listCards }
        <AddCard listId={ this.props.listId } store={ this.props.store }/>
      </div>
    )
  }
}