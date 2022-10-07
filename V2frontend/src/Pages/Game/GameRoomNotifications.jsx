import { useState } from 'react';
import { Alert, Button, Grid, Text, Center, ActionIcon, Loader, Space, Title, Modal, Group, Menu } from "@mantine/core";
import { useParams } from "react-router-dom";
import { LeaveGame, NextRound, RestartGame, Reactions } from '../../Providers/Socket/emitters';
import { IconPlayCard, IconLogout, IconMoodSmile } from '@tabler/icons';

function GameRoomNotifications({ commonData }) {
  let params = useParams()
  let GameCode = params.gameId;
  const [leaveGameModalOpened, setLeaveGameModalOpened] = useState(false);
  const emoji = ['🔥', '🤣', '😈', '😢', '🖕'];

  let userActionTitle = ""
  let userActionColor = ""
  if (commonData.playerDeclaredType == "LOWEST") {
    userActionTitle = commonData.lastPlayedUser
    userActionColor = "teal.1"
  } else if (commonData.playerDeclaredType == "PAIR") {
    userActionTitle = `${commonData.lastPlayedUser}had WICKED WANGO cards"`
    userActionColor = "lime.1"
  } else if (commonData.playerDeclaredType == "SAME") {
    userActionTitle = `GG! ${commonData.lastPlayedUser}`
    userActionColor = "yellow.1"
  } else if (commonData.playerDeclaredType == "NOT_LOWEST") {
    userActionTitle = `${commonData.lastPlayedUser} just got BAMBOOZELED`
    userActionColor = "red.1"
  } else {
    userActionTitle = commonData.lastPlayedUser
    userActionColor = "blue.1"
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
      </Grid.Col>
      <Grid.Col span={10}>
        <Alert color={userActionColor} icon={<IconPlayCard size={'2rem'} />} title={userActionTitle} radius="md">
          {commonData.lastPlayedAction}
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