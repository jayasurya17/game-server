import { useState, useEffect, useCallback } from 'react';
import { Center, CopyButton, Stack, Tooltip, ActionIcon, Group, Title, Text, Button, Table, Menu, Loader, Grid } from "@mantine/core";
import { IconCheck, IconCopy, IconClockHour4, IconBrandGoogleOne, IconWorld, IconSortAscending2, IconLayersLinked, IconX } from '@tabler/icons';
import { useNavigate } from 'react-router-dom';
import { useParams } from "react-router-dom";
import { GetLobbyUpdates, StartGame } from '../../Providers/Socket/emitters'
import { LobbyListener } from '../../Providers/Socket/listeners'
import { getIdTokenOfUser, logout } from '../../Providers/Firebase/config';
import { showNotification } from '@mantine/notifications';

function WaitingScreen() {
  let params = useParams()
  let GameCode = params.gameId;
  const Navigate = useNavigate();


  const getUserStatus = useCallback(async () => {
    const authId = await getIdTokenOfUser();
    fetch(import.meta.env.VITE_API + "/users/userStatus", {
      headers: {
        Authorization: `Bearer ${authId}`,
      },
    }).then(async (response) => {
      if (response.ok) {
        response.json().then(json => {
          if (json.status == "NOT_PLAYING") {
            Navigate(`/`)
          } else if (json.status == "LOBBY" && GameCode != json.gameId) {
            Navigate(`/waiting/${json.gameId}`)
          } else if (json.status == "GAME_ROOM") {
            Navigate(`/game/${json.gameId}`)
          } else if (json.status == "INACTIVE") {
            showNotification({
              variant: 'outline',
              color: 'red',
              title: 'Something went wrong!',
              message: "User inactive"
            })
            logout()
          }
        })
      } else {
        throw await response.json()
      }
    }).catch((error) => {
      showNotification({
        variant: 'outline',
        color: 'red',
        title: 'Something went wrong!',
        message: error.msg
      })
      Navigate(`/`)
    })
    GetLobbyUpdates(GameCode)
  }, [])

  useEffect(() => {
    getUserStatus();
  }, [])

  return <DisplayData></DisplayData>
}

function DisplayData() {
  let params = useParams()
  let GameCode = params.gameId;
  const Navigate = useNavigate();
  const [data, setData] = useState([]);




  const leaveGame = async () => {
    const authId = await getIdTokenOfUser();
    const data = {
      gameId: GameCode
    }
    fetch(import.meta.env.VITE_API + "/game/quitFromLobby", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authId}`,
      },
      body: JSON.stringify(data)
    }).then(async (response) => {
      if (response.ok) Navigate(`/`)
      else {
        throw await response.json()
      }
    }).catch((error) => {
      showNotification({
        variant: 'outline',
        color: 'red',
        title: 'Something went wrong!',
        message: error.msg
      })
    })

  };


  LobbyListener((status, data) => {
    if (status === "WAITING") {
      setData(data)
    } else if (status === "GAME_STARTED") {
      Navigate(`/game/${GameCode}`)
    }
  })

  if (!data.players) {
    return (
      <Center>
        <Loader variant="bars" />
      </Center>
    )
  }

  return (
    <>
      <Center p={"10px"} style={{ height: '100vh' }}>
        <Stack justify={'center'} style={{ border: '2px solid #2b2b2b', padding: '20px', boxShadow: '5px 5px #171717' }}>
          <Menu shadow="md" width={200} p={3} position="top">
            <Menu.Target>
              <Button variant="default">Game Settings</Button>
            </Menu.Target>

            <Menu.Dropdown >
              <Menu.Label><IconSortAscending2 size={14} /> Max score: {data.maxScore}</Menu.Label>
              <Menu.Label><IconLayersLinked size={14} /> End with pair: {data.endWithPair}</Menu.Label>
              <Menu.Label><IconX size={14} /> Wrong call: {data.wrongCall}</Menu.Label>
              <Menu.Label><IconBrandGoogleOne size={14} /> First round declare: {data.canDeclareFirstRound ? <IconCheck size={10} /> : <IconX size={10} />}</Menu.Label>
              <Menu.Label><IconClockHour4 size={14} /> Autoplay timer: {data.autoplayTimer}</Menu.Label>
              <Menu.Label><IconWorld size={14} /> Public game: {data.isPublicGame ? "Yes" : "No"}</Menu.Label>
            </Menu.Dropdown>
          </Menu>
          <Title order={1}>
            <Grid>
              <Grid.Col span={10}>
                <Group>
                  <Text>Code:</Text>
                  <Text color={'blue'}>{GameCode}</Text>
                </Group>
              </Grid.Col>
              <Grid.Col span={2}>
                <CopyGameCode GameCode={GameCode} />
              </Grid.Col>
            </Grid>
          </Title>
          <Title order={4}>
            <Grid>
              <Grid.Col span={10}>
                <Text color={'blue'} size="sm">
                  {window.location.origin + "?gamecode=" + GameCode}
                </Text>
              </Grid.Col>
              <Grid.Col span={2}>
                <CopyGameCode GameCode={window.location.origin + "?gamecode=" + GameCode} />
              </Grid.Col>
            </Grid>
          </Title>
          <Title order={5} color="grey">Share this with your friends for them to join.</Title>
          <Title order={3}>Friends who have joined</Title>
          {data.players ? <ListPlayers data={data}></ListPlayers> : ""}

          <Button color={'red'} onClick={leaveGame}>Leave</Button>
          {data.isAdmin && data.players && data.players.length > 1 ? <Button onClick={() => StartGame(GameCode)}>Start Game</Button> : ""}
        </Stack>
      </Center>
    </>
  )
}

export default WaitingScreen;


function CopyGameCode({ GameCode }) {
  return (
    <CopyButton value={GameCode} timeout={2000}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
          <ActionIcon style={{ border: '1px solid grey' }} size={"3rem"} color={copied ? 'blue' : 'gray'} onClick={copy}>
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  )
}

function ListPlayers({ data }) {
  const players = data.players.map(obj => {
    if (obj.isAdmin) {
      return <Text key={obj.id}><b>{obj.userName}</b></Text>
    }
    return <Text key={obj.id}>{obj.userName}</Text>
  })
  return players
}