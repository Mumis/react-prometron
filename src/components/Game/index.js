import React, { Component } from 'react';
import Styled from 'styled-components';
//import HomeMap from '../HomeMap';
import GameMap from '../GameMap';
import { withFirebase } from '../Firebase';
import Chat from '../Chat';
import GameScore from '../GameScores';
import { compose } from "recompose";

import {
    AuthUserContext,
    withAuthorization,
} from "../Session";

/*** STYLED COMPONENETS ***/
const StyledFlexContainer = Styled.div`
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    height: auto;
    min-height: 492px;    
`;
const StyledMap = Styled.div`    
    position: relative;
    flex-basis: 100%;  
    height: 100vh;  
    border: 1px solid rgb(177,177,177);    
    border-top: 1px solid rgb(252,252,252);
`;

const ScoreBoard = Styled.div`
    position: absolute;
    top: 2%;
    right: 2%;
    z-index: 999;
    background: rgba(12,12,12,0.65);
    color: rgb(244,244,244);
    border: 1px solid rgb(244,244,244);
`;
const StyledBtnDiv = Styled.div`
    flex-basis: 100%;
    width: 100%;
    & button { 
       background: rgb(77,77,77);
        color: rgb(242,242,242);
        &:hover {
            background: rgb(17,17,17);
            color: rgb(255,255,255);    
        }
    }
`;
/*
const StyledChat = Styled.section`
    flex-basis: 100%;
    width: 100%;
    min-width: 332px;
    min-height: 292px;
    max-height: 500px;    
    margin-bottom: 32px;
    & h2 {
        color: rgb(29, 134, 226);
        text-shadow: 1px 1px 0.5px rgb(252,252,252);
        margin-bottom: 12px;
    }
    @media (max-width: 767px) {
        flex-basis: 100%;
        padding: 12px;
    }
    @media (max-width: 767px) {
        flex-basis: 100%;
        padding: 0;
    }
`;*/
/*** END ***/

class Game extends Component {
    state = {
        gameId: null,
        gameData: {
            users: null
        },
        userPath: [],
        userPoints: 0,
        parts: {
            scoreBoard: true,
            chatBoard: false
        }
    };

    calculateDistance = (lat1, lon1, lat2, lon2) => {
        var R = 6371; // km (change this constant to get miles)
        var dLat = ((lat2 - lat1) * Math.PI) / 180;
        var dLon = ((lon2 - lon1) * Math.PI) / 180;
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;

        return Math.round(d * 1000);
    };

    initializeGame = () => {
        const { authUser } = this.props;

            if (authUser && navigator.geolocation && this.timeRemaining) {
                this.setState({uid: authUser.uid});
                this.props.firebase.user(authUser.uid).once('value', snapshot => {
                    const data = snapshot.val();
                    const gameKey = Object.keys(data.games)[0];
                    this.setState({gameId: gameKey});
                    this.fetchGameData();
                }).then(() => {
                    this.watchUserPosition();
                    this.detectCollision();  
                });
            };
    };

    watchUserPosition = () => {
        this.watchId = navigator.geolocation.watchPosition(
            this.updatePosition,
            error => {
                console.log("error" + error);
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
                distanceFilter: 1
            }
        );
    };

    // Appends user path in DB
    updatePosition = position => {
        
        const newPosition = [position.coords.latitude, position.coords.longitude];

        const oldPosition = this.state.userPath[this.state.userPath.length - 1]

        if (this.calculateDistance(newPosition[0], newPosition[1], oldPosition[0], oldPosition[1]) > 1) {
            const userPath = this.state.userPath.slice();
            userPath.push(newPosition);
            this.setState(prevState => ({userPoints: prevState.gameData.users[this.props.authUser.uid].points + 1, userPath: userPath}));
            this.updateToDB();
            this.newFindNearestCoordinates(position)
        };
    };

    fetchGameData = () => {
        this.props.firebase.game(this.state.gameId).on("value", snapshot => {
            const data = snapshot.val();
            this.setState({ gameData: data });
        });
    };

    updateToDB = () => {
        this.props.firebase.game(this.state.gameId + '/users/' + this.state.uid).update({
            path: this.state.userPath,
            points: this.state.userPoints
        });
    };

    timeRemaining = () => {
        const currentTime = Math.round((new Date()).getTime() / 1000);
        if (currentTime < this.state.gameData.gametime) {
            return true
        } else {
            return false
        };
    };

    // findNearestCoordinates = (position) => {
    //     if (this.state.gameData !== null){
    //         const users = Object.keys(this.state.gameData.users);
    //         let distance = 10000
    //         // this.closestCoordinate:
    //         users.forEach(user => {
    //             if (user !== this.props.authUser.uid){
    //                 this.state.gameData.users[user].path.forEach((coordinates, index) => {
    //                     let tempDistance = this.calculateDistance(position.coords.latitude, position.coords.longitude, coordinates[0], coordinates[1]);
    //                     if (tempDistance < distance){
                            
                            
    //                     } 
    //                 });
    //             };
    //         });
    //     };
    // };

    newFindNearestCoordinates = (position) => {
        // [ {a: {lat: 52, lng: 18, dist: 12}, b: {....}}, {a: }
        const { users } = this.state.gameData;
        let pathDist = [], distUsers;
        if (users) {
            Object.keys(users).forEach(user => {
                if (user !== this.props.authUser.uid) {
                    distUsers = users[user].path.map((point) => ({
                        lat: point[0], lng: point[1], dist: this.calculateDistance(point[0], point[1], position.coords.latitude, position.coords.longitude), name: users[user].username
                    }));
                    console.log(distUsers);
                    distUsers.sort((a, b) => a.dist - b.dist);
        
                    // ta ut 2 med lägst dist
                    console.log(distUsers);
                    //pathDist.push(distUsers)
                };
                // indata vara en array av object, varje objekt ska ha två koordinater. denna data ska foreachas och kordinater ska in i linjecollisonmojängen
            });
        }
    }

    detectCollision = () => {
        //TODO
    };

    componentWillMount(){
        navigator.geolocation.getCurrentPosition(position => {
            this.setState({userPath: [[position.coords.latitude, position.coords.longitude]]});
        });
        this.initializeGame();
    };

    componentWillUnmount() {
        navigator.geolocation.clearWatch(this.watchId);
        this.props.firebase.game(this.state.gameId).off();
    };

    showChat = () => {
        if( !this.state.parts.chatBoard ) {
        this.setState({
            parts: {
                chatBoard: true
            }
        })
    } else {
        this.setState({
            parts: {
                chatBoard: false
            }
        })
    }
    }


    render() {
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <StyledFlexContainer>

                        {this.state.gameData.users ? 
                            <StyledMap className="map-container">
                                <GameMap
                                    userPosition={this.state.userPath[this.state.userPath.length - 1]}
                                    users={this.state.gameData.users}
                                />
                                <ScoreBoard>
                                    <GameScore 
                                        userId={authUser.uid}
                                        users={this.state.gameData.users}
                                    />
                                </ScoreBoard>
                            </StyledMap>
                        
                        : null }

                        <StyledBtnDiv>
                            <button onClick={this.showChat}>Chat Board</button>
                        </StyledBtnDiv>

                        { this.state.parts.chatBoard ? (
                        // <StyledChat id="chat-window">
                            <Chat />
                        // </StyledChat> 
                        ) : null }
                        
                    </StyledFlexContainer>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

//export default withFirebase(withAuthorization(Game)(() => true);

const condition = authUser => !!authUser;

export default compose(
    withFirebase,
    withAuthorization(condition)
)(Game);

