import { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Grid, Text, Center, ActionIcon, Loader, Space, Title, Modal, Group, Menu } from "@mantine/core";
import { useParams } from "react-router-dom";
import { LeaveGame, NextRound, RestartGame, Reactions } from '../../Providers/Socket/emitters';
import { IconPlayCard, IconLogout, IconMoodSmile, IconSettings, IconClockHour4, IconBrandGoogleOne, IconWorld, IconSortAscending2, IconLayersLinked, IconX, IconCheck } from '@tabler/icons';
import { getIdTokenOfUser, logout } from '../../Providers/Firebase/config';

function GameRoomNotifications({ commonData }) {
  let params = useParams()
  let GameCode = params.gameId;
  const [leaveGameModalOpened, setLeaveGameModalOpened] = useState(false);
  const [gameSettings, setGameSettings] = useState({});
  const emoji = ['🔥', '🤣', '😈', '😢', '🖕'];

  const getGameSettings = useCallback(
    async () => {
      const authId = await getIdTokenOfUser();
      fetch(import.meta.env.VITE_API + "/game/settings/" + GameCode, {
        headers: {
          Authorization: `Bearer ${authId}`,
        },
      }).then(async (response) => {
        if (response.ok) {
          response.json().then(json => {
            console.log(json)
            setGameSettings(json);
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
      })
    },
    [],
  );



  useEffect(() => {
    getGameSettings()
  }, [])

  let userActionTitle = ""
  let userActionDescription = ""
  let userActionColor = ""
  if (commonData.playerDeclaredType == "LOWEST") {
    if (commonData.isGameComplete) {
      userActionTitle = commonData.lastPlayedAction
      userActionDescription = ""
    } else {
      userActionTitle = commonData.lastPlayedUser
      userActionDescription = commonData.lastPlayedAction
    }
    userActionColor = "teal.1"
  } else if (commonData.playerDeclaredType == "PAIR") {
    userActionTitle = `${commonData.lastPlayedUser} had WICKED WANGO cards`
    userActionDescription = commonData.lastPlayedAction
    userActionColor = "lime.1"
  } else if (commonData.playerDeclaredType == "SAME") {
    userActionTitle = `GG! ${commonData.lastPlayedUser}`
    userActionDescription = commonData.lastPlayedAction
    userActionColor = "yellow.1"
  } else if (commonData.playerDeclaredType == "NOT_LOWEST") {
    userActionTitle = `${commonData.lastPlayedUser} just got BAMBOOZELED`
    userActionDescription = commonData.lastPlayedAction
    userActionColor = "red.1"
  } else {
    userActionTitle = commonData.lastPlayedUser
    userActionDescription = commonData.lastPlayedAction
    userActionColor = "blue.1"
  }
  if (commonData.isGameComplete) {
    userActionColor = "orange.0"
  }

  return (
    <Grid>
      <Grid.Col span={1} align="center" justify-items="center">
        <Menu>
          <Menu.Target>
            <ActionIcon style={{ padding: '4px' }} color={'yellow.7'} variant='filled' size={'lg'}>
              <IconMoodSmile size={34}></IconMoodSmile></ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {emoji.map((element) => <Menu.Item component='a' onClick={() => Reactions(GameCode, element)}>{element}</Menu.Item>)}

          </Menu.Dropdown>
        </Menu>

        <Menu>
          <Menu.Target>
            <ActionIcon style={{ padding: '4px' }} color={'gray.7'} variant='filled' size={'lg'}>
              <IconSettings size={34}></IconSettings></ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label><IconSortAscending2 size={10} /> Max score: {gameSettings.maxScore}</Menu.Label>
            <Menu.Label><IconLayersLinked size={10} /> End with pair: {gameSettings.endWithPair}</Menu.Label>
            <Menu.Label><IconX size={10} /> Wrong call: {gameSettings.wrongCall}</Menu.Label>
            <Menu.Label><IconClockHour4 size={10} /> Autoplay timer: {gameSettings.autoplayTimer}</Menu.Label>
            <Menu.Label><IconWorld size={10} /> Public game: {gameSettings.isPublicGame ? "Yes" : "No"}</Menu.Label>
            <Menu.Label><IconBrandGoogleOne size={10} /> First round declare: {gameSettings.canDeclareFirstRound ? <IconCheck size={10} /> : <IconX size={10} />}</Menu.Label>
          </Menu.Dropdown>
        </Menu>

      </Grid.Col>
      <Grid.Col span={10}>
        <Alert color={userActionColor} icon={<IconPlayCard size={'2rem'} />} title={userActionTitle} radius="md">
          {userActionDescription}
        </Alert>
      </Grid.Col>
      <Grid.Col span={1}>
        <Center>
          <ActionIcon onClick={() => setLeaveGameModalOpened(true)} style={{ padding: '4px' }} color={'red.7'} variant='filled' size={'lg'}><IconLogout size={34}></IconLogout></ActionIcon>
          <LeaveGameModal leaveGameModalOpened={leaveGameModalOpened} setLeaveGameModalOpened={setLeaveGameModalOpened} />
        </Center>
        {/* <MenuActions LeaveGame={LeaveGame} GameCode={GameCode}></MenuActions> */}
      </Grid.Col>
    </Grid>
  )
}

export default GameRoomNotifications;


// SubComponents for GameRoomNotifications


function LeaveGameModal({ leaveGameModalOpened, setLeaveGameModalOpened }) {
  let params = useParams()
  let GameCode = params.gameId;

  return (
    <Modal
      opened={leaveGameModalOpened}
      onClose={() => setLeaveGameModalOpened(false)}
    >
      <Center><Title order={2}>Are you sure you want to quit the game?</Title></Center>
      <Space h="xl" />
      <Group position="apart" p={6}>
        <Button onClick={() => setLeaveGameModalOpened(false)} color={'gray.7'}>Cancel</Button>
        <Button onClick={() => LeaveGame(GameCode)} color={'red.7'}>Leave</Button>
      </Group>
    </Modal>
  )
}