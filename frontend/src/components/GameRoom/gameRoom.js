import React, { Component } from 'react';
import CommonCards from './commonCards';
import MyCards from './myCards';
import GameScores from './gameScores';
import OtherPlayers from './otherPlayers';
import axios from 'axios';
import { Redirect } from 'react-router';
import GameStatus from '../../APIs/gameStatus';
// import socket from '../../APIs/index';

class GameRoom extends Component {

	constructor() {
		super() 
		this.state = {
			message: '',
			invalidGame: false,
			gameState: null
		}
	}

	componentDidMount () {
		axios.get(`/game/validGame/${this.props.match.params.gameId}`)
		.catch(() => {
			this.setState({
				invalidGame: true
			})
		})
		GameStatus(this.props.match.params.gameId, localStorage.getItem('GameUserId'), (data) => {
			console.log(data)
			this.setState({
				gameState: data
			})
		})
			
	}

	render() {

		if (!localStorage.getItem('GameUserId')) {
			return (<Redirect to="/" />)
		}

		if (this.state.invalidGame === true) {
			return (<Redirect to="/joinGame" />)
		}

		if (!this.state.gameState) {
			return (null)
		}

		return (
			<div className="row">
				<div className="col-md-3">
					<OtherPlayers gameId={this.props.match.params.gameId} allPlayers={this.state.gameState.allPlayers} />
				</div>
				<div className="col-md-6">
					<div>
						<CommonCards gameId={this.props.match.params.gameId} currentCards={this.state.gameState.currentCards} />
					</div>
					<div>
						<GameScores gameId={this.props.match.params.gameId} scores={this.state.gameState.scores} />
					</div>
				</div>
				<div className="col-md-3">
					<MyCards gameId={this.props.match.params.gameId} />
				</div>
			</div>
		);
	}

}
//export GameRoom Component
export default GameRoom;